import { ShieldCheck, Lock, Truck } from "lucide-react"
import { TrustpilotLink } from "@/components/trustpilot/trustpilot-link"
import { publicEnv } from "@/lib/env"

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Lab Tested",
    description:
      "Every product is verified through independent third-party laboratory analysis with full COA documentation.",
  },
  {
    icon: Lock,
    title: "Secure Checkout",
    description:
      "256-bit SSL encryption and PCI-compliant payment processing protect every transaction you make.",
  },
  {
    icon: Truck,
    title: "Fast Shipping",
    description:
      "Orders placed before 2 PM EST ship same day.",
  },
]

import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SectionHeader } from "@/components/layout/section-header"

export function TrustSection() {
  const trustpilotEnabled = !!publicEnv.NEXT_PUBLIC_TRUSTPILOT_DOMAIN

  return (
    <Section id="trust" background="muted" padding="md">
      <Container>
        <SectionHeader
          label="Your Confidence"
          title="Trust at every step"
          align="center"
          className="mb-12 md:mb-16"
        />

        {/* Trust Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] lg:p-10"
            >
              <item.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trustpilot CTA card. Uses plain HTML links because embedded
            TrustBox widgets require a paid Trustpilot plan. Hidden when
            NEXT_PUBLIC_TRUSTPILOT_DOMAIN is unset so dev environments
            don't ship an orphaned card. */}
        {trustpilotEnabled && (
          <div className="mt-12 flex flex-col items-center gap-6 rounded-3xl bg-white p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:mt-16 md:flex-row md:items-center md:justify-between md:gap-8 md:p-8 md:text-left lg:p-10">
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-foreground md:text-xl">
                Trusted by the research community
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Read independent reviews on Trustpilot, or share your own
                experience to help other researchers.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row md:shrink-0">
              <TrustpilotLink mode="read" />
              <TrustpilotLink mode="write" appearance="button" />
            </div>
          </div>
        )}
      </Container>
    </Section>
  )
}
