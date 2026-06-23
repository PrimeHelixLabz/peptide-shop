import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductsSection } from "@/components/products-section"
import { BenefitsSection } from "@/components/benefits-section"
import { TrustSection } from "@/components/trust-section"
import { Footer } from "@/components/footer"
import { SiteBanner } from "@/components/site-banner"
import { getSiteBanner } from "@/lib/db/site-banner"
// AgeVerification now mounted globally in app/layout.tsx — every page is gated.

// ProductsSection renders the catalog; same staleness cap as /shop. Admin
// product mutations also revalidate this page on demand (lib/revalidate-shop.ts).
// The site banner revalidates this page on demand too (app/api/admin/site-banner).
export const revalidate = 300

export default async function Home() {
  const banner = await getSiteBanner()

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {banner?.enabled && (
          <SiteBanner title={banner.title} message={banner.message} />
        )}
        <HeroSection />
        <ProductsSection />
        <BenefitsSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  )
}
