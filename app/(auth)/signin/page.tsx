import type { Metadata } from "next"
import { Suspense } from "react"
import { SignInForm } from "@/components/auth/signin-form"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "Sign In | Elysian Peptides",
  description: "Sign in to your account to access your orders, wishlist, and more.",
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 md:py-20">
        <div className="w-full max-w-md px-6">
          <div className="rounded-3xl bg-white p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Sign In
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>
            <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
              <SignInForm />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
