import { Target, Beaker, Users } from "lucide-react"

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
    <section className="border-t border-border bg-card py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 flex flex-col gap-3 text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            What Drives Us
          </span>
          <h2 className="font-serif text-4xl text-card-foreground md:text-5xl text-balance">
            Our Mission
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3 md:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="flex flex-col items-center gap-5 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center border border-border bg-background">
                <pillar.icon
                  className="h-6 w-6 text-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-base font-medium text-card-foreground">
                {pillar.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
