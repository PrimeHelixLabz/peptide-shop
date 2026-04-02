import { MetadataRoute } from 'next'
import { getAllProducts } from '@/lib/api/server-products'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://primehelixlabz.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/shipping-policy`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  try {
    const products = await getAllProducts()
    productPages = products.map((product) => ({
      url: `${BASE_URL}/shop/${product.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // If product fetch fails, sitemap still returns static pages
  }

  return [...staticPages, ...productPages]
}
