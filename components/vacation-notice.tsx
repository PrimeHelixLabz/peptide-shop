import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"

export function VacationNotice() {
  return (
    <Section background="muted" padding="sm">
      <Container>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8 text-center shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-amber-900">
            Temporary Shipping Delay
          </h2>
          <p className="mt-2 text-sm md:text-base text-amber-800">
            Orders placed between April 21 and April 27 will be processed on April 28.
            Thank you for your patience.
          </p>
        </div>
      </Container>
    </Section>
  )
}