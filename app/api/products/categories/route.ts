import { NextRequest, NextResponse } from "next/server"
import { getCategories } from "@/lib/db/categories"

export async function GET(request: NextRequest) {
  try {
    const categories = await getCategories()
    // Return category names for backward compatibility with existing frontend code
    const categoryNames = categories.map((c) => c.name)
    return NextResponse.json({ categories: ["All", ...categoryNames] })
  } catch (error) {
    console.error("Get categories error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
