import { getAllSubscribersAsAdmin } from "@/lib/db/newsletter"
import { getAllCampaignsAsAdmin } from "@/lib/db/campaigns"
import { AdminNewsletterManager } from "@/components/admin/admin-newsletter-manager"

export const dynamic = "force-dynamic"

export default async function AdminNewsletterPage() {
  const [subscribers, campaigns] = await Promise.all([
    getAllSubscribersAsAdmin(),
    getAllCampaignsAsAdmin(),
  ])

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Newsletter
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage subscribers and send marketing emails directly. Import a CSV or
          add your existing customers, select who to reach, compose with a live
          preview, and send. Every email includes a one-click unsubscribe link.
        </p>
      </div>

      <AdminNewsletterManager subscribers={subscribers} campaigns={campaigns} />
    </div>
  )
}
