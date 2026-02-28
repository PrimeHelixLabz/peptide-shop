import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  shop: [
    { href: "#", label: "All Products" },
    { href: "#", label: "Bestsellers" },
    { href: "#", label: "New Arrivals" },
  ],
  company: [
    { href: "#", label: "About Us" },
    { href: "#", label: "Research" },
    { href: "#", label: "Careers" },
  ],
  support: [
    { href: "#", label: "FAQ" },
    { href: "#", label: "Shipping" },
    { href: "#", label: "Contact" },
  ],
  legal: [
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
  ],
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="relative h-10 sm:h-12 w-auto shrink-0" style={{ aspectRatio: '196/70' }}>
                <Image
                  src="/logo.webp"
                  alt="PrimeHelix Labz"
                  width={196}
                  height={70}
                  className="object-contain h-10 sm:h-12 w-auto"
                  sizes="(max-width: 640px) 112px, 134px"
                />
              </div>
              <span className="text-sm sm:text-base font-semibold uppercase tracking-[0.2em] text-background">
                PrimeHelix Labz
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-background/60">
              Premium research-grade peptides. Synthesized with precision, delivered with care.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-background/40">
                {category}
              </h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/60 transition-colors hover:text-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 md:flex-row">
          <p className="text-xs text-background/40">
            {'2026 PrimeHelix Labz. All rights reserved. For research use only.'}
          </p>
          <p className="text-xs text-background/40">
            These products are not intended for human consumption.
          </p>
        </div>
      </div>
    </footer>
  )
}
