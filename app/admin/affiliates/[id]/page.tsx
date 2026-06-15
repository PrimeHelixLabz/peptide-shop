import { notFound } from "next/navigation"
import {
  getAffiliateByIdAsAdmin,
  getActiveCodeForAffiliateAsAdmin,
  getConversionsWithOrderForAffiliateAsAdmin,
} from "@/lib/affiliates"
import { AffiliateDetail } from "@/components/admin/affiliate-detail"

export const dynamic = "force-dynamic"

export default async function AdminAffiliateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const affiliate = await getAffiliateByIdAsAdmin(id)
  if (!affiliate) notFound()

  const [code, conversions] = await Promise.all([
    getActiveCodeForAffiliateAsAdmin(id),
    getConversionsWithOrderForAffiliateAsAdmin(id),
  ])

  return (
    <AffiliateDetail affiliate={affiliate} code={code} conversions={conversions} />
  )
}
