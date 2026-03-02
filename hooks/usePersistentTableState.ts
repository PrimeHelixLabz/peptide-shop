"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

/**
 * Persist arbitrary table state (filters, pagination, etc.) in sessionStorage
 * scoped to the current pathname.
 */
export function usePersistentTableState<TState extends object>(
  storageKeyPrefix: string,
  defaultState: TState
) {
  const pathname = usePathname()
  const [state, setState] = useState<TState>(() => {
    if (typeof window === "undefined") return defaultState
    const key = `${storageKeyPrefix}:${pathname ?? ""}`
    const raw = sessionStorage.getItem(key)
    if (!raw) return defaultState
    try {
      const parsed = JSON.parse(raw) as TState
      return { ...defaultState, ...parsed }
    } catch {
      return defaultState
    }
  })

  useEffect(() => {
    if (!pathname) return
    const key = `${storageKeyPrefix}:${pathname}`
    try {
      sessionStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Ignore write errors
    }
  }, [pathname, state, storageKeyPrefix])

  return [state, setState] as const
}

