import { FlaskConical, FileCheck, ShieldCheck, Microscope } from "lucide-react"
import { Section, Container, SectionHeader } from "@/components/layout"

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
    <Section background="muted" padding="md">
      <Container>
        <SectionHeader
          label="Our Process"
          title="Quality & Testing"
          align="center"
          className="mb-12 md:mb-16"
        />

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="grid gap-px bg-gray-200 md:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.label}
                className="flex flex-col gap-4 bg-white p-8 lg:p-10"
              >
                <step.icon
                  className="h-6 w-6 text-primary"
                  strokeWidth={1.5}
                />
                <h3 className="text-lg font-semibold text-foreground">
                  {step.label}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
