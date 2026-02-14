import type { Metadata } from "next"
import { Suspense } from "react"
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
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading order details...</p>
                </div>
              </div>
            }>
              <OrderConfirmation orderNumber={orderNumber} />
            </Suspense>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
