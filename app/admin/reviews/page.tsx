import { getAllReviewsAsAdmin } from "@/lib/db/reviews"
import { AdminReviewsTable } from "@/components/admin/admin-reviews-table"

export const dynamic = "force-dynamic"

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAsAdmin()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          Moderate customer reviews on product pages. Reviews from verified
          buyers auto-publish; you can hide spammy or off-topic ones here.
        </p>
      </div>

      <AdminReviewsTable reviews={reviews} />
    </div>
  )
}
