"use client"

import { useState } from "react"
import { AdminCustomersTable } from "@/components/admin/admin-customers-table"
import { CustomerDetailPanel } from "@/components/admin/customer-detail-panel"

export default function AdminCustomersPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  return (
    <>
      <AdminCustomersTable onSelectCustomer={setSelectedCustomerId} />
      <CustomerDetailPanel
        customerId={selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
      />
    </>
  )
}
