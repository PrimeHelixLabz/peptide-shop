import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import type { ProductDetail } from "@/lib/products"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { getProductImageUrl } from "@/lib/storage"

export function RelatedProducts({ products }: { products: ProductDetail[] }) {
  if (products.length === 0) return null

  return (
    <section className="flex flex-col gap-8">
      <SectionHeader
        label="Related"
        title="You may also like"
        action={
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/shop">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {products.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.slug}`}
              className="group block"
            >
            <article className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:scale-[1.02]">
              {/* Image */}
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <Image
                  src={getProductImageUrl(product.image, product.images)}
                  alt={`${product.name} peptide vial`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized={getProductImageUrl(product.image, product.images).includes("supabase")}
                />
                {!product.inStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl">
                    <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Out of Stock
                    </span>
                  </div>
                )}
                {product.category && (
                  <div className="absolute left-3 top-3">
                    <span className="bg-white/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground backdrop-blur-sm rounded-xl">
                      {product.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {product.name}
                  </h3>
                  {product.specifications?.purity && (
                    <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {String(product.specifications.purity)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xl font-semibold text-foreground">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-2 text-sm font-medium text-foreground transition-all duration-300 group-hover:bg-gray-200 min-h-[48px]">
                    View Details
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Mobile View All */}
      <Button variant="outline" size="sm" asChild className="sm:hidden">
        <Link href="/shop">
          View all products
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </section>
  )
}
