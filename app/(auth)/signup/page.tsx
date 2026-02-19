import type { Metadata } from "next"
import { SignUpForm } from "@/components/auth/signup-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Sign Up | PrimeHelix Labz",
  description: "Create a new account to start shopping for research-grade peptides.",
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Create Account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign up to start shopping for research-grade peptides
              </p>
            </div>
            <SignUpForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
