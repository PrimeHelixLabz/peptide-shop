import { NextRequest, NextResponse } from "next/server"
import {
  getProducts,
  getProductsCount,
  createProduct,
  createVariant,
  setDefaultVariant,
  deleteProduct,
  getProductById,
  type SortOption,
} from "@/lib/db/supabase"
import { requireAdminMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware"
import { z } from "zod"

const variantInputSchema = z.object({
  sku: z.string().min(1, "Variant SKU is required"),
  price: z.number().positive("Variant price must be a positive number"),
  stock: z
    .number()
    .int("Variant stock must be an integer")
    .min(0, "Variant stock cannot be negative"),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
})

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.number().positive("Price must be a positive number"),
  longDescription: z.string().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  coaUrl: z.string().url().nullable().optional(),
  image: z.string().refine(
    (val) => val === "" || z.string().url().safeParse(val).success,
    { message: "Image must be a valid URL or empty" }
  ),
  images: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  categoryId: z.string().uuid("Invalid category ID").optional(),
  inStock: z.boolean().optional(),
  isActive: z.boolean().optional(),
  stockQuantity: z.number().int("Stock quantity must be an integer").min(0, "Stock quantity cannot be negative").optional(),
  specifications: z.record(z.union([z.string(), z.number()])).optional(),
  usage: z.string().optional(),
  shipping: z.string().optional(),
  // Optional variants payload. When provided, the product and its variants
  // are created in the same request — and on any variant failure the product
  // is rolled back. Prevents the half-built "product with no variants" state
  // that the legacy two-call flow could leave behind.
  variants: z.array(variantInputSchema).optional(),
})

export const GET = optionalAuthMiddleware(async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")

    // Parse pagination parameters with safety caps
    const MAX_LIMIT = 100
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam) || 0, 1), MAX_LIMIT) : undefined
    const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : undefined

    // Fetch products with pagination at database level
    let products = await getProducts({
      limit,
      offset,
    })

    // Filter by category (after fetching, since category is a text field, not category_id)
    if (category && category !== "All") {
      products = products.filter((p) => p.category === category)
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.category?.toLowerCase().includes(searchLower)
      )
    }

    // Get total count for pagination metadata (only if pagination is requested)
    let total = undefined
    if (limit !== undefined || offset !== undefined) {
      // For accurate count with filters, we'd need to apply the same filters
      // For now, we'll get the total and let the client handle it
      total = await getProductsCount()
    }

    return NextResponse.json({ 
      products,
      ...(total !== undefined && { total, hasMore: offset !== undefined && limit !== undefined ? (offset + limit) < total : undefined })
    })
  } catch (error) {
    console.error("Get products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAdminMiddleware(async (req) => {
  try {
    const body = await req.json()
    const { variants, ...productData } = productSchema.parse(body)

    const product = await createProduct({
      ...productData,
      id: crypto.randomUUID(),
      createdBy: req.user?.id,
    })

    if (!variants || variants.length === 0) {
      return NextResponse.json({ product }, { status: 201 })
    }

    // Variant phase. If any variant insert fails, hard-delete the product so
    // we never leave behind a variantless (and therefore unbuyable) row.
    try {
      // Normalize: ensure exactly one default variant.
      const hasDefault = variants.some((v) => v.isDefault)
      const normalizedVariants = hasDefault
        ? variants
        : variants.map((v, i) => ({ ...v, isDefault: i === 0 }))

      let defaultVariantId: string | null = null

      for (let i = 0; i < normalizedVariants.length; i++) {
        const v = normalizedVariants[i]
        const created = await createVariant({
          productId: product.id,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          inStock: v.stock > 0,
          isDefault: !!v.isDefault,
          displayOrder: v.displayOrder ?? i,
        })
        if (v.isDefault) defaultVariantId = created.id
      }

      // setDefaultVariant clears stale defaults and (if no explicit thumbnail)
      // syncs the product thumbnail from the default variant's primary image.
      // Images are uploaded by the client after this returns, so the sync is
      // typically a no-op here — that's fine.
      if (defaultVariantId) {
        await setDefaultVariant(product.id, defaultVariantId, { syncThumbnail: true })
      }

      // Re-fetch so the response includes the variants the client just created.
      const enriched = await getProductById(product.id)
      return NextResponse.json({ product: enriched ?? product }, { status: 201 })
    } catch (variantError) {
      console.error("Create product: variant creation failed, rolling back product", variantError)
      // Best-effort cleanup. If this also fails, we'll have an orphan product
      // — but at least the failure is logged and admin can see it.
      try {
        await deleteProduct(product.id)
      } catch (cleanupError) {
        console.error("Create product: rollback delete failed", cleanupError, {
          productId: product.id,
        })
      }
      return NextResponse.json(
        { error: "Failed to create product variants; product was not saved" },
        { status: 500 }
      )
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create product error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})
