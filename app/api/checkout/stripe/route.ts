import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuthMiddleware, type AuthenticatedRequest } from "@/lib/auth/middleware"
import { getProductById, getVariantById, createOrder } from "@/lib/db/supabase"
import type { Order, OrderItem } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"

const createStripeCheckoutSchema = z.object({
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
}).passthrough()

export const POST = requireAuthMiddleware(
  async (req: AuthenticatedRequest) => {
    try {
      const userId = req.user!.id
      const body = await req.json()
      const { cartItems, shippingAddress, billingAddress, notes } =
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

        let variant = null as any
        let displayPrice = product.price
        let displayImage = product.images?.[0] || product.image
        let displayName = product.name
        let inStock = product.inStock
        let stockQuantity = product.stockQuantity
        let stripePriceId: string | undefined

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
          stripePriceId = variant.stripePriceId
        }

        if (!inStock || stockQuantity < cartItem.quantity) {
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
          variantId: variant?.id,
          variantName: variant?.sku,
          specifications: product.specifications,
        })

        stripeItems.push({
          quantity: cartItem.quantity,
          stripePriceId,
          name: displayName,
          unitAmount: Math.round(displayPrice * 100),
        })
      }

      const shipping = 0
      // For now, tax is handled outside of Stripe (set to 0 for consistency with charged amount).
      const tax = 0
      const total = subtotal + shipping + tax

      const orderNumber = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`

      const paymentMethod = "stripe"
      const paymentStatus: Order["paymentStatus"] = "pending"

      const order: Omit<Order, "createdAt" | "updatedAt"> = {
        id: crypto.randomUUID(),
        userId,
        email: shippingAddress.email,
        orderNumber,
        status: "pending",
        items: orderItems,
        subtotal,
        shipping,
        tax,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod,
        paymentStatus,
        notes,
      }

      const createdOrder = await createOrder(order)

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

      const origin = new URL(req.url).origin

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        customer_email: shippingAddress.email,
        success_url: `${origin}/orders/${createdOrder.orderNumber}?email=${encodeURIComponent(
          shippingAddress.email
        )}`,
        cancel_url: `${origin}/checkout?canceled=1`,
        metadata: {
          orderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          userId,
        },
      })

      return NextResponse.json(
        {
          checkoutUrl: session.url,
          orderNumber: createdOrder.orderNumber,
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

