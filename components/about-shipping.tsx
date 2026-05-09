import { Truck, Clock, Globe } from "lucide-react"
import { Section, Container, SectionHeader } from "@/components/layout"

const details = [
  {
    icon: Clock,
    title: "Same-Day Processing",
    description:
      "Orders confirmed before 2 PM EST Monday through Friday are processed and handed off to carriers the same business day.",
  },
  {
    icon: Truck,
    title: "Tracked Delivery",
    description:
      "Full tracking information is provided via email as soon as your order ships. Standard transit times range from 2 to 5 business days.",
  },
  {
    icon: Globe,
    title: "Domestic Coverage",
    description:
      "We currently ship to all 50 US states. International shipping is not available at this time.",
  },
]

export function AboutShipping() {
  return (
    <Section background="muted" padding="md">
      <Container>
        <SectionHeader
          label="Logistics"
          title="Shipping & Fulfillment"
          align="center"
          className="mb-12 md:mb-16"
        />

        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {details.map((detail) => (
            <div
              key={detail.title}
              className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] lg:p-10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <detail.icon
                  className="h-5 w-5 text-primary"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {detail.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {detail.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
