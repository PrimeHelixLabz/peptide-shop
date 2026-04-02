import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/cart',
          '/checkout',
          '/account',
          '/orders/',
          '/wishlist',
          '/forgot-password',
          '/reset-password',
          '/signin',
          '/signup',
          '/payments/',
        ],
      },
    ],
    sitemap: 'https://primehelixlabz.com/sitemap.xml',
  }
}
