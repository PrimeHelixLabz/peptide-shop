"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth/auth-context"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Lock } from "lucide-react"
import { OrderSummary } from "@/components/order-summary"

const checkoutSchema = z.object({
  // Shipping Address
  shippingFirstName: z.string().min(1, "First name is required"),
  shippingLastName: z.string().min(1, "Last name is required"),
  shippingEmail: z.string().email("Invalid email address"),
  shippingPhone: z.string().min(1, "Phone number is required"),
  shippingStreet: z.string().min(1, "Street address is required"),
  shippingCity: z.string().min(1, "City is required"),
  shippingState: z.string().min(1, "State is required"),
  shippingZipCode: z.string().min(1, "ZIP code is required"),
  shippingCountry: z.string().min(1, "Country is required"),
  
  // Billing Address
  billingSameAsShipping: z.boolean().default(true),
  billingStreet: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZipCode: z.string().optional(),
  billingCountry: z.string().optional(),
  
  // Order notes
  notes: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export function CheckoutForm() {
  const router = useRouter()
  const { items, subtotal, totalItems } = useCart()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: "US",
    },
  })

  const billingSameAsShipping = watch("billingSameAsShipping")

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) {
      setError("You must be signed in to complete your purchase.")
      router.push(`/signin?redirect=/checkout`)
      return
    }

    if (items.length === 0) {
      setError("Your cart is empty")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Prepare order + checkout data
      const checkoutData = {
        cartItems: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        shippingAddress: {
          street: data.shippingStreet,
          city: data.shippingCity,
          state: data.shippingState,
          zipCode: data.shippingZipCode,
          country: data.shippingCountry,
          email: data.shippingEmail,
          phone: data.shippingPhone,
          firstName: data.shippingFirstName,
          lastName: data.shippingLastName,
        },
        billingAddress: billingSameAsShipping
          ? undefined
          : {
              street: data.billingStreet!,
              city: data.billingCity!,
              state: data.billingState!,
              zipCode: data.billingZipCode!,
              country: data.billingCountry!,
            },
        notes: data.notes,
      }

      // Create Stripe Checkout session (and order on the server)
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order")
      }

      // Redirect to Stripe Checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      throw new Error("Missing Stripe checkout URL")
    } catch (err) {
      console.error("Checkout error:", err)
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.")
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] space-y-4">
        <p className="text-lg font-semibold">Sign in required to purchase</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          For compliance and safety, all peptide purchases require an account. Please sign in or create an account before completing checkout.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <Button
            onClick={() => router.push(`/signin?redirect=/checkout`)}
            className="flex-1 sm:flex-none"
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/signup?redirect=/checkout`)}
            className="flex-1 sm:flex-none"
          >
            Create Account
          </Button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button
          onClick={() => router.push("/shop")}
          className="mt-4"
          variant="outline"
        >
          Continue Shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
      {/* Checkout Form */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] lg:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Shipping Address */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Shipping Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shippingFirstName">First Name *</Label>
                <Input
                  id="shippingFirstName"
                  {...register("shippingFirstName")}
                  error={errors.shippingFirstName?.message}
                />
              </div>
              <div>
                <Label htmlFor="shippingLastName">Last Name *</Label>
                <Input
                  id="shippingLastName"
                  {...register("shippingLastName")}
                  error={errors.shippingLastName?.message}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="shippingEmail">Email *</Label>
              <Input
                id="shippingEmail"
                type="email"
                {...register("shippingEmail")}
                error={errors.shippingEmail?.message}
              />
            </div>
            <div>
              <Label htmlFor="shippingPhone">Phone *</Label>
              <Input
                id="shippingPhone"
                type="tel"
                {...register("shippingPhone")}
                error={errors.shippingPhone?.message}
              />
            </div>
            <div>
              <Label htmlFor="shippingStreet">Street Address *</Label>
              <Input
                id="shippingStreet"
                {...register("shippingStreet")}
                error={errors.shippingStreet?.message}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shippingCity">City *</Label>
                <Input
                  id="shippingCity"
                  {...register("shippingCity")}
                  error={errors.shippingCity?.message}
                />
              </div>
              <div>
                <Label htmlFor="shippingState">State *</Label>
                <Input
                  id="shippingState"
                  {...register("shippingState")}
                  error={errors.shippingState?.message}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="shippingZipCode">ZIP Code *</Label>
                <Input
                  id="shippingZipCode"
                  {...register("shippingZipCode")}
                  error={errors.shippingZipCode?.message}
                />
              </div>
              <div>
                <Label htmlFor="shippingCountry">Country *</Label>
                <Input
                  id="shippingCountry"
                  {...register("shippingCountry")}
                  error={errors.shippingCountry?.message}
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billingSameAsShipping"
                {...register("billingSameAsShipping")}
              />
              <Label
                htmlFor="billingSameAsShipping"
                className="text-sm font-normal cursor-pointer"
              >
                Billing address same as shipping
              </Label>
            </div>

            {!billingSameAsShipping && (
              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold">Billing Address</h2>
                <div>
                  <Label htmlFor="billingStreet">Street Address *</Label>
                  <Input
                    id="billingStreet"
                    {...register("billingStreet", {
                      required: !billingSameAsShipping,
                    })}
                    error={errors.billingStreet?.message}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="billingCity">City *</Label>
                    <Input
                      id="billingCity"
                      {...register("billingCity", {
                        required: !billingSameAsShipping,
                      })}
                      error={errors.billingCity?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingState">State *</Label>
                    <Input
                      id="billingState"
                      {...register("billingState", {
                        required: !billingSameAsShipping,
                      })}
                      error={errors.billingState?.message}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="billingZipCode">ZIP Code *</Label>
                    <Input
                      id="billingZipCode"
                      {...register("billingZipCode", {
                        required: !billingSameAsShipping,
                      })}
                      error={errors.billingZipCode?.message}
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingCountry">Country *</Label>
                    <Input
                      id="billingCountry"
                      {...register("billingCountry", {
                        required: !billingSameAsShipping,
                      })}
                      error={errors.billingCountry?.message}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Payment</h2>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be securely redirected to our payment partner Stripe to complete your purchase.
            </p>
          </div>

          {/* Order Notes */}
          <div>
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <textarea
              id="notes"
              {...register("notes")}
              className="w-full min-h-[100px] rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Special instructions or notes..."
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Place Order
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Order Summary */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <OrderSummary />
      </div>
    </div>
  )
}
