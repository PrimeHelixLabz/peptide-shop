import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { OrderConfirmation } from "@/components/order-confirmation"
import { Section, Container } from "@/components/layout"

export const metadata: Metadata = {
  title: "Order Confirmation | Elysian Peptides",
  description: "Your order has been confirmed.",
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>
}) {
  const { orderNumber } = await params
  
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <OrderConfirmation orderNumber={orderNumber} />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
