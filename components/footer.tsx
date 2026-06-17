import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { TrustpilotLink } from "@/components/trustpilot/trustpilot-link"

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
  { label: "Shipping Policy", href: "/shipping-policy" },
]

// Social / community links. Add a new platform by appending an entry with its
// label, href, brand color, and an SVG icon (24x24 viewBox, fill="currentColor").
const socialLinks: { label: string; href: string; color: string; icon: ReactNode }[] = [
  {
    label: "Discord",
    href: "https://discord.gg/6UFnb6m6w",
    color: "#5865F2", // Discord "blurple"
    icon: (
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.432 3a13.7 13.7 0 0 0-.617 1.27 18.27 18.27 0 0 0-5.631 0A13.7 13.7 0 0 0 8.567 3a19.736 19.736 0 0 0-4.886 1.369C.533 9.046-.32 13.58.106 18.057a19.9 19.9 0 0 0 6.066 3.058 14.7 14.7 0 0 0 1.299-2.111 12.9 12.9 0 0 1-2.045-.978c.172-.126.34-.257.502-.392a14.2 14.2 0 0 0 12.144 0c.164.14.332.27.502.392-.652.385-1.34.713-2.048.979a14.5 14.5 0 0 0 1.3 2.11 19.84 19.84 0 0 0 6.067-3.057c.5-5.19-.838-9.682-3.576-13.688ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
    ),
  },
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
            {/* Plain Trustpilot link — embedded widgets require a paid
                Trustpilot plan; this works on the free tier. Hidden when
                NEXT_PUBLIC_TRUSTPILOT_DOMAIN is unset. */}
            <TrustpilotLink mode="read" />

            {/* Social / community */}
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Join us on ${social.label}`}
                    title={social.label}
                    style={{ "--brand": social.color } as CSSProperties}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-[var(--brand)] transition-colors duration-200 hover:border-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_10%,transparent)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                      className="h-5 w-5"
                    >
                      {social.icon}
                    </svg>
                  </a>
                ))}
              </div>
            )}
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
