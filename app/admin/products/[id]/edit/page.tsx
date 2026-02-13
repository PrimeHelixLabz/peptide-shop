"use client"

import { AdminProductForm } from "@/components/admin/admin-product-form"
import { use } from "react"

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <AdminProductForm productId={id} />
}
