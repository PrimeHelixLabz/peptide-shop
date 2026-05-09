import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProductById, getVariantById, createPendingCheckoutAsAdmin } from "@/lib/db/supabase"
import type { OrderItem } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"
import { SERVICE_FEE_RATE, SHIPPING_CARRIER_LABEL, getShippingCost } from "@/lib/order-constants"

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
}).passthrough()

export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const body = await req.json()
      const { cartItems, shippingAddress, billingAddress, notes, shippingMethod } =
        createStripeCheckoutSchema.parse(body)

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

      // Compute shipping and service fee to match frontend OrderSummary.
      // Shipping is free once subtotal crosses FREE_SHIPPING_THRESHOLD; helper
      // is the source of truth so server total can't be tricked by client.
      const shipping = getShippingCost(subtotal, shippingMethod)
      const serviceFee = subtotal * SERVICE_FEE_RATE
      const total = subtotal + shipping + serviceFee

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
              name: `Service Fee (${(SERVICE_FEE_RATE * 100).toFixed(0)}%)`,
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
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: shippingAddress.email,
        success_url: `${origin}/orders/${orderNumber}?email=${encodeURIComponent(
          shippingAddress.email
        )}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        metadata: {
          pendingCheckoutId,
          orderNumber,
          userId,
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

