import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AboutHero } from "@/components/about-hero"
import { AboutMission } from "@/components/about-mission"
import { AboutQuality } from "@/components/about-quality"
import { AboutShipping } from "@/components/about-shipping"

export const metadata: Metadata = {
  title: "About Us | PrimeHelix Labz",
  description:
    "Learn about PrimeHelix Labz — our mission, quality testing process, and shipping practices. Premium research-grade peptides trusted by scientists worldwide.",
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <AboutHero />
        <AboutMission />
        <AboutQuality />
        <AboutShipping />
      </main>
      <Footer />
    </div>
  )
}
