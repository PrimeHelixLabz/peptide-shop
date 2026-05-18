import { getAllSubscribersAsAdmin } from "@/lib/db/newsletter"
import { AdminNewsletterTable } from "@/components/admin/admin-newsletter-table"

export const dynamic = "force-dynamic"

export default async function AdminNewsletterPage() {
  const subscribers = await getAllSubscribersAsAdmin()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Newsletter
        </h1>
        <p className="text-sm text-muted-foreground">
          Email subscribers captured via the exit-intent popup and any other
          opt-in surfaces. Export to CSV to bring the list into Mailchimp,
          ConvertKit, or your campaign tool of choice.
        </p>
      </div>

      <AdminNewsletterTable subscribers={subscribers} />
    </div>
  )
}
