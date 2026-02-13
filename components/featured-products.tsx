import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

const products = [
  {
    name: "BPC-157",
    category: "Recovery",
    price: "$49.99",
    purity: "99.1%",
    image: "/images/product-bpc157.jpg",
    description: "Advanced body-protective compound for targeted tissue research applications.",
  },
  {
    name: "TB-500",
    category: "Regeneration",
    price: "$54.99",
    purity: "98.7%",
    image: "/images/product-tb500.jpg",
    description: "Thymosin beta-4 fragment for cellular migration and regeneration studies.",
  },
  {
    name: "GHK-Cu",
    category: "Anti-Aging",
    price: "$39.99",
    purity: "99.3%",
    image: "/images/product-ghk-cu.jpg",
    description: "Copper peptide complex for advanced dermal and wound-healing research.",
  },
]

export function FeaturedProducts() {
  return (
    <section id="shop" className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Featured
            </p>
            <h2 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">
              Our Bestsellers
            </h2>
          </div>
          <Link
            href="#shop"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
          >
            View All Products
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="group flex flex-col border border-border bg-background transition-colors hover:border-foreground/20"
            >
              <div className="relative aspect-square overflow-hidden bg-muted">
                <Image
                  src={product.image}
                  alt={`${product.name} peptide vial`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <span className="absolute left-4 top-4 bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-foreground">
                  {product.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {product.name}
                  </h3>
                  <span className="text-sm font-semibold text-foreground">{product.price}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Purity: {product.purity}
                  </span>
                  <Link
                    href="#"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:text-muted-foreground"
                  >
                    Details
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
