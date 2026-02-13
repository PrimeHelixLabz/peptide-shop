import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <Section background="muted" padding="md" className="relative overflow-hidden">
      <Container>
        <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 p-10 md:p-16 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Text Content */}
            <div className="flex flex-col gap-6">
              <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Research-Grade Peptides
              </span>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl text-balance">
                Precision in every molecule
              </h1>
              <p className="max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
                Pharmaceutical-grade peptides engineered for advanced research.
                Rigorously tested for purity. Trusted by scientists worldwide.
              </p>
              <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
                <Button asChild>
                  <Link href="/shop">
                    Explore Products
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/#benefits">Learn More</Link>
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl lg:aspect-square">
              <Image
                src="/images/hero-lab.jpg"
                alt="Precision laboratory setting with research-grade peptide vials"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
