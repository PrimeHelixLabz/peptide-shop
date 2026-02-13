import { FlaskConical, FileCheck, ShieldCheck, Microscope } from "lucide-react"

const steps = [
  {
    icon: FlaskConical,
    label: "GMP-Adjacent Synthesis",
    description:
      "All peptides are produced in controlled environments that adhere to Good Manufacturing Practice-adjacent protocols for consistent batch quality.",
  },
  {
    icon: Microscope,
    label: "HPLC Verification",
    description:
      "High-performance liquid chromatography confirms peptide identity and purity to a minimum threshold of 98% before any product is released.",
  },
  {
    icon: FileCheck,
    label: "Mass Spectrometry",
    description:
      "Every batch undergoes mass spectrometry analysis to verify molecular weight and structural integrity against reference standards.",
  },
  {
    icon: ShieldCheck,
    label: "Certificate of Analysis",
    description:
      "A full COA is generated for each lot and made available with your order, documenting purity, identity, and testing methodology.",
  },
]

export function AboutQuality() {
  return (
    <section className="border-t border-border bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 flex flex-col gap-3 text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Our Process
          </span>
          <h2 className="font-serif text-4xl text-foreground md:text-5xl text-balance">
            {"Quality & Testing"}
          </h2>
        </div>

        <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.label}
              className="flex flex-col gap-4 bg-background p-8 lg:p-10"
            >
              <step.icon
                className="h-6 w-6 text-foreground"
                strokeWidth={1.5}
              />
              <h3 className="text-base font-medium text-foreground">
                {step.label}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
