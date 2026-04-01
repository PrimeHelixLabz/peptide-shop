import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getLinkMoneyConfig } from "@/lib/link-money/config"
import {
  getProductById,
  getVariantById,
  createLinkMoneyOrderAsAdmin,
} from "@/lib/db/supabase"
import type { OrderItem } from "@/lib/db/schema"
import { SHIPPING_RATE, SERVICE_FEE_RATE } from "@/lib/order-constants"
import type { LinkMoneySessionResponse } from "@/lib/link-money/types"

const sessionRequestSchema = z.object({
  cartItems: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
      variantId: z.string().uuid().optional(),
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

export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const body = await req.json()
      const { cartItems, shippingAddress, billingAddress, notes, shippingMethod } =
        sessionRequestSchema.parse(body)

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

        let variant = null as any
        let displayPrice = product.price
        let displayImage = product.images?.[0] || product.image
        let displayName = product.name
        let inStock = product.inStock
        let stockQuantity = product.stockQuantity

        if (cartItem.variantId) {
          variant = await getVariantById(cartItem.variantId)
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
          displayPrice = variant.price
          displayName = `${product.name} (${variant.sku})`
          inStock = variant.inStock
          stockQuantity = variant.stock
        }

        if (!inStock || stockQuantity < cartItem.quantity) {
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
          variantId: variant?.id,
          variantName: variant?.sku,
          specifications: product.specifications,
        })
      }

      const shipping = shippingMethod === "local-pickup" ? 0 : SHIPPING_RATE
      const serviceFee = subtotal * SERVICE_FEE_RATE
      const total = subtotal + shipping + serviceFee

      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`

      // ── Call Link Money /v2/sessions ──
      const config = getLinkMoneyConfig()

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
        return NextResponse.json(
          { error: "Invalid Link Money session response" },
          { status: 502 }
        )
      }

      // ── Create order in pending state so callback/webhook can find it ──
      const orderId = crypto.randomUUID()
      await createLinkMoneyOrderAsAdmin({
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
        providerPaymentId: lmData.paymentId ?? lmData.payment_id ?? null,
        providerMetadata: {
          sessionKey: result.sessionKey,
          sessionUrl: result.sessionUrl,
        },
      })

      console.log(
        "Link Money session created for order",
        orderNumber,
        "— orderId:",
        orderId
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
