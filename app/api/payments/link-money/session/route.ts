import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getLinkMoneyConfig } from "@/lib/link-money/config"
import {
  getProductById,
  getVariantById,
  createLinkMoneyOrderAsAdmin,
  updateOrderAsAdmin,
} from "@/lib/db/supabase"
import type { OrderItem } from "@/lib/db/schema"
import { getServiceFeeRate, getShippingCost } from "@/lib/order-constants"
import type { LinkMoneySessionResponse } from "@/lib/link-money/types"
import {
  createPayment,
  setSessionKey,
} from "@/lib/link-money/payment-service"
import { sendCustomerOrderPlacedEmail } from "@/lib/email"
import { assertAgeVerified } from "@/lib/age-verification"
import { resolveOrderAffiliateCode } from "@/lib/affiliates"
import {
  applyDiscountForCheckout,
  releaseDiscountReservation,
} from "@/lib/discounts/checkout"

const sessionRequestSchema = z.object({
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
})

export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
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
      } = sessionRequestSchema.parse(body)

      if (cartItems.length === 0) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
      }

      // ── Build order items and compute totals (mirrors Stripe checkout) ──
      const orderItems: OrderItem[] = []
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

        if (!variant.inStock || variant.stock < cartItem.quantity) {
          return NextResponse.json(
            { error: `${displayName} is out of stock` },
            { status: 400 }
          )
        }

        subtotal += displayPrice * cartItem.quantity

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
      }

      // ── Apply discount code (validates + atomically reserves). ──
      const discountResult = await applyDiscountForCheckout({
        inputCode: enteredDiscountCode,
        subtotal,
        userId,
        // Account email for the email-lock check (the email the admin
        // locked the code to); falls back to the entered shipping email.
        email: req.user!.email ?? shippingAddress.email,
      })
      if (!discountResult.ok) {
        return NextResponse.json({ error: discountResult.error }, { status: 400 })
      }
      const discount = discountResult.discount
      const discountedSubtotal = Math.max(0, subtotal - (discount?.amount ?? 0))

      // Shipping is gated on the RAW subtotal so applying a discount can't
      // rewind a free-shipping perk the customer already earned at $250+.
      const shipping = getShippingCost(subtotal, shippingMethod)
      const serviceFee = discountedSubtotal * getServiceFeeRate("link_money")
      const total = discountedSubtotal + shipping + serviceFee

      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`

      // ── Create order row first so the payments FK (order_id) resolves. ──
      const orderId = crypto.randomUUID()
      let createdOrder
      try {
        createdOrder = await createLinkMoneyOrderAsAdmin({
          id: orderId,
          userId,
          email: shippingAddress.email,
          orderNumber,
          status: "pending",
          paymentStatus: "pending",
          items: orderItems,
          subtotal,
          shipping,
          serviceFee,
          total,
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          paymentMethod: "link_money",
          notes,
          affiliateCode: await resolveOrderAffiliateCode(req, enteredAffiliateCode),
          discountCodeId: discount?.codeId ?? null,
          discountCode: discount?.code ?? null,
          discountAmount: discount?.amount ?? 0,
        })
      } catch (insertError) {
        // Order insert failed AFTER we reserved the discount slot — give it back.
        await releaseDiscountReservation(discount?.codeId)
        throw insertError
      }

      // ── Create payment row BEFORE hitting Link Money. ──
      // orderNumber doubles as client_reference_id so the webhook can
      // find this row regardless of whether /v2/sessions returned.
      await createPayment({
        orderId,
        clientReferenceId: orderNumber,
        amount: parseFloat(total.toFixed(2)),
        currency: "USD",
      })

      // ── Call Link Money /v2/sessions ──
      const config = getLinkMoneyConfig()

      console.log(config.baseUrl)

      const lmResponse = await fetch(`${config.baseUrl}/v2/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${config.basicAuth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: shippingAddress.email,
          phoneNumber: shippingAddress.phone,
          product: "PAY",
          redirectUrl: config.redirectUrl,
          orderDetails: {
            totalAmount: {
              value: parseFloat(total.toFixed(2)),
              currency: "USD",
            },
          },
          paymentDetails: {
            amount: {
              value: parseFloat(total.toFixed(2)),
              currency: "USD",
            },
            requestKey: crypto.randomUUID(),
            clientReferenceId: orderNumber,
          },
          experienceId: "LINK_MANAGED_PAYMENT",
          customerProfile: {
            id: userId,
            guestCheckout: false,
          },
        }),
      })

      if (!lmResponse.ok) {
        const errorBody = await lmResponse.text()
        console.error("Link Money session creation failed:", {
          status: lmResponse.status,
          body: errorBody,
        })
        // Mark the order failed — the orders trigger releases the discount
        // reservation automatically on this transition. (Doing JS-side
        // release here would risk a double-decrement if the 3-day cleanup
        // job also touched the order later.)
        await updateOrderAsAdmin(orderId, {
          status: "cancelled",
          paymentStatus: "failed",
        })
        return NextResponse.json(
          { error: "Failed to create Link Money session" },
          { status: 502 }
        )
      }

      const lmData = await lmResponse.json()

      const result: LinkMoneySessionResponse = {
        sessionKey: lmData.sessionKey ?? lmData.session_key ?? "",
        sessionUrl: lmData.sessionUrl ?? lmData.session_url ?? "",
      }

      if (!result.sessionUrl) {
        console.error("Link Money returned no sessionUrl:", lmData)
        await updateOrderAsAdmin(orderId, {
          status: "cancelled",
          paymentStatus: "failed",
        })
        return NextResponse.json(
          { error: "Invalid Link Money session response" },
          { status: 502 }
        )
      }

      // Persist the returned session_key on the payment row.
      if (result.sessionKey) {
        await setSessionKey(orderNumber, result.sessionKey)
      }

      // ── Backfill provider metadata on the order now that we have it ──
      await updateOrderAsAdmin(orderId, {
        providerPaymentId: lmData.paymentId ?? lmData.payment_id ?? null,
        providerMetadata: {
          sessionKey: result.sessionKey,
          sessionUrl: result.sessionUrl,
        },
      })

      console.log(
        "Link Money session created for order",
        orderNumber,
        "- orderId:",
        orderId
      )

      // Notify the customer that we've received the order and payment is
      // processing. Payment can take a few business days to clear via
      // Link.money, and silence in that window triggers chargebacks.
      sendCustomerOrderPlacedEmail(createdOrder).catch((err) =>
        console.error("Failed to send customer order-placed email:", err)
      )

      return NextResponse.json(
        {
          sessionKey: result.sessionKey,
          sessionUrl: result.sessionUrl,
          environment: config.env,
          orderNumber,
        },
        { status: 201 }
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      console.error("Link Money session error:", error)
      return NextResponse.json(
        { error: "Failed to initiate Link Money session" },
        { status: 500 }
      )
    }
  }
)
