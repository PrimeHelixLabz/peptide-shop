import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProductById, getVariantById, createPendingCheckoutAsAdmin } from "@/lib/db/supabase"
import type { OrderItem } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"
import { getServiceFeeRate, SHIPPING_CARRIER_LABEL, getShippingCost } from "@/lib/order-constants"
import { resolveOrderAffiliateCode } from "@/lib/affiliates"
import { assertAgeVerified } from "@/lib/age-verification"
import {
  applyDiscountForCheckout,
  releaseDiscountReservation,
} from "@/lib/discounts/checkout"

const createStripeCheckoutSchema = z.object({
  cartItems: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
      variantId: z.string().uuid(),
    })
  ),
  shippingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),
  billingAddress: z
    .object({
      street: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zipCode: z.string().min(1),
      country: z.string().min(1),
    })
    .optional(),
  notes: z.string().optional(),
  shippingMethod: z.enum(["ship", "local-pickup"]).default("ship"),
  affiliateCode: z.string().trim().max(32).optional(),
  discountCode: z.string().trim().max(40).optional(),
}).passthrough()

export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    // Track the discount reservation so we can release it if anything
    // after the reserveRedemption() call fails (Stripe session create,
    // pending-checkout insert, etc.). Also track the one-shot Stripe
    // coupon id so we can delete it on cleanup — Stripe accumulates
    // orphan coupons otherwise.
    let reservedDiscountCodeId: string | null = null
    let createdStripeCouponId: string | null = null
    try {
      const userId = req.user!.id

      const ageCheck = await assertAgeVerified(req, userId)
      if (!ageCheck.ok) {
        return NextResponse.json(
          { error: ageCheck.reason, requiresAgeVerification: true },
          { status: 403 }
        )
      }

      const body = await req.json()
      const {
        cartItems,
        shippingAddress,
        billingAddress,
        notes,
        shippingMethod,
        affiliateCode: enteredAffiliateCode,
        discountCode: enteredDiscountCode,
      } = createStripeCheckoutSchema.parse(body)

      if (cartItems.length === 0) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
      }

      // Build order items and calculate totals
      const orderItems: OrderItem[] = []
      const stripeItems: {
        quantity: number
        stripePriceId?: string
        name: string
        unitAmount: number
      }[] = []
      let subtotal = 0

      for (const cartItem of cartItems) {
        const product = await getProductById(cartItem.productId)
        if (!product) {
          return NextResponse.json(
            { error: `Product ${cartItem.productId} not found` },
            { status: 400 }
          )
        }

        const variant = await getVariantById(cartItem.variantId)
        if (!variant) {
          return NextResponse.json(
            { error: `Variant ${cartItem.variantId} not found` },
            { status: 400 }
          )
        }
        if (variant.productId !== product.id) {
          return NextResponse.json(
            { error: `Variant does not belong to product ${product.name}` },
            { status: 400 }
          )
        }

        const displayPrice = variant.price
        const displayName = `${product.name} (${variant.sku})`
        const displayImage = product.images?.[0] || product.image
        const stripePriceId = variant.stripePriceId

        if (!variant.inStock || variant.stock < cartItem.quantity) {
          return NextResponse.json(
            { error: `${displayName} is out of stock` },
            { status: 400 }
          )
        }

        const itemTotal = displayPrice * cartItem.quantity
        subtotal += itemTotal

        orderItems.push({
          productId: product.id,
          productName: displayName,
          productImage: displayImage,
          price: displayPrice,
          quantity: cartItem.quantity,
          variantId: variant.id,
          variantName: variant.sku,
          specifications: product.specifications,
        })

        stripeItems.push({
          quantity: cartItem.quantity,
          stripePriceId,
          name: displayName,
          unitAmount: Math.round(displayPrice * 100),
        })
      }

      // ── Apply discount code (validates + atomically reserves a slot). ──
      // Reservation is released in the catch block on any later failure;
      // confirmed in the webhook on checkout.session.completed.
      const discountResult = await applyDiscountForCheckout({
        inputCode: enteredDiscountCode,
        subtotal,
        userId,
        email: shippingAddress.email,
      })
      if (!discountResult.ok) {
        return NextResponse.json({ error: discountResult.error }, { status: 400 })
      }
      const discount = discountResult.discount
      reservedDiscountCodeId = discount?.codeId ?? null
      const discountedSubtotal = Math.max(0, subtotal - (discount?.amount ?? 0))

      // Shipping is gated on the RAW subtotal so applying a discount can't
      // rewind a free-shipping perk the customer already earned at $250+.
      // Service fee uses the discounted base since it scales with the actual
      // amount we're charging.
      const shipping = getShippingCost(subtotal, shippingMethod)
      const stripeServiceFeeRate = getServiceFeeRate("stripe")
      const serviceFee = discountedSubtotal * stripeServiceFeeRate
      const total = discountedSubtotal + shipping + serviceFee

      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`

      // Build Stripe Checkout line items.
      // Prefer stored Stripe price IDs when available; otherwise fall back to inline price_data.
      const lineItems = stripeItems.map((item) => {
        if (item.stripePriceId) {
          return {
            price: item.stripePriceId,
            quantity: item.quantity,
          }
        }

        return {
          quantity: item.quantity,
          price_data: {
            currency: "usd",
            unit_amount: item.unitAmount,
            product_data: {
              name: item.name,
            },
          },
        }
      })

      // Add shipping as a separate line item so Stripe total matches our order summary.
      if (shipping > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(shipping * 100),
            product_data: {
              name: `Shipping (${SHIPPING_CARRIER_LABEL})`,
            },
          },
        })
      }
      // No shipping line item for local pickup or free-shipping orders (shipping = $0)

      // Add service fee as a separate line item.
      if (serviceFee > 0) {
        lineItems.push({
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(serviceFee * 100),
            product_data: {
              name: `Service Fee (${(stripeServiceFeeRate * 100).toFixed(0)}%)`,
            },
          },
        })
      }

      const origin = new URL(req.url).origin

      // Store checkout data temporarily. The actual order will only be created
      // in the Stripe webhook after payment succeeds.
      const pendingCheckoutId = crypto.randomUUID()

      const checkoutDataForStorage = {
        orderNumber,
        userId,
        email: shippingAddress.email,
        items: orderItems,
        subtotal,
        shipping,
        serviceFee,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        notes,
        affiliateCode: await resolveOrderAffiliateCode(req, enteredAffiliateCode),
        // Carry the discount through to the webhook so the eventual order
        // row gets the right columns + we can confirm the redemption.
        discountCodeId: discount?.codeId ?? null,
        discountCode: discount?.code ?? null,
        discountAmount: discount?.amount ?? 0,
      }

      // Mint a one-shot Stripe coupon for the discount so the Stripe-hosted
      // checkout displays "DISCOUNT_CODE -$X" as its own line. Without this,
      // the line_items would sum to the pre-discount total and Stripe would
      // overcharge. We don't reuse this Stripe coupon — it's local to this
      // session and our DB is the source of truth for redemption tracking.
      let stripeDiscounts: { coupon: string }[] | undefined
      if (discount && discount.amount > 0) {
        const stripeCoupon = await stripe.coupons.create({
          amount_off: Math.round(discount.amount * 100),
          currency: "usd",
          duration: "once",
          name: `Discount: ${discount.code}`,
          // Single-use guard at Stripe's side too. The session is the only
          // place this coupon can be redeemed, so we never want it to apply
          // to anything else even if it somehow leaks.
          max_redemptions: 1,
          metadata: {
            discountCodeId: discount.codeId,
            discountCode: discount.code,
            orderNumber,
          },
        })
        createdStripeCouponId = stripeCoupon.id
        stripeDiscounts = [{ coupon: stripeCoupon.id }]
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        ...(stripeDiscounts ? { discounts: stripeDiscounts } : {}),
        customer_email: shippingAddress.email,
        success_url: `${origin}/orders/${orderNumber}?email=${encodeURIComponent(
          shippingAddress.email
        )}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        metadata: {
          pendingCheckoutId,
          orderNumber,
          userId,
          ...(discount ? { discountCodeId: discount.codeId } : {}),
        },
      })

      // Save pending checkout with the Stripe session ID for cross-referencing
      await createPendingCheckoutAsAdmin({
        id: pendingCheckoutId,
        userId,
        stripeSessionId: session.id,
        checkoutData: checkoutDataForStorage,
      })

      return NextResponse.json(
        {
          checkoutUrl: session.url,
          orderNumber,
        },
        { status: 201 }
      )
    } catch (error) {
      // Whatever went wrong, give the discount slot back so other customers
      // can use it, and delete the orphan Stripe coupon so it doesn't sit
      // around in our Stripe account forever.
      await releaseDiscountReservation(reservedDiscountCodeId)
      if (createdStripeCouponId) {
        try {
          await stripe.coupons.del(createdStripeCouponId)
        } catch (delErr) {
          console.error("Failed to delete orphan Stripe coupon:", delErr)
        }
      }

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }

      console.error("Stripe checkout error:", error)
      return NextResponse.json(
        { error: "Failed to initiate checkout" },
        { status: 500 }
      )
    }
  }
)

