import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrdersList } from "@/components/orders-list"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "My Orders | Elysian Peptides",
  description: "View your order history.",
}

export default function OrdersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Order History"
              title="My Orders"
              className="mb-8 md:mb-12"
            />
            <OrdersList />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
