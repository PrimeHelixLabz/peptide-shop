import type { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = {
  title: "Forgot Password | PrimeHelix Labz",
  description: "Reset your password",
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <div className="mb-8 text-center">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Account
              </span>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Forgot Password
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            <ForgotPasswordForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
