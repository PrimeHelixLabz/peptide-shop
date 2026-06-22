import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductDetailView } from "@/components/product-detail"
import { RelatedProducts } from "@/components/related-products"
import { ProductReviews } from "@/components/reviews/product-reviews"
import { getProductBySlug, getRelatedProducts } from "@/lib/api/server-products"
import {
  getProductReviews,
  getProductRatingSummary,
} from "@/lib/db/reviews"
import { stripHtmlToPlainText } from "@/lib/blog/sanitize"
import {
  MERCHANT_RETURN_POLICY,
  OFFER_SHIPPING_DETAILS,
} from "@/lib/seo/product-offer"

// Search-engine-friendly description length. Google truncates at ~160 chars
// in SERPs; we keep a small safety margin to avoid mid-word cuts.
const META_DESCRIPTION_MAX = 155

function truncateForMeta(text: string): string {
  const collapsed = text.replace(/\s+/g, " ").trim()
  if (collapsed.length <= META_DESCRIPTION_MAX) return collapsed
  // Cut at the last word boundary inside the budget so we don't end mid-word.
  const slice = collapsed.slice(0, META_DESCRIPTION_MAX)
  const lastSpace = slice.lastIndexOf(" ")
  return (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…"
}

/**
 * Pick the best available meta description for a product. Preference order:
 *   1. The hand-written `description` (the "Meta Description (SEO)" admin field).
 *   2. The longDescription HTML, stripped and truncated.
 *   3. A templated default built from name + category.
 *
 * Prefer a hand-written, per-product description: the truncated longDescription
 * fallback is generic and Google/Bing treat it as low-quality (a contributor to
 * "Crawled - currently not indexed"). Returning a non-empty string here is also
 * critical — Bing Webmaster flags any product page with a missing description.
 */
function pickProductMetaDescription(product: {
  name: string
  description?: string
  longDescription?: string
  category?: string
}): string {
  const direct = product.description?.trim()
  if (direct) return truncateForMeta(direct)

  if (product.longDescription) {
    const fromLong = stripHtmlToPlainText(product.longDescription)
    if (fromLong) return truncateForMeta(fromLong)
  }

  const category = product.category ? `${product.category} peptide` : "research peptide"
  return truncateForMeta(
    `${product.name} — pharmaceutical-grade ${category} from PrimeHelix Labz. Lab-tested purity, HPLC-verified, ships with a Certificate of Analysis. For research use only.`
  )
}

interface PageProps {
  params: Promise<{ slug: string }>
}

// Use ISR to avoid build-time timeouts while still allowing caching.
// 5-minute cap matches /shop and / — it bounds staleness for data that
// changes outside admin mutations (stock decrements from orders, webhook
// inventory restores). Admin content edits revalidate on demand via
// lib/revalidate-shop.ts.
export const revalidate = 300
export const dynamicParams = true // Allow dynamic params not in generateStaticParams

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    return {
      title: "Product Not Found | PrimeHelix Labz",
    }
  }

  const heroImage = product.images?.[0] || product.image
  const metaDescription = pickProductMetaDescription(product)

  return {
    title: `${product.name} | PrimeHelix Labz`,
    description: metaDescription,
    openGraph: {
      title: `${product.name} | PrimeHelix Labz`,
      description: metaDescription,
      type: "website",
      images: [{ url: heroImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | PrimeHelix Labz`,
      description: metaDescription,
      images: [heroImage],
    },
    alternates: {
      canonical: `/shop/${slug}`,
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const [related, reviews, ratingSummary] = await Promise.all([
    getRelatedProducts(product.id, 3),
    getProductReviews(product.id, { limit: 50 }),
    getProductRatingSummary(product.id),
  ])

  // JSON-LD structured data using only real product fields
  const lowestPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price
  const highestPrice = product.variants?.length
    ? Math.max(...product.variants.map((v) => v.price))
    : product.price

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images?.[0] || product.image,
    url: `https://www.primehelixlabz.com/shop/${slug}`,
    sku: product.variants?.[0]?.sku || product.id,
    brand: {
      "@type": "Brand",
      name: "PrimeHelix Labz",
    },
    offers: product.variants && product.variants.length > 1
      ? {
          "@type": "AggregateOffer",
          lowPrice: lowestPrice,
          highPrice: highestPrice,
          priceCurrency: "USD",
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          offerCount: product.variants.length,
          hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY,
          shippingDetails: OFFER_SHIPPING_DETAILS,
        }
      : {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "USD",
          availability: product.inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY,
          shippingDetails: OFFER_SHIPPING_DETAILS,
        },
    ...(product.category && {
      category: product.category,
    }),
  }

  if (ratingSummary.count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingSummary.average,
      reviewCount: ratingSummary.count,
      bestRating: 5,
      worstRating: 1,
    }
    // Include up to the 5 most recent reviews in structured data so search
    // engines can surface review snippets without needing to crawl the page.
    jsonLd.review = reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.customerName },
      datePublished: r.createdAt,
      name: r.title,
      reviewBody: r.body,
    }))
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.primehelixlabz.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: "https://www.primehelixlabz.com/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `https://www.primehelixlabz.com/shop/${slug}`,
      },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <ProductDetailView product={product} ratingSummary={ratingSummary} />
        </div>

        {/* Reviews */}
        <section className="bg-[#f6f6f7]">
          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <ProductReviews
              productId={product.id}
              productName={product.name}
              productSlug={slug}
              initialReviews={reviews}
              summary={ratingSummary}
            />
          </div>
        </section>

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
