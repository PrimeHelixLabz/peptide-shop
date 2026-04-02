import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { FaqAccordion } from "@/components/faq-accordion"

export const metadata: Metadata = {
  title: "FAQ | PrimeHelix Labz",
  description:
    "Find answers to common questions about PrimeHelix Labz, including product usage, purity testing, shipping, storage, and return policies.",
  alternates: {
    canonical: "/faq",
  },
}

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <FaqAccordion />
      </main>
      <Footer />
    </div>
  )
}
