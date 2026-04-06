import { Section, Container, PageHeader } from "@/components/layout"

export function AboutHero() {
  return (
    <Section background="muted" padding="md">
      <Container size="md">
        <PageHeader
          label="About Us"
          title="Science you can trust"
          description="PrimeHelix Labz was founded on a simple principle: researchers deserve access to the highest-quality peptides without compromise. Every product we offer is synthesized under strict conditions, independently verified, and handled with the precision your work demands."
          align="center"
        />
      </Container>
    </Section>
  )
}
