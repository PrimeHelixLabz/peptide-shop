"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast.success(data.message || "Password reset email sent!")
      } else {
        toast.error(data.error || "Failed to send reset email")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Check Your Email
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full mt-6">
            <Button
              onClick={() => router.push("/signin")}
              variant="outline"
              className="w-full rounded-2xl"
            >
              Back to Sign In
            </Button>
            <Button
              onClick={() => {
                setSuccess(false)
                setEmail("")
              }}
              className="w-full rounded-2xl"
            >
              Send Another Email
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Enter the email address associated with your account.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded-2xl"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            href="/signin"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Sign in
          </Link>
        </div>
      </div>
    </form>
  )
}
