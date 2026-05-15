import Link from "next/link"
import Image from "next/image"

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Shipping Policy", href: "/shipping-policy" },
]

const siteLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/orders" },
  { label: "Affiliate Program", href: "/affiliates" },
]

export function Footer() {
  return (
    <footer id="footer" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand Column */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="relative h-14 sm:h-16 w-14 sm:w-16 shrink-0">
                <Image
                  src="/logo-1.webp"
                  alt="PrimeHelix Labz"
                  width={64}
                  height={64}
                  className="object-contain h-14 sm:h-16 w-14 sm:w-16"
                  sizes="(max-width: 640px) 56px, 64px"
                />
              </div>
              <span className="text-base sm:text-lg font-semibold uppercase text-foreground">
                PrimeHelix Labz
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Premium research-grade peptides for advanced scientific inquiry.
              Precision, purity, and reliability in every vial.
            </p>
            <address className="max-w-xs text-sm not-italic leading-relaxed text-muted-foreground">
              20403 N Lake Pleasant RD, Suite 117
              <br />
              Peoria, AZ 85382
              <br />
              <a
                href="tel:+16026334729"
                className="transition-colors hover:text-foreground"
              >
                +1 (602) 633-4729
              </a>
            </address>
          </div>

          {/* Navigation Column */}
          <div className="flex flex-col gap-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Navigate
            </span>
            <nav className="flex flex-col gap-2.5" aria-label="Footer navigation">
              {siteLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Policy Column */}
          <div className="flex flex-col gap-5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Legal
            </span>
            <nav className="flex flex-col gap-2.5" aria-label="Legal links">
              {policyLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-xs text-muted-foreground">
            {'All products are sold strictly for research purposes only. Not for human consumption. \u00A9 2026 PrimeHelix Labz. All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
