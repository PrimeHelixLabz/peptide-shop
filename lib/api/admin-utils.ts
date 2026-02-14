import type { ProductDetail } from "@/lib/products"

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
export function toAdminProduct(p: ProductDetail): AdminProduct {
  const purity = p.specifications?.purity
    ? typeof p.specifications.purity === "string"
      ? p.specifications.purity
      : `${p.specifications.purity}%`
    : "N/A"

  return {
    id: p.id,
    name: p.name,
    image: p.image,
    price: p.price,
    category: p.category || "Uncategorized",
    purity,
    stock: p.stockQuantity || 0,
    status: p.inStock ? "Active" : "Inactive",
    isArchived: p.isArchived || false,
  }
}
