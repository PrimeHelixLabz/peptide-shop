import type { Metadata, Viewport } from 'next'
import { Inter, DM_Serif_Display } from 'next/font/google'
import { CartProvider } from '@/lib/cart-context'
import { WishlistProvider } from '@/lib/wishlist-context'
import { AuthProvider } from '@/lib/auth/auth-context'
import { Toaster } from '@/components/ui/sonner'

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
  title: 'Elysian Peptides | Premium Research-Grade Peptides',
  description:
    'Pharmaceutical-grade peptides for advanced research. Lab-tested purity, secure checkout, and fast shipping. Trusted by researchers worldwide.',
  keywords: ['peptides', 'research peptides', 'BPC-157', 'TB-500', 'GHK-Cu', 'pharmaceutical grade'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Elysian Peptides | Premium Research-Grade Peptides',
    description: 'Pharmaceutical-grade peptides for advanced research. Lab-tested purity, secure checkout, and fast shipping.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
              <Toaster />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
