import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container } from "@/components/layout"
import { AffiliateApplyForm } from "@/components/affiliates/apply-form"
import { getCurrentUser } from "@/lib/auth/supabase-auth"
import { getAffiliateByUserId } from "@/lib/affiliates"

export const metadata: Metadata = {
  title: "Apply | Affiliate Program | PrimeHelix Labz",
  description:
    "Apply to the PrimeHelix Labz Affiliate Program. Earn 10% commission on every research peptide order placed through your referral link.",
  alternates: { canonical: "/affiliates/apply" },
  robots: { index: false, follow: true },
}

export const dynamic = "force-dynamic"

export default async function AffiliateApplyPage() {
  const user = await getCurrentUser()

  // Not signed in — push them to signin and bring them back here.
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  Sign in to apply
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  We tie affiliate accounts to your customer login so you can
                  manage everything from one place.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/signin?redirect=/affiliates/apply"
                    className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup?redirect=/affiliates/apply"
                    className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-gray-100 active:scale-95 border border-gray-200"
                  >
                    Create account
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

  // Already applied — bounce to dashboard.
  const existing = await getAffiliateByUserId(user.id)
  if (existing) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-10">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                  You&rsquo;re already in
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  Your affiliate account is{" "}
                  <strong className="text-foreground">{existing.status}</strong>.
                  View your status and link in the dashboard.
                </p>
                <Link
                  href="/affiliates/dashboard"
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
                >
                  Go to dashboard
                </Link>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto max-w-2xl">
              <div className="mb-10 flex flex-col gap-3 text-center">
                <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Affiliate Program
                </span>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Apply to the program
                </h1>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                  Two minutes to fill out. We review every application within
                  2 business days.
                </p>
              </div>
              <AffiliateApplyForm
                defaultName=""
                defaultEmail={user.email}
              />
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
