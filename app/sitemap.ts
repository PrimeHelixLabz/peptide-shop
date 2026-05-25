import { MetadataRoute } from 'next'
import { getAllProducts } from '@/lib/api/server-products'
import { getPublishedPosts } from '@/lib/blog/db'

// Cache sitemap for 1 hour. Product/blog data refreshes within that window;
// avoids hitting Supabase on every Googlebot fetch.
export const revalidate = 3600

const BASE_URL = 'https://www.primehelixlabz.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/affiliates`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/shipping-policy`,
      lastModified: now,
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

  // Blog post pages
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = await getPublishedPosts()
    blogPages = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    // If blog fetch fails, sitemap still returns the rest.
  }

  return [...staticPages, ...productPages, ...blogPages]
}
