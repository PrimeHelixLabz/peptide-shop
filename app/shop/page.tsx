import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductGrid } from "@/components/product-grid"
import { getAllProducts, getCategories } from "@/lib/api/server-products"
import { getProductRatingSummaries } from "@/lib/db/reviews"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Shop | PrimeHelix Labz",
  description:
    "Browse our full catalog of research-grade peptides. HPLC verified, pharmaceutical-grade purity. BPC-157, TB-500, GHK-Cu, Ipamorelin, and more.",
  openGraph: {
    title: "Shop | PrimeHelix Labz",
    description:
      "Browse our full catalog of research-grade peptides. HPLC verified, pharmaceutical-grade purity.",
    type: "website",
  },
  alternates: {
    canonical: "/shop",
  },
}

export default async function ShopPage() {
  // Load only initial 12 products for pagination, sorted by name ascending (default)
  const products = await getAllProducts({ limit: 12, offset: 0, sortBy: "name_asc" })
  const categories = await getCategories()

  // Attach rating summaries so product cards can render stars on first paint.
  // Products loaded later via /api/products will fall back to no-rating display
  // until a follow-up batch-fetch is wired through that route.
  const summaries = await getProductRatingSummaries(products.map((p) => p.id))
  const productsWithRatings = products.map((p) => ({
    ...p,
    ratingSummary: summaries.get(p.id),
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        {/* Page Header */}
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Full Catalog"
              title="All products"
              description="Research-grade peptides, rigorously tested and verified. Every compound ships with a full certificate of analysis."
            />
          </Container>
        </Section>

        {/* Product Listing */}
        <Section background="muted" padding="md">
          <Container>
            <ProductGrid initialProducts={productsWithRatings} initialCategories={categories} />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
