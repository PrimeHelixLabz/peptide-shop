"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Banknote, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_CARRIER_LABEL,
  getShippingCost,
} from "@/lib/order-constants"

interface Variant {
  id: string
  sku: string
  price: number
  stock: number
  inStock: boolean
}

interface Product {
  id: string
  name: string
  image: string
  images?: string[]
  category?: string
  variants?: Variant[]
}

interface LineItem {
  productId: string
  productName: string
  variantId: string
  variantSku: string
  unitPrice: number
  quantity: number
  availableStock: number
}

type ShippingMethod = "ship" | "local-pickup"

interface Shortfall {
  variantId: string
  productName: string
  variantName?: string
  requested: number
  available: number
}

const blankAddress = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
}

export function AdminNewOrderForm() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [items, setItems] = useState<LineItem[]>([])

  const [shipping, setShipping] = useState<ShippingMethod>("ship")
  const [address, setAddress] = useState(blankAddress)
  const [notes, setNotes] = useState("")

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products?limit=100")
        if (!res.ok) throw new Error("Failed to load products")
        const json = await res.json()
        setProducts(json.products || [])
      } catch (err) {
        console.error("Failed to load products", err)
        toast.error("Failed to load products")
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    )
  }, [products, search])

  function addLineItem(product: Product, variant: Variant) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === variant.id)
      if (existingIdx >= 0) {
        const next = [...prev]
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: Math.min(
            next[existingIdx].quantity + 1,
            variant.stock
          ),
        }
        return next
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantSku: variant.sku,
          unitPrice: variant.price,
          quantity: 1,
          availableStock: variant.stock,
        },
      ]
    })
  }

  function setItemQuantity(variantId: string, quantity: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.availableStock)) }
          : i
      )
    )
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId))
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const shippingCost = getShippingCost(subtotal, shipping)
  const total = subtotal + shippingCost
  const amountToFreeShipping =
    shipping === "ship" && subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD
      ? FREE_SHIPPING_THRESHOLD - subtotal
      : 0

  const formValid =
    items.length > 0 &&
    address.firstName &&
    address.lastName &&
    address.email &&
    address.phone &&
    address.street &&
    address.city &&
    address.state &&
    address.zipCode &&
    address.country

  async function handleSubmit() {
    if (!formValid || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingAddress: address,
          shippingMethod: shipping,
          notes: notes || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409 && Array.isArray(data?.shortfalls)) {
        const lines = (data.shortfalls as Shortfall[])
          .map(
            (s) =>
              `${s.productName}${s.variantName ? ` (${s.variantName})` : ""}: need ${s.requested}, only ${s.available} in stock`
          )
          .join("\n")
        toast.error("Cannot create order — insufficient stock", {
          description: lines,
        })
        return
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order")
      }

      toast.success("Cash order created. Stock has been deducted.")
      router.push(`/admin/orders/${data.order.orderNumber || data.order.id}`)
    } catch (err) {
      console.error("Create order error", err)
      toast.error("Failed to create order")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Banknote className="h-3.5 w-3.5" />
          Cash Order
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Create Cash Order
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually record an order paid in cash. Stock for each line item is
          deducted on submit. The action is blocked if any item is out of
          stock.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ====== Left column — line items + product picker ====== */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Selected items */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Line Items
              </h2>
            </div>

            {items.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No items yet. Pick products from the catalog below.
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {items.map((item) => (
                  <li
                    key={item.variantId}
                    className="flex items-center gap-4 px-6 py-4"
                  >
                    <div className="flex flex-1 flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {item.productName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.variantSku} &middot; ${item.unitPrice.toFixed(2)} ea
                        &middot; {item.availableStock} in stock
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={item.availableStock}
                      value={item.quantity}
                      onChange={(e) =>
                        setItemQuantity(
                          item.variantId,
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="h-10 w-20 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label={`Quantity for ${item.productName}`}
                    />
                    <span className="w-20 text-right text-sm font-semibold text-foreground tabular-nums">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Product picker */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Add Products
              </h2>
            </div>

            <div className="border-b border-border/50 px-6 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                No products match &ldquo;{search}&rdquo;.
              </div>
            ) : (
              <ul className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                {filteredProducts.map((product) => {
                  const variants = product.variants || []
                  return (
                    <li
                      key={product.id}
                      className="flex flex-col gap-2 px-6 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {product.name}
                        </span>
                        {product.category && (
                          <span className="text-xs text-muted-foreground">
                            {product.category}
                          </span>
                        )}
                      </div>
                      {variants.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          No variants configured.
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {variants.map((v) => {
                            const disabled = v.stock <= 0
                            return (
                              <button
                                key={v.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => addLineItem(product, v)}
                                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" />
                                {v.sku} &middot; ${v.price.toFixed(2)}
                                <span className="text-muted-foreground">
                                  ({v.stock})
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ====== Right column — customer + summary ====== */}
        <div className="flex flex-col gap-6">
          {/* Customer */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Customer & Shipping
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6">
              <FieldInput
                label="First name"
                value={address.firstName}
                onChange={(v) => setAddress({ ...address, firstName: v })}
              />
              <FieldInput
                label="Last name"
                value={address.lastName}
                onChange={(v) => setAddress({ ...address, lastName: v })}
              />
              <FieldInput
                label="Email"
                type="email"
                colSpan={2}
                value={address.email}
                onChange={(v) => setAddress({ ...address, email: v })}
              />
              <FieldInput
                label="Phone"
                colSpan={2}
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
              />
              <FieldInput
                label="Street"
                colSpan={2}
                value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })}
              />
              <FieldInput
                label="City"
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
              />
              <FieldInput
                label="State"
                value={address.state}
                onChange={(v) => setAddress({ ...address, state: v })}
              />
              <FieldInput
                label="ZIP"
                value={address.zipCode}
                onChange={(v) => setAddress({ ...address, zipCode: v })}
              />
              <FieldInput
                label="Country"
                value={address.country}
                onChange={(v) => setAddress({ ...address, country: v })}
              />

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shipping method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShipping("ship")}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition-all ${
                      shipping === "ship"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    <div className="font-medium">{SHIPPING_CARRIER_LABEL}</div>
                    <div className="text-xs">$15.00 (free over $250)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipping("local-pickup")}
                    className={`rounded-xl border-2 px-3 py-2 text-left text-sm transition-all ${
                      shipping === "local-pickup"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    <div className="font-medium">Local Pickup</div>
                    <div className="text-xs">Free</div>
                  </button>
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Internal notes for this cash order..."
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="border-b border-border/50 px-6 py-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Order Summary
              </h2>
            </div>
            <div className="flex flex-col gap-3 p-6">
              {amountToFreeShipping > 0 && (
                <div className="rounded-2xl bg-primary/5 px-3 py-2 text-xs text-foreground">
                  Add{" "}
                  <span className="font-semibold">
                    ${amountToFreeShipping.toFixed(2)}
                  </span>{" "}
                  more for free shipping.
                </div>
              )}
              <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
              <Row
                label={`Shipping (${
                  shipping === "local-pickup" ? "Local Pickup" : SHIPPING_CARRIER_LABEL
                })`}
                value={shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
              />
              <Row label="Service Fee" value="$0.00 (cash)" muted />
              <div className="h-px bg-border/50" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-base font-semibold text-foreground">
                  Total
                </span>
                <span className="text-xl font-bold text-foreground">
                  ${total.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formValid || submitting}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating order...
                  </>
                ) : (
                  <>
                    <Banknote className="h-4 w-4" />
                    Create Cash Order
                  </>
                )}
              </button>
              {!formValid && items.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Fill in all customer fields to enable submission.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  colSpan,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  colSpan?: 2
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan === 2 ? "col-span-2" : ""}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

function Row({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? "text-muted-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-sm font-medium ${muted ? "text-muted-foreground" : "text-foreground"} tabular-nums`}>
        {value}
      </span>
    </div>
  )
}
