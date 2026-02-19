import Link from "next/link"
import Image from "next/image"

const policyLinks = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Refund Policy", href: "#" },
  { label: "Shipping Policy", href: "#" },
]

const siteLinks = [
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/orders" },
]

export function Footer() {
  return (
    <footer id="footer" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-12 md:py-16">
        <div className="grid gap-12 md:grid-cols-3">
          {/* Brand Column */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5">
              <div className="relative h-12 w-24 shrink-0">
                <Image
                  src="/logo.webp"
                  alt="PrimeHelix Labz"
                  fill
                  className="object-contain"
                  sizes="120px"
                />
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Premium research-grade peptides for advanced scientific inquiry.
              Precision, purity, and reliability in every vial.
            </p>
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
