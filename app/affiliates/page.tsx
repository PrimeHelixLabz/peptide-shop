import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container } from "@/components/layout"
import { Coins, Megaphone, ShieldCheck, BarChart3 } from "lucide-react"

export const metadata: Metadata = {
  title: "Affiliate Program | PrimeHelix Labz",
  description:
    "Earn commission on every research peptide order placed through your referral link. Designed for content creators, forum operators, and lab community members.",
  alternates: {
    canonical: "/affiliates",
  },
}

const PERKS = [
  {
    icon: Coins,
    title: "10% commission",
    description:
      "Earn 10% of every order placed through your unique referral link. Paid out monthly once thresholds are met.",
  },
  {
    icon: BarChart3,
    title: "90-day cookie window",
    description:
      "Visitors who arrive through your link have 90 days to convert. Long-cycle research buyers don't slip through.",
  },
  {
    icon: ShieldCheck,
    title: "Verified-purchase tracking",
    description:
      "Conversions are recorded only on paid orders, not pending or cancelled ones. No surprises, no clawbacks.",
  },
  {
    icon: Megaphone,
    title: "A real product to promote",
    description:
      "Pharmaceutical-grade peptides, lot-specific COAs, fast US shipping, and a research-only positioning your audience can trust.",
  },
]

const FAQS = [
  {
    q: "Who is this for?",
    a: "Content creators, YouTube channels, podcasters, forum admins, newsletter operators, and community members in the research-peptide and longevity space. We do not accept untargeted PPC traffic.",
  },
  {
    q: "How do I get paid?",
    a: "Once your earned commissions clear our return window (~30 days), we pay out monthly via PayPal, Wise, or crypto — your choice during application.",
  },
  {
    q: "What's the commission rate?",
    a: "10% of the order subtotal on every paid order placed through your link. Higher rates are available for high-volume partners on a case-by-case basis.",
  },
  {
    q: "What can't I do?",
    a: "No coupon-site spam, no Google/Meta/TikTok paid ads (those platforms ban this niche and would suspend your account anyway), no impersonation of PrimeHelix, no medical or dosing claims about the products.",
  },
  {
    q: "How long does approval take?",
    a: "We review applications within 2 business days. We approve partners with a real audience and a track record in adjacent communities.",
  },
]

export default function AffiliatesLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-16 py-12 md:gap-24 md:py-20">
        {/* Hero */}
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Partner Program
              </span>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
                Earn 10% on every research-peptide order you send our way.
              </h1>
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                The PrimeHelix Labz Affiliate Program pays commission on real,
                paid orders &mdash; tracked through a 90-day cookie and a
                verified-purchase model that protects both sides.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/affiliates/apply"
                  className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 min-h-[48px]"
                >
                  Apply now
                </Link>
                <Link
                  href="/affiliates/dashboard"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-foreground transition-all duration-200 hover:bg-gray-100 active:scale-95 min-h-[48px] border border-gray-200"
                >
                  Affiliate sign in
                </Link>
              </div>
            </div>
          </Container>
        </Section>

        {/* Perks */}
        <Section background="muted" padding="md">
          <Container>
            <div className="grid gap-6 md:grid-cols-2">
              {PERKS.map((perk) => {
                const Icon = perk.icon
                return (
                  <article
                    key={perk.title}
                    className="flex flex-col gap-3 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
                      {perk.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                      {perk.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </Container>
        </Section>

        {/* How it works */}
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                How it works
              </h2>
              <ol className="space-y-5">
                {[
                  {
                    step: "1",
                    title: "Apply",
                    body: "Tell us about your audience and where you'll be promoting. We review every application individually.",
                  },
                  {
                    step: "2",
                    title: "Get your link",
                    body: "Once approved, we mint a unique referral code. Append it to any product or shop URL — e.g. primehelixlabz.com/shop?ref=YOURCODE.",
                  },
                  {
                    step: "3",
                    title: "Drive traffic",
                    body: "Share the link in your videos, articles, newsletters, or forum posts. The cookie sticks for 90 days.",
                  },
                  {
                    step: "4",
                    title: "Get paid",
                    body: "Track conversions and earnings in your dashboard. We pay out monthly once your earned commissions clear the return window.",
                  },
                ].map((item) => (
                  <li
                    key={item.step}
                    className="flex gap-5 rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {item.step}
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-semibold text-foreground md:text-lg">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </Section>

        {/* FAQ */}
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                Common questions
              </h2>
              <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
                {FAQS.map((faq, i) => (
                  <details
                    key={faq.q}
                    className={`group ${
                      i > 0 ? "border-t border-gray-100" : ""
                    }`}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-foreground transition-colors hover:bg-gray-50 md:px-8">
                      {faq.q}
                      <span
                        aria-hidden="true"
                        className="text-xl text-muted-foreground transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground md:px-8 md:pb-8 md:text-base">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 rounded-3xl bg-slate-900 p-10 text-center text-white md:p-14">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Ready to start earning?
              </h2>
              <p className="text-sm leading-relaxed text-slate-300 md:text-base">
                Two minutes to apply. We review every submission within
                2 business days.
              </p>
              <Link
                href="/affiliates/apply"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-gray-100 active:scale-95 min-h-[48px]"
              >
                Apply to the program
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
