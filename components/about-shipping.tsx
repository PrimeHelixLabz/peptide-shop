import { Truck, Clock, Thermometer, Globe } from "lucide-react"

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
      "We currently ship to all 50 US states. International shipping availability varies by destination and applicable regulations.",
  },
]

export function AboutShipping() {
  return (
    <section className="border-t border-border bg-card py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 flex flex-col gap-3 text-center">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Logistics
          </span>
          <h2 className="font-serif text-4xl text-card-foreground md:text-5xl text-balance">
            {"Shipping & Fulfillment"}
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {details.map((detail) => (
            <div key={detail.title} className="flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center border border-border bg-background">
                <detail.icon
                  className="h-5 w-5 text-foreground"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-base font-medium text-card-foreground">
                {detail.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {detail.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
