"use client"

import type { ReactNode } from "react"
import { useScrollRestoration } from "@/hooks/useScrollRestoration"

interface ShopScrollProviderProps {
  children: ReactNode
}

export function ShopScrollProvider({ children }: ShopScrollProviderProps) {
  // Use a dedicated key so it doesn't clash with admin pages
  useScrollRestoration("shop-scroll")
  return <>{children}</>
}

