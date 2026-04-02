import type { Metadata } from "next"
import { AdminShell } from "@/components/admin/admin-shell"

// Force dynamic rendering - this layout should never be statically generated
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "Admin | PrimeHelix Labz",
  description: "PrimeHelix Labz administration dashboard.",
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check is handled by middleware - if user is not admin, they won't reach here
  return <AdminShell>{children}</AdminShell>
}
