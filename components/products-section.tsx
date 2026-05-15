import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SectionHeader } from "@/components/layout/section-header"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getAllProducts } from "@/lib/api/server-products"
import { getProductImageUrl } from "@/lib/storage/image-utils"
import { PriceDisplay } from "@/components/common/price-display"
import { ReviewSummary } from "@/components/reviews/review-summary"
import { getProductRatingSummaries } from "@/lib/db/reviews"

export async function ProductsSection() {
  const allProducts = await getAllProducts()
  // Show first 3 products as featured, or all if less than 3
  const products = allProducts.slice(0, 3)
  const summaries = await getProductRatingSummaries(products.map((p) => p.id))
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
        {products.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {products.map((product) => {
            const purity = product.specifications?.purity 
              ? typeof product.specifications.purity === 'string' 
                ? product.specifications.purity 
                : `${product.specifications.purity}%`
              : null
            const imageUrl = getProductImageUrl(product.image, product.images)
            
            return (
              <article
                key={product.id}
                className="group rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:scale-[1.02]"
              >
                {/* Product Image */}
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={`${product.name} peptide vial`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized={imageUrl.includes("supabase")}
                  />
                </div>

                {/* Product Info */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                    {purity && (
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {purity} pure
                      </span>
                    )}
                  </div>
                  {(() => {
                    const s = summaries.get(product.id)
                    return s && s.count > 0 ? (
                      <ReviewSummary count={s.count} average={s.average} size="sm" />
                    ) : null
                  })()}
                  {/* Short Description - DISABLED */}
                  {/* <p className="text-sm leading-relaxed text-muted-foreground">
                    {product.description}
                  </p> */}
                  <div className="flex items-center justify-between pt-2">
                    <PriceDisplay price={product.price} size="lg" />
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
            )
          })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products available at this time.</p>
          </div>
        )}
      </Container>
    </Section>
  )
}
