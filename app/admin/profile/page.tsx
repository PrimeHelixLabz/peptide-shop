import type { Metadata } from "next"
import { AdminProfile } from "@/components/admin/admin-profile"
import { PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Profile | Admin | PrimeHelix Labz",
  description: "Manage your admin profile information and settings.",
}

export default function AdminProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        label="Admin"
        title="Profile Settings"
        description="Manage your profile information and account settings."
      />
      <AdminProfile />
    </div>
  )
}
