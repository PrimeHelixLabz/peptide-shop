import { Mail, Clock, MapPin, Phone } from "lucide-react"

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "support@primehelixlabz.com",
    href: "mailto:support@primehelixlabz.com",
    description: "For general inquiries, order questions, and technical support.",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (800) 555-0192",
    href: "tel:+18005550192",
    description: "Available during business hours for urgent order issues.",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Mon \u2013 Fri, 9:00 AM \u2013 5:00 PM EST",
    description: "We respond to all inquiries within one business day.",
  },
  {
    icon: MapPin,
    label: "Headquarters",
    value: "Tampa, FL \u2014 United States",
    description: "All orders ship from our climate-controlled facility.",
  },
]

export function ContactInfo() {
  return (
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Get in Touch
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {"Have a question about an order, product availability, or bulk purchasing? Our team is here to help."}
        </p>
      </div>

      {/* Contact Cards */}
      <div className="flex flex-col gap-px overflow-hidden border border-border bg-border">
        {contactDetails.map((detail) => (
          <div
            key={detail.label}
            className="flex gap-4 bg-background px-5 py-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-card">
              <detail.icon
                className="h-4 w-4 text-foreground"
                strokeWidth={1.5}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {detail.label}
              </span>
              {detail.href ? (
                <a
                  href={detail.href}
                  className="text-sm font-medium text-foreground transition-colors hover:text-muted-foreground"
                >
                  {detail.value}
                </a>
              ) : (
                <span className="text-sm font-medium text-foreground">
                  {detail.value}
                </span>
              )}
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {detail.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Response Notice */}
      <div className="border border-border bg-card px-5 py-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          {"For the fastest response, please include your order number (if applicable) and a detailed description of your inquiry. Our average response time is under 4 hours during business days."}
        </p>
      </div>
    </div>
  )
}
