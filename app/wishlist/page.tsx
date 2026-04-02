import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { WishlistView } from "@/components/wishlist-view"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Wishlist | PrimeHelix Labz",
  description: "View your saved favorite products.",
  robots: { index: false, follow: false },
}

export default function WishlistPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Page Header & Content Combined */}
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Saved Items"
              title="My Wishlist"
              className="mb-8 md:mb-12"
            />
            <WishlistView />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
