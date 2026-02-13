import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CartView } from "@/components/cart-view"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Cart | Elysian Peptides",
  description: "Review your cart and proceed to checkout.",
}

export default function CartPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Page Header & Content Combined */}
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Review"
              title="Your cart"
              className="mb-8 md:mb-12"
            />
            <CartView />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
