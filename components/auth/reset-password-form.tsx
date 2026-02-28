"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth/auth-context"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirm: false,
  })
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  // Check if user is authenticated (from the reset link)
  useEffect(() => {
    // The reset link should have authenticated the user
    // If not authenticated after loading, redirect to forgot password
    if (!authLoading && !user) {
      toast.error("Invalid or expired reset link. Please request a new password reset.")
      router.push("/forgot-password")
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        toast.success("Password reset successfully!")
        // Redirect to sign in after 2 seconds
        setTimeout(() => {
          router.push("/signin")
        }, 2000)
      } else {
        toast.error(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Reset password error:", error)
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
              Password Reset Successful
            </h3>
            <p className="text-sm text-muted-foreground">
              Your password has been reset. Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl bg-white dark:bg-gray-900 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPasswords.password ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              required
              minLength={8}
              disabled={loading}
              className="rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, password: !showPasswords.password })
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords.password ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showPasswords.confirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              disabled={loading}
              className="rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="w-full rounded-2xl"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Reset Password
            </>
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <Link
            href="/signin"
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </form>
  )
}
