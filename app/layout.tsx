import type { Metadata, Viewport } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { CartProvider } from '@/lib/cart-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Toaster } from '@/components/ui/sonner'
import { NewsletterPopup } from '@/components/newsletter-popup'
import { AgeVerification } from '@/components/age-verification'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.primehelixlabz.com'),
  title: 'PrimeHelix Labz | Premium Research-Grade Peptides',
  description:
    'Pharmaceutical-grade peptides for advanced research. Lab-tested purity, secure checkout, and fast shipping. Trusted by researchers worldwide.',
  keywords: ['peptides', 'research peptides', 'BPC-157', 'TB-500', 'GHK-Cu', 'pharmaceutical grade'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'PrimeHelix Labz | Premium Research-Grade Peptides',
    description: 'Pharmaceutical-grade peptides for advanced research. Lab-tested purity, secure checkout, and fast shipping.',
    type: 'website',
    siteName: 'PrimeHelix Labz',
    locale: 'en_US',
    url: 'https://www.primehelixlabz.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrimeHelix Labz | Premium Research-Grade Peptides',
    description: 'Pharmaceutical-grade peptides for advanced research. Lab-tested purity, secure checkout, and fast shipping.',
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    other: {
      'msvalidate.01': 'B4C2184A3984318ED4F6E81742D422CF',
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PrimeHelix Labz',
  url: 'https://www.primehelixlabz.com',
  logo: 'https://www.primehelixlabz.com/logo.webp',
  description:
    'Pharmaceutical-grade research peptides with third-party HPLC purity testing. For in-vitro and laboratory research only.',
  sameAs: [],
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'PrimeHelix Labz',
  url: 'https://www.primehelixlabz.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.primehelixlabz.com/shop?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {/* Age verification renders modally for unverified visitors
                  on any public page — direct-link landings on /shop or
                  /checkout don't bypass it. */}
              <AgeVerification />
              {children}
              <NewsletterPopup />
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
