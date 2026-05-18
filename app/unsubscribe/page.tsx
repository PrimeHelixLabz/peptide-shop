import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Section, Container } from "@/components/layout"
import { UnsubscribeForm } from "@/components/unsubscribe-form"

export const metadata: Metadata = {
  title: "Unsubscribe | PrimeHelix Labz",
  description: "Unsubscribe from PrimeHelix Labz emails.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/unsubscribe" },
}

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { email, token } = await searchParams

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <div className="mx-auto max-w-md rounded-3xl bg-card text-card-foreground p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] md:p-10">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Unsubscribe
              </h1>
              {!email || !token ? (
                <p className="mt-4 text-sm text-muted-foreground md:text-base">
                  This unsubscribe link is missing required parameters. Use the
                  unsubscribe link in any email we&rsquo;ve sent you.
                </p>
              ) : (
                <UnsubscribeForm email={email} token={token} />
              )}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
