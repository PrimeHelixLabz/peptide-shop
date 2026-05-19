import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"
import { AdminCard } from "@/components/common/admin-card"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusVariant } from "@/components/common/status-badge"
import { CopyLinkButton } from "@/components/affiliates/copy-link-button"
import { getCurrentUser } from "@/lib/auth/supabase-auth"
import {
  resolveAffiliateForUser,
  getAffiliateStats,
  ensureCodeForAffiliate,
  type ConversionStatus,
} from "@/lib/affiliates"

export const metadata: Metadata = {
  title: "Affiliate Dashboard | PrimeHelix Labz",
  description: "Track your referrals, conversions, and earnings.",
  alternates: { canonical: "/affiliates/dashboard" },
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

const SITE_ORIGIN = "https://primehelixlabz.com"

const CONVERSION_STATUS_VARIANT: Record<ConversionStatus, StatusVariant> = {
  pending: "warning",
  payable: "info",
  paid: "success",
  reversed: "neutral",
}

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

function PromptCard({
  title,
  description,
  actions,
}: {
  title: string
  description: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-card text-card-foreground p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </div>
      {actions && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {actions}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <AdminCard>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </AdminCard>
  )
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
              <PromptCard
                title="Sign in required"
                description="Sign in to view your affiliate dashboard."
                actions={
                  <Button asChild>
                    <Link href="/signin?redirect=/affiliates/dashboard">Sign in</Link>
                  </Button>
                }
              />
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  const lookup = await resolveAffiliateForUser(user.id, user.email)

  // An affiliate row exists for this email but is linked to a different
  // login. Don't expose that person's data — point to support.
  if (lookup.kind === "belongs-to-different-account") {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <PromptCard
                title="Different account"
                description={
                  <>
                    An affiliate account exists for{" "}
                    <strong className="text-foreground">{user.email}</strong>,
                    but it&rsquo;s linked to a different sign-in. If this is
                    you, sign in with the original account, or email{" "}
                    <a
                      href="mailto:support@primehelixlabz.com"
                      className="underline"
                    >
                      support@primehelixlabz.com
                    </a>{" "}
                    so we can re-link it.
                  </>
                }
              />
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  const affiliate = lookup.kind === "found" ? lookup.affiliate : null

  // Not yet an affiliate — invite them to apply.
  if (!affiliate) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <PromptCard
                title="Not an affiliate yet"
                description="Apply to the program to get a referral link and start earning commission."
                actions={
                  <>
                    <Button asChild>
                      <Link href="/affiliates/apply">Apply to the program</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/affiliates">Learn more</Link>
                    </Button>
                  </>
                }
              />
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
              <PromptCard
                title="Application under review"
                description={
                  <>
                    Thanks for applying. We typically respond within 2 business
                    days. You&rsquo;ll get an email at{" "}
                    <strong className="text-foreground">{affiliate.email}</strong>{" "}
                    once your account is approved and your referral link is ready.
                  </>
                }
              />
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
              <PromptCard
                title="Account suspended"
                description={
                  <>
                    Your affiliate account is currently suspended. Please reach
                    out to{" "}
                    <a
                      href="mailto:support@primehelixlabz.com"
                      className="underline"
                    >
                      support@primehelixlabz.com
                    </a>{" "}
                    if you believe this is in error.
                  </>
                }
              />
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
          <Container size="md">
            <div className="flex flex-col gap-10">
              <PageHeader
                label="Affiliate Dashboard"
                title={`Welcome back, ${affiliate.name.split(" ")[0] || affiliate.name}`}
                description={`Commission rate: ${(affiliate.commissionRate * 100).toFixed(0)}% per paid order · 90-day cookie window`}
              />

              {/* Referral Links */}
              <AdminCard title="Your referral link">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Share this link to earn commission. Your code is{" "}
                    <strong className="font-mono text-foreground">
                      {code.code}
                    </strong>
                    .
                  </p>
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted p-4">
                    <code className="flex-1 break-all text-sm text-foreground">
                      {referralLink}
                    </code>
                    <CopyLinkButton value={referralLink} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted p-4">
                    <code className="flex-1 break-all text-sm text-foreground">
                      {shopReferralLink}
                    </code>
                    <CopyLinkButton value={shopReferralLink} label="Copy shop link" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tip: append <code className="font-mono">?ref={code.code}</code>{" "}
                    to any URL on the site &mdash; including individual product
                    pages.
                  </p>
                </div>
              </AdminCard>

              {/* Stat cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                  label="Conversions"
                  value={stats.totalConversions.toString()}
                />
                <StatCard
                  label="Total earned"
                  value={formatCurrency(stats.totalEarnings)}
                  hint="Lifetime, excluding reversed orders"
                />
                <StatCard
                  label="Payable"
                  value={formatCurrency(stats.payableEarnings)}
                  hint="Cleared the holdback window"
                />
                <StatCard
                  label="Paid out"
                  value={formatCurrency(stats.paidEarnings)}
                />
              </div>

              {/* Recent conversions */}
              <AdminCard title="Recent conversions" flush>
                <div className="border-b border-border/50 px-6 pb-5 text-sm text-muted-foreground md:px-8">
                  Showing the {Math.min(stats.recentConversions.length, 25)}{" "}
                  most recent attributed orders.
                </div>
                {stats.recentConversions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground md:p-12">
                    No conversions yet. Start sharing your link &mdash; cookie
                    attribution lasts 90 days, so even orders placed weeks later
                    count.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Date
                          </th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Order total
                          </th>
                          <th className="hidden px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                            Rate
                          </th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Commission
                          </th>
                          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentConversions.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                          >
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {formatDate(c.createdAt)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {formatCurrency(c.orderTotal)}
                            </td>
                            <td className="hidden px-6 py-4 text-sm text-muted-foreground md:table-cell">
                              {(c.commissionRate * 100).toFixed(0)}%
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {formatCurrency(c.commissionAmount)}
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge
                                variant={CONVERSION_STATUS_VARIANT[c.status]}
                              >
                                {c.status}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AdminCard>

              {/* Payout info */}
              <AdminCard title="Payout details">
                <dl className="grid gap-4 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Method
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {affiliate.payoutMethod || (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                      Handle
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {affiliate.payoutDetails || (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  To update your payout details, email{" "}
                  <a
                    href="mailto:support@primehelixlabz.com"
                    className="underline"
                  >
                    support@primehelixlabz.com
                  </a>
                  .
                </p>
              </AdminCard>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
