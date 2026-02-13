import { NextRequest, NextResponse } from "next/server"
import { getProducts, createProduct } from "@/lib/db/supabase"
import { requireAdminMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware"
import { z } from "zod"

const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  description: z.string().min(1),
  longDescription: z.string().optional(),
  image: z.string().url(),
  images: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  inStock: z.boolean(),
  stockQuantity: z.number().int().min(0),
  specifications: z.record(z.union([z.string(), z.number()])).optional(),
  usage: z.string().optional(),
  shipping: z.string().optional(),
})

export const GET = optionalAuthMiddleware(async (req) => {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const limit = searchParams.get("limit")

    let products = await getProducts()

    // Filter by category
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

    // Limit results
    if (limit) {
      products = products.slice(0, parseInt(limit))
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error("Get products error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const POST = requireAdminMiddleware(async (req) => {
  try {
    const body = await req.json()
    const data = productSchema.parse(body)

    const product = await createProduct({
      ...data,
      id: crypto.randomUUID(),
      createdBy: req.user?.id,
    })

    return NextResponse.json({ product }, { status: 201 })
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
