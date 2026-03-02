"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Modal, ModalHeader, ModalContent, ModalFooter } from "@/components/ui/modal"
import { useAuth } from "@/lib/auth/auth-context"

export function AgeVerification() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    // Wait for auth to resolve before deciding whether to show the gate
    if (authLoading) return

    // If the authenticated user has already verified their age in the database, skip the modal
    if (user?.ageVerified) {
      setIsVerified(true)
      setIsOpen(false)
      return
    }

    // For guests or users without age verification, show the popup
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [authLoading, user?.ageVerified])

  const handleAgree = () => {
    if (!ageConfirmed || !termsAccepted) return

    // Close the dialog immediately for a snappy UX
    setIsVerified(true)
    setIsOpen(false)

    // If a user is logged in, persist verification to their profile in the database
    if (user) {
      ;(async () => {
        try {
          const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ageVerified: true }),
          })

          if (!response.ok) {
            console.error("Failed to persist age verification")
            return
          }

          // Refresh auth user so ageVerified is reflected across the app
          await refreshUser()
        } catch (error) {
          console.error("Error updating age verification:", error)
        }
      })()
    }
  }

  const handleExit = () => {
    // Redirect to a safe page
    window.location.href = "https://www.google.com"
  }

  // Don't render anything if verified
  if (isVerified) return null

  const canProceed = ageConfirmed && termsAccepted

  return (
    <Modal
      isOpen={isOpen}
      preventClose={true}
      preventBackgroundScroll={true}
      zIndex={100}
    >
      <ModalHeader>
        <div className="flex items-center justify-center gap-3">
          <div className="relative h-8 w-8 md:h-10 md:w-10 shrink-0">
            <Image
              src="/logo-1.webp"
              alt="PrimeHelix Labz"
              fill
              className="object-contain"
              sizes="40px"
            />
          </div>
          <h2 className="text-md md:text-2xl font-bold text-foreground">
            Age Verification Required
          </h2>
        </div>
      </ModalHeader>

      <ModalContent>
        {/* Intro Text */}
        <p className="mb-6 text-base text-muted-foreground">
          This website is restricted. To continue, please confirm you meet the minimum age requirement and accept the agreement below.
        </p>

        {/* Checkboxes */}
        <div className="mb-6 space-y-4">
          {/* Age Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="age-confirm"
              checked={ageConfirmed}
              onCheckedChange={(checked) => setAgeConfirmed(checked === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="age-confirm"
              className="flex-1 cursor-pointer text-sm leading-relaxed text-foreground"
            >
              I confirm I am 18+ years of age or older.
            </label>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms-accept"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5"
            />
            <label
              htmlFor="terms-accept"
              className="flex-1 cursor-pointer text-sm leading-relaxed text-foreground"
            >
              I agree that products and information on this website are provided for{" "}
              <strong>laboratory research use only</strong> and are{" "}
              <strong>not intended for use in or on humans or animals</strong>. I will not use any products or information from this website for{" "}
              <strong>diagnosis, treatment, cure, or prevention</strong> of any condition. I agree to follow applicable laws and regulations, and I agree to the{" "}
              <Link
                href="#"
                className="font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>
        </div>

        {/* Final Disclaimer */}
        <p className="mb-6 text-sm text-muted-foreground">
          By clicking "I Agree & Enter", you confirm the statements above and acknowledge responsibility for compliance with applicable laws and regulations.
        </p>
      </ModalContent>

      <ModalFooter>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleExit}
            variant="destructive"
            className="flex-1 sm:flex-none sm:min-w-[120px]"
            size="lg"
          >
            EXIT
          </Button>
          <Button
            onClick={handleAgree}
            disabled={!canProceed}
            className="flex-1 sm:flex-1"
            size="lg"
          >
            I AGREE & ENTER
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
