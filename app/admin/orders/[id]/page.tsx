import { AdminOrderDetail } from "@/components/admin/admin-order-detail"

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AdminOrderDetail orderId={id} />
}
