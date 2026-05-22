import { notFound } from "next/navigation"
import { AdminDiscountForm } from "@/components/admin/admin-discount-form"
import {
  getDiscountCodeByIdAsAdmin,
  getRedemptionsForCodeAsAdmin,
} from "@/lib/discounts/db"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditDiscountPage({ params }: PageProps) {
  const { id } = await params
  const code = await getDiscountCodeByIdAsAdmin(id)
  if (!code) notFound()
  const redemptions = await getRedemptionsForCodeAsAdmin(id, 20)
  return <AdminDiscountForm initial={code} redemptions={redemptions} />
}
