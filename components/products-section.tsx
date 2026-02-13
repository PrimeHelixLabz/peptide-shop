import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SectionHeader } from "@/components/layout/section-header"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const products = [
  {
    slug: "bpc-157",
    name: "BPC-157",
    description: "A pentadecapeptide composed of 15 amino acids. Widely studied for tissue repair and regenerative research applications.",
    price: "$49.99",
    purity: "99.1%",
    image: "/images/product-bpc157.jpg",
  },
  {
    slug: "tb-500",
    name: "TB-500",
    description: "A synthetic fraction of thymosin beta-4. Investigated for its role in cell migration and wound healing research.",
    price: "$54.99",
    purity: "98.7%",
    image: "/images/product-tb500.jpg",
  },
  {
    slug: "ghk-cu",
    name: "GHK-Cu",
    description: "A naturally occurring copper peptide complex. Researched for its potential in skin biology and tissue remodeling studies.",
    price: "$39.99",
    purity: "99.3%",
    image: "/images/product-ghkcu.jpg",
  },
]

export function ProductsSection() {
  return (
    <Section id="products" background="muted" padding="md">
      <Container>
        <SectionHeader
          label="Featured Compounds"
          title="Our catalog"
          description="Each compound undergoes rigorous HPLC and mass spectrometry analysis to ensure pharmaceutical-grade purity."
          align="center"
          className="mb-12 md:mb-16"
        />

        {/* Product Grid */}
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {products.map((product) => (
            <article
              key={product.name}
              className="group rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:scale-[1.02]"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <Image
                  src={product.image}
                  alt={`${product.name} peptide vial`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>

              {/* Product Info */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {product.purity} pure
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-semibold text-foreground">{product.price}</span>
                  <Link
                    href={`/shop/${product.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:bg-gray-200 active:scale-95 min-h-[48px]"
                  >
                    View Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  )
}
