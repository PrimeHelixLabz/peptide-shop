/**
 * Shared types for products API
 */

import type { Product } from "@/components/product-card"

export interface ProductDetail extends Product {
  longDescription: string
  usage: string
  shipping: string
  // specifications can include: purity, weight, form, sequence, etc.
}
