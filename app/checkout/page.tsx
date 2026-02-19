import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CheckoutForm } from "@/components/checkout-form"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Checkout | PrimeHelix Labz",
  description: "Complete your order securely.",
}

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Secure Checkout"
              title="Complete your order"
              className="mb-8 md:mb-12"
            />
            <CheckoutForm />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
