import { FlaskConical, Microscope, Atom } from "lucide-react"

const benefits = [
  {
    icon: FlaskConical,
    title: "Pharmaceutical-Grade",
    description:
      "Every batch is synthesized under strict GMP-adjacent conditions to deliver consistently high purity for your research.",
  },
  {
    icon: Microscope,
    title: "Third-Party Tested",
    description:
      "Independent HPLC and mass spectrometry verification ensures our peptides meet the highest analytical standards.",
  },
  {
    icon: Atom,
    title: "Research-Optimized",
    description:
      "Formulated and lyophilized for maximum stability and shelf life, so you can focus on what matters most.",
  },
]

import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SectionHeader } from "@/components/layout/section-header"

export function BenefitsSection() {
  return (
    <Section id="benefits" background="muted" padding="md">
      <Container>
        <SectionHeader
          label="Why PrimeHelix Labz"
          title="Built on science"
          align="center"
          className="mb-12 md:mb-16"
        />

        {/* Benefits Grid */}
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex flex-col items-center gap-5 rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <benefit.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {benefit.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
