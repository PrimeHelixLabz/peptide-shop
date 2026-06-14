import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { OrderReceipt } from "@/components/admin/order-receipt"
import { getOrderByIdAsAdmin } from "@/lib/db/supabase"

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

  // The packing slip is a paid-order artifact (it prints "Total Paid" and now
  // the CentryOS service fee). Hiding the button isn't enough — the route is
  // directly reachable by URL — so gate here too and bounce non-paid orders.
  const order = await getOrderByIdAsAdmin(id)
  if (!order || order.paymentStatus !== "paid") {
    redirect(`/admin/orders/${id}`)
  }

  return <OrderReceipt orderId={id} />
}
