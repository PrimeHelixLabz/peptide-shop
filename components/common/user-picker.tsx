"use client"

/**
 * UserPicker — searchable combobox for selecting a customer/user.
 *
 * Differs from `Select` (which is for fixed enum options) — this hits an
 * admin API to search by name OR email and shows both in the results so
 * an admin can identify the right person at a glance.
 *
 * Designed for admin-only contexts; uses /api/admin/users/search which
 * requires admin auth.
 *
 * Usage:
 *   <UserPicker
 *     value={userId}
 *     onChange={(id, user) => setForm(...)}
 *     label="Lock to user"
 *     helperText="Customer who can redeem this code."
 *   />
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { ChevronDown, Loader2, Search, X, User } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface PickerUser {
  id: string
  name: string
  email: string
}

interface UserPickerProps {
  value: string | null
  /**
   * Fires when selection changes. `user` is the full record on selection,
   * and `null` when the admin clears the value.
   */
  onChange: (id: string | null, user: PickerUser | null) => void
  label?: string
  helperText?: string
  error?: string
  placeholder?: string
  disabled?: boolean
}

const SEARCH_DEBOUNCE_MS = 200

export function UserPicker({
  value,
  onChange,
  label,
  helperText,
  error,
  placeholder = "Search by name or email…",
  disabled = false,
}: UserPickerProps) {
  const reactId = useId()
  const fieldId = `user-picker-${reactId}`

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PickerUser[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PickerUser | null>(null)
  const [hydrating, setHydrating] = useState(false)

  // Cancel in-flight searches when a newer one starts. Without this the
  // last response can overwrite a fresher one if the network reorders.
  const searchAbortRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Hydrate the trigger when value is set but we don't yet know the user ── */
  useEffect(() => {
    if (!value) {
      setSelected(null)
      return
    }
    if (selected?.id === value) return
    let cancelled = false
    setHydrating(true)
    fetch(`/api/admin/users/search?ids=${encodeURIComponent(value)}`)
      .then((r) => r.json())
      .then((data: { users?: PickerUser[] }) => {
        if (cancelled) return
        const u = data.users?.[0]
        setSelected(u ?? null)
      })
      .catch(() => {
        if (!cancelled) setSelected(null)
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })
    return () => {
      cancelled = true
    }
    // We intentionally don't depend on `selected` — the guard above
    // handles the no-op case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  /* ── Debounced search ── */
  useEffect(() => {
    if (!open) return

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      const q = query.trim()
      if (!q) {
        setResults([])
        setSearching(false)
        return
      }
      // Abort any older inflight request
      searchAbortRef.current?.abort()
      const ctrl = new AbortController()
      searchAbortRef.current = ctrl
      setSearching(true)
      fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((data: { users?: PickerUser[] }) => {
          setResults(data.users ?? [])
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("user search failed:", err)
            setResults([])
          }
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [query, open])

  // When the popover closes, reset transient state.
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setSearching(false)
      searchAbortRef.current?.abort()
    }
  }, [open])

  const pick = useCallback(
    (user: PickerUser) => {
      setSelected(user)
      onChange(user.id, user)
      setOpen(false)
    },
    [onChange]
  )

  const clear = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation()
      setSelected(null)
      onChange(null, null)
    },
    [onChange]
  )

  const triggerLabel = useMemo(() => {
    if (hydrating) return "Loading…"
    if (selected) return selected.name || selected.email || selected.id
    return placeholder
  }, [hydrating, selected, placeholder])

  const isPlaceholder = !selected && !hydrating

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80"
        >
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            className={cn(
              "relative flex h-12 w-full items-center gap-3 rounded-xl bg-white dark:bg-gray-900 border border-border/60 dark:border-white/10 px-4 pr-10 text-sm text-foreground shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] outline-none transition-[colors,border-color,box-shadow] hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-border focus-visible:border-brand-primary/40 focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive ring-2 ring-destructive"
            )}
          >
            <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span
              className={cn(
                "flex-1 truncate text-left",
                isPlaceholder && "text-muted-foreground"
              )}
            >
              {triggerLabel}
            </span>
            {selected && !hydrating && (
              <span
                role="button"
                tabIndex={-1}
                onClick={clear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    clear()
                  }
                }}
                className="absolute right-9 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] p-0 border-border/60"
        >
          <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name or email…"
              className="h-8 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search users"
            />
            {searching && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
          </div>

          <div role="listbox" className="max-h-72 overflow-y-auto py-1">
            {query.trim().length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                Type to search customers.
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {searching ? "Searching…" : "No customers match that search."}
              </div>
            ) : (
              results.map((user) => {
                const isCurrent = value === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={() => pick(user)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      isCurrent && "bg-accent/60"
                    )}
                  >
                    <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        {user.name || "(no name)"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email || "(no email)"}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {selected && (
            <div className="border-t border-border/50 px-3 py-2">
              <button
                type="button"
                onClick={() => clear()}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear selection
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground/80 leading-snug">{helperText}</p>
      )}
    </div>
  )
}
