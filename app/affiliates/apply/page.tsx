import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container, PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
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

function PromptCard({
  title,
  description,
  actions,
}: {
  title: string
  description: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-md rounded-3xl bg-card text-card-foreground p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
        {description}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {actions}
      </div>
    </div>
  )
}

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
              <PromptCard
                title="Sign in to apply"
                description="We tie affiliate accounts to your customer login so you can manage everything from one place."
                actions={
                  <>
                    <Button asChild>
                      <Link href="/signin?redirect=/affiliates/apply">Sign in</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/signup?redirect=/affiliates/apply">Create account</Link>
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

  // Already applied — bounce to dashboard.
  const existing = await getAffiliateByUserId(user.id)
  if (existing) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
        <Header />
        <main className="flex-1 py-12 md:py-20">
          <Section background="muted" padding="md">
            <Container>
              <PromptCard
                title="You're already in"
                description={
                  <>
                    Your affiliate account is{" "}
                    <strong className="text-foreground">{existing.status}</strong>.
                    View your status and link in the dashboard.
                  </>
                }
                actions={
                  <Button asChild>
                    <Link href="/affiliates/dashboard">Go to dashboard</Link>
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

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container size="sm">
            <PageHeader
              label="Affiliate Program"
              title="Apply to the program"
              description="Two minutes to fill out. We review every application within 2 business days."
              align="center"
              className="mb-10"
            />
            <AffiliateApplyForm defaultName="" defaultEmail={user.email} />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
