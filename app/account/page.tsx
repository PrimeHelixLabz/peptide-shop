import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AccountProfile } from "@/components/account/account-profile"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "My Account | PrimeHelix Labz",
  description: "Manage your account settings, profile information, and address.",
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7] dark:bg-gray-950">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container>
            <PageHeader
              label="Account"
              title="My Account"
              description="Manage your profile information, address, and account settings."
              className="mb-8 md:mb-12"
            />
            <AccountProfile />
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
