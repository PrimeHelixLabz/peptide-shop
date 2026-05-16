import { getAllAffiliatesWithStatsAsAdmin } from "@/lib/affiliates"
import { AdminAffiliatesTable } from "@/components/admin/admin-affiliates-table"

export const dynamic = "force-dynamic"

export default async function AdminAffiliatesPage() {
  const affiliates = await getAllAffiliatesWithStatsAsAdmin()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Affiliates
        </h1>
        <p className="text-sm text-muted-foreground">
          Approve or suspend partner applications, adjust commission rates, and
          review earnings. Conversions are tracked automatically when an
          attributed order is paid.
        </p>
      </div>

      <AdminAffiliatesTable affiliates={affiliates} />
    </div>
  )
}
