import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductDetailView } from "@/components/product-detail"
import { RelatedProducts } from "@/components/related-products"
import { getProductBySlug, getRelatedProducts, getAllProducts } from "@/lib/api/server-products"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const products = await getAllProducts()
    return products.map((product) => ({
      slug: product.slug,
    }))
  } catch (error) {
    // If static generation fails, return empty array
    // Page will be generated on-demand
    console.error("Error generating static params:", error)
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return {
      title: "Product Not Found | PrimeHelix Labz",
    }
  }

  return {
    title: `${product.name} | PrimeHelix Labz`,
    description: product.description,
    openGraph: {
      title: `${product.name} | PrimeHelix Labz`,
      description: product.description,
      type: "website",
      images: [{ url: product.images?.[0] || product.image }],
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const related = await getRelatedProducts(product.id, 3)

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <ProductDetailView product={product} />
        </div>

        {/* Related Products */}
        <section className="bg-[#f6f6f7]">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <RelatedProducts products={related} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
