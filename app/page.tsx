import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProductsSection } from "@/components/products-section"
import { BenefitsSection } from "@/components/benefits-section"
import { TrustSection } from "@/components/trust-section"
import { Footer } from "@/components/footer"
import { AgeVerification } from "@/components/age-verification"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <AgeVerification />
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <HeroSection />
        <ProductsSection />
        <BenefitsSection />
        <TrustSection />
      </main>
      <Footer />
    </div>
  )
}
