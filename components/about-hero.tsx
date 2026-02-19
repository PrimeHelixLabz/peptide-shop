import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SectionHeader } from "@/components/layout/section-header"

export function AboutHero() {
  return (
    <Section background="default" padding="lg">
      <Container size="md">
        <SectionHeader
          label="About Us"
          title="Science you can trust"
          className="justify-center"
          description="PrimeHelix Labz was founded on a simple principle: researchers deserve access to the highest-quality peptides without compromise. Every product we offer is synthesized under strict conditions, independently verified, and handled with the precision your work demands."
          align="center"
        />
      </Container>
    </Section>
  )
}
