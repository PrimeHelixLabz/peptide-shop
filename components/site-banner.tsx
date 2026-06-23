import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"

interface SiteBannerProps {
  title?: string
  message?: string
}

/**
 * Admin-editable homepage announcement (replaces the old hard-coded
 * VacationNotice). Content comes from the `site_banner` table; the homepage
 * only renders this when the banner is enabled, so we just need at least a
 * title or a message to show something.
 */
export function SiteBanner({ title, message }: SiteBannerProps) {
  if (!title?.trim() && !message?.trim()) return null

  return (
    <Section background="muted" padding="sm">
      <Container>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8 text-center shadow-sm">
          {title?.trim() && (
            <h2 className="text-lg md:text-xl font-semibold text-amber-900">
              {title}
            </h2>
          )}
          {message?.trim() && (
            <p className="mt-2 text-sm md:text-base text-amber-800 whitespace-pre-line">
              {message}
            </p>
          )}
        </div>
      </Container>
    </Section>
  )
}
