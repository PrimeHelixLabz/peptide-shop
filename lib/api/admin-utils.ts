import type { Product } from "@/lib/db/schema"

export interface AdminProduct {
  id: string
  name: string
  image: string
  price: number
  category: string
  purity: string
  stock: number
  status: "Active" | "Inactive"
  isArchived?: boolean
}

/** Map product catalog data into admin-table shape */
export function toAdminProduct(p: Product): AdminProduct {
  const purity = p.specifications?.purity
    ? typeof p.specifications.purity === "string"
      ? p.specifications.purity
      : `${p.specifications.purity}%`
    : "N/A"

  // Derive stock from variants
  const stock = p.variants && p.variants.length > 0
    ? p.variants.reduce((sum, v) => sum + v.stock, 0)
    : 0

  return {
    id: p.id,
    name: p.name,
    image: p.image,
    price: p.price,
    category: p.category || "Uncategorized",
    purity,
    stock,
    status: p.isActive ? "Active" : "Inactive",
    isArchived: p.isArchived || false,
  }
}
