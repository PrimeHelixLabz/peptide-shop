import type { Metadata } from "next"
import { Suspense } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Section, Container, PageHeader } from "@/components/layout"

export const metadata: Metadata = {
  title: "Reset Password | PrimeHelix Labz",
  description: "Reset your password",
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7] dark:bg-gray-950">
      <Header />
      <main className="flex-1 flex flex-col gap-20 py-12 md:py-20">
        <Section background="muted" padding="md">
          <Container className="max-w-md">
            <PageHeader
              label="Account"
              title="Reset Password"
              description="Enter your new password below."
              className="mb-8 md:mb-12"
            />
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
          </Container>
        </Section>
      </main>
      <Footer />
    </div>
  )
}
