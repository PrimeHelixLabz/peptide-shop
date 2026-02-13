import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ContactForm } from "@/components/contact-form"
import { ContactInfo } from "@/components/contact-info"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Contact Us | Elysian Peptides",
  description:
    "Get in touch with Elysian Peptides. Reach our support team for order inquiries, product questions, wholesale requests, and technical assistance.",
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Hero */}
        <Section background="muted" padding="md">
          <Container size="md">
            <PageHeader
              label="Support"
              title="Contact Us"
              description="Whether you have a question about an existing order, need help selecting the right product, or want to discuss bulk pricing — we're here to help."
              align="center"
            />
          </Container>
        </Section>

        {/* Form + Info Grid */}
        <Section background="muted" padding="md">
          <Container>
            <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
              {/* Form Column */}
              <div className="lg:col-span-3">
                <div className="mb-8 flex flex-col gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Send a Message
                  </span>
                  <h2 className="text-2xl font-semibold text-foreground md:text-3xl lg:text-4xl">
                    How can we help?
                  </h2>
                </div>
                <ContactForm />
              </div>

              {/* Info Column */}
              <div className="lg:col-span-2">
                <ContactInfo />
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
