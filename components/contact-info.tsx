import { Mail, Clock } from "lucide-react"

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "support@primehelixlabz.com",
    href: "mailto:support@primehelixlabz.com",
    description:
      "For general inquiries, order questions, and technical support.",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon \u2013 Fri, 9:00 AM \u2013 5:00 PM EST",
    description: "We respond to all inquiries within one business day.",
  },
]

export function ContactInfo() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Get in Touch
        </span>
        <p className="text-base leading-relaxed text-muted-foreground">
          {
            "Have a question about an order, product availability, or bulk purchasing? Our team is here to help."
          }
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {contactDetails.map((detail) => (
          <div
            key={detail.label}
            className="flex gap-5 rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <detail.icon
                className="h-5 w-5 text-primary"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                {detail.label}
              </span>
              {detail.href ? (
                <a
                  href={detail.href}
                  className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {detail.value}
                </a>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {detail.value}
                </span>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {detail.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:p-8">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {
            "For the fastest response, please include your order number (if applicable) and a detailed description of your inquiry. Our average response time is under 4 hours during business days."
          }
        </p>
      </div>
    </div>
  )
}
