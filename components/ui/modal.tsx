"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  className?: string
  overlayClassName?: string
  preventClose?: boolean
  preventBackgroundScroll?: boolean
  zIndex?: number
}

export function Modal({
  isOpen,
  onClose,
  children,
  className,
  overlayClassName,
  preventClose = false,
  preventBackgroundScroll = true,
  zIndex = 100,
}: ModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen && preventBackgroundScroll) {
      // Save the current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen, preventBackgroundScroll])

  // Handle escape key
  useEffect(() => {
    if (!isOpen || preventClose || !onClose) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, preventClose, onClose])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4",
        overlayClassName
      )}
      style={{ zIndex }}
      onClick={preventClose ? undefined : onClose}
    >
      <div
        className={cn(
          "flex h-full max-h-screen w-full max-w-lg flex-col rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] sm:h-auto sm:max-h-[90vh]",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-gray-200 bg-white px-4 md:px-6 py-4 sm:px-8 sm:py-6 rounded-t-3xl",
        className
      )}
    >
      {children}
    </div>
  )
}

interface ModalContentProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

export function ModalContent({
  children,
  className,
  scrollable = true,
}: ModalContentProps) {
  return (
    <div
      className={cn(
        scrollable && "flex-1 overflow-y-auto",
        "px-6 py-4 sm:px-8 sm:py-6",
        className
      )}
    >
      {children}
    </div>
  )
}

interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "border-t border-gray-200 bg-white px-6 py-4 sm:px-8 sm:py-6 rounded-b-3xl",
        className
      )}
    >
      {children}
    </div>
  )
}
