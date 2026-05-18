import { NextResponse } from "next/server"
import { z } from "zod"
import {
  requireAuthMiddleware,
  type AuthenticatedRequest,
} from "@/lib/auth/middleware"
import {
  getProductById,
  getVariantById,
  createCentryOSOrderAsAdmin,
  deletePendingCentryOSOrderAsAdmin,
  updateOrderAsAdmin,
} from "@/lib/db/supabase"
import type { OrderItem } from "@/lib/db/schema"
import { getServiceFeeRate, getShippingCost } from "@/lib/order-constants"
import {
  createPayment,
  createPaymentLink,
} from "@/lib/centryos/payment-service"
import { sendCustomerOrderPlacedEmail } from "@/lib/email"
import { getAffiliateCodeFromRequest } from "@/lib/affiliates"
import { assertAgeVerified } from "@/lib/age-verification"

const createLinkSchema = z.object({
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
})

/**
 * POST /api/payments/centryos/create-link
 *
 * Mirrors /api/payments/link-money/session: validates the cart server-side,
 * inserts the order + payments rows, then calls CentryOS to mint a hosted
 * checkout link. The frontend redirects the user to the returned URL.
 */
export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    const userId = req.user!.id
    let createdOrderId: string | null = null

    const ageCheck = await assertAgeVerified(req, userId)
    if (!ageCheck.ok) {
      return NextResponse.json(
        { error: ageCheck.reason, requiresAgeVerification: true },
        { status: 403 }
      )
    }

    try {
      const body = await req.json()
      const {
        cartItems,
        shippingAddress,
        billingAddress,
        notes,
        shippingMethod,
      } = createLinkSchema.parse(body)

      if (cartItems.length === 0) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 })
      }

      // ── Build order items + compute totals (mirrors Stripe / Link Money) ──
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

      const shipping = getShippingCost(subtotal, shippingMethod)
      // CentryOS deducts its MDR from our receivable — no customer-side
      // service fee here. Rate resolves to 0 via SERVICE_FEE_RATE_BY_METHOD.
      const serviceFee = subtotal * getServiceFeeRate("centryos")
      const total = subtotal + shipping + serviceFee

      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`

      // ── Create order row first so payments.order_id resolves. ──
      const orderId = crypto.randomUUID()
      createdOrderId = orderId
      const createdOrder = await createCentryOSOrderAsAdmin({
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
        paymentMethod: "centryos",
        notes,
        affiliateCode: getAffiliateCodeFromRequest(req),
      })

      // ── Create payment row BEFORE calling CentryOS so the webhook can
      //    always find this order, even if create-link below fails. ──
      const amount = parseFloat(total.toFixed(2))
      await createPayment({
        orderId,
        clientReferenceId: orderNumber,
        amount,
        currency: "USD",
      })

      // ── Mint the hosted checkout link. ──
      const link = await createPaymentLink({
        orderId,
        clientReferenceId: orderNumber,
        amount,
        currency: "USD",
        productName: `Order #${orderNumber}`,
        customerUserId: userId,
        cartItems: orderItems.map((item) => ({
          productId: item.productId,
          name: item.productName,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
      })

      // ── Backfill provider metadata on the order. ──
      await updateOrderAsAdmin(orderId, {
        providerPaymentId: link.paymentLinkId ?? null,
        providerMetadata: {
          checkoutUrl: link.url,
          paymentLinkId: link.paymentLinkId,
          paymentLinkToken: link.paymentLinkToken,
          expiredAt: link.expiredAt,
        },
      })

      // Notify the customer that we've received the order and payment is
      // processing. CentryOS hosted-checkout can take a few business days to
      // settle, and silence in that window triggers chargebacks.
      sendCustomerOrderPlacedEmail(createdOrder).catch((err) =>
        console.error("Failed to send customer order-placed email:", err)
      )

      return NextResponse.json(
        {
          orderId,
          orderNumber,
          checkoutUrl: link.url,
          paymentLinkId: link.paymentLinkId,
          expiredAt: link.expiredAt,
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
      console.error("CentryOS create-link error:", error)

      // If we created an order but the link mint failed, drop the
      // empty pending order so the dashboard isn't polluted.
      if (createdOrderId) {
        await deletePendingCentryOSOrderAsAdmin(createdOrderId).catch(
          (cleanupErr) =>
            console.error(
              "CentryOS create-link: cleanup of pending order failed",
              cleanupErr
            )
        )
      }

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to create CentryOS payment link",
        },
        { status: 500 }
      )
    }
  }
)
