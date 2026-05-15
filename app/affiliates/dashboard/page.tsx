import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container } from "@/components/layout"
import { CopyLinkButton } from "@/components/affiliates/copy-link-button"
import { getCurrentUser } from "@/lib/auth/supabase-auth"
import {
  getAffiliateByUserId,
  getAffiliateStats,
  ensureCodeForAffiliate,
} from "@/lib/affiliates"

export const metadata: Metadata = {
  title: "Affiliate Dashboard | PrimeHelix Labz",
  description: "Track your referrals, conversions, and earnings.",
  alternates: { canonical: "/affiliates/dashboard" },
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const SITE_ORIGIN = "https://primehelixlabz.com"

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function AffiliateDashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    // Middleware should have redirected already, but defense-in-depth.
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md text-center">
                <Link href="/signin?redirect=/affiliates/dashboard" className="underline">
                  Sign in
                </Link>{" "}
                to view your affiliate dashboard.
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  const affiliate = await getAffiliateByUserId(user.id)

  // Not yet an affiliate — invite them to apply.
  if (!affiliate) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Not an affiliate yet
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Apply to the program to get a referral link and start
                  earning commission.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/affiliates/apply"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                  >
                    Apply to the program
                  </Link>
                  <Link
                    href="/affiliates"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-gray-100 active:scale-95 border border-gray-200"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  // Pending approval state
  if (affiliate.status === "pending") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Application under review
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Thanks for applying. We typically respond within 2 business
                  days. You&rsquo;ll get an email at{" "}
                  <strong className="text-foreground">{affiliate.email}</strong>{" "}
                  once your account is approved and your referral link is ready.
                </p>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  // Suspended state
  if (affiliate.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Account suspended
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Your affiliate account is currently suspended. Please reach
                  out to <a href="mailto:support@primehelixlabz.com" className="underline">support@primehelixlabz.com</a> if
                  you believe this is in error.
                </p>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  // Approved — full dashboard
  const code = await ensureCodeForAffiliate(affiliate.id, affiliate.name)
  const stats = await getAffiliateStats(affiliate.id)

  const referralLink = `${SITE_ORIGIN}/?ref=${code.code}`
  const shopReferralLink = `${SITE_ORIGIN}/shop?ref=${code.code}`

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto flex max-w-5xl flex-col gap-10">
              {/* Header */}
              <header className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Affiliate Dashboard
                </span>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Welcome back, {affiliate.name.split(" ")[0] || affiliate.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Commission rate: {(affiliate.commissionRate * 100).toFixed(0)}% per
                  paid order &middot; 90-day cookie window
                </p>
              </header>

              {/* Referral Links */}
              <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-8">
                <h2 className="text-lg font-semibold text-foreground md:text-xl">
                  Your referral link
                </h2>
                <p className="text-sm text-muted-foreground">
                  Share this link to earn commission. Your code is{" "}
                  <strong className="font-mono text-foreground">{code.code}</strong>.
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-4">
                    <code className="flex-1 break-all text-sm text-foreground">
                      {referralLink}
                    </code>
                    <CopyLinkButton value={referralLink} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-4">
                    <code className="flex-1 break-all text-sm text-foreground">
                      {shopReferralLink}
                    </code>
                    <CopyLinkButton value={shopReferralLink} label="Copy shop link" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: append <code className="font-mono">?ref={code.code}</code>{" "}
                  to any URL on the site &mdash; including individual product pages.
                </p>
              </section>

              {/* Stat cards */}
              <section className="grid gap-4 md:grid-cols-4">
                <StatCard label="Conversions" value={stats.totalConversions.toString()} />
                <StatCard label="Total earned" value={formatCurrency(stats.totalEarnings)} hint="Lifetime, excluding reversed orders" />
                <StatCard label="Payable" value={formatCurrency(stats.payableEarnings)} hint="Cleared the holdback window" />
                <StatCard label="Paid out" value={formatCurrency(stats.paidEarnings)} />
              </section>

              {/* Recent conversions */}
              <section className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                <div className="border-b border-gray-100 p-6 md:p-8">
                  <h2 className="text-lg font-semibold text-foreground md:text-xl">
                    Recent conversions
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Showing the {Math.min(stats.recentConversions.length, 25)} most
                    recent attributed orders.
                  </p>
                </div>

                {stats.recentConversions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground md:p-12">
                    No conversions yet. Start sharing your link &mdash; cookie
                    attribution lasts 90 days, so even orders placed weeks
                    later count.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-muted-foreground">
                        <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Order total</th>
                          <th className="px-6 py-3 font-medium">Rate</th>
                          <th className="px-6 py-3 font-medium">Commission</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-foreground">
                        {stats.recentConversions.map((c) => (
                          <tr key={c.id}>
                            <td className="px-6 py-4 text-muted-foreground">
                              {formatDate(c.createdAt)}
                            </td>
                            <td className="px-6 py-4">{formatCurrency(c.orderTotal)}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {(c.commissionRate * 100).toFixed(0)}%
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {formatCurrency(c.commissionAmount)}
                            </td>
                            <td className="px-6 py-4">
                              <StatusPill status={c.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Payout info */}
              <section className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-8">
                <h2 className="text-lg font-semibold text-foreground md:text-xl">
                  Payout details
                </h2>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Method
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {affiliate.payoutMethod || <span className="text-muted-foreground">Not set</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Handle
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {affiliate.payoutDetails || <span className="text-muted-foreground">Not set</span>}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  To update your payout details, email{" "}
                  <a href="mailto:support@primehelixlabz.com" className="underline">
                    support@primehelixlabz.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    payable: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    reversed: "bg-gray-200 text-gray-700",
  }
  const cls = styles[status] || "bg-gray-100 text-gray-800"
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
