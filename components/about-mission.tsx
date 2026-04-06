import { Target, Beaker, Users } from "lucide-react"
import { Section, Container, SectionHeader } from "@/components/layout"

const pillars = [
  {
    icon: Target,
    title: "Uncompromising Standards",
    description:
      "We hold ourselves to pharmaceutical-grade benchmarks at every stage, from raw material sourcing through final quality control, ensuring every vial meets the expectations of serious research.",
  },
  {
    icon: Beaker,
    title: "Advancing Discovery",
    description:
      "Our catalog is built around the peptides that matter most to modern research. We continuously expand our offerings based on the evolving needs of the scientific community.",
  },
  {
    icon: Users,
    title: "Researcher-First Approach",
    description:
      "Transparent documentation, responsive support, and fair pricing are not extras. They are the baseline. We exist to serve the people doing the work that matters.",
  },
]

export function AboutMission() {
  return (
    <Section background="muted" padding="md">
      <Container>
        <SectionHeader
          label="What Drives Us"
          title="Our Mission"
          align="center"
          className="mb-12 md:mb-16"
        />

        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col items-center gap-5 rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] lg:p-10"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <pillar.icon
                  className="h-6 w-6 text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {pillar.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
