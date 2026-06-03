import type { Metadata } from "next"
import { OrderReceipt } from "@/components/admin/order-receipt"

export const metadata: Metadata = {
  title: "Packing Slip | PrimeHelix Labz",
  robots: { index: false, follow: false },
}

export default async function AdminOrderReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <OrderReceipt orderId={id} />
}
