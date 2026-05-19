"use client"

/**
 * Select - the project's single dropdown primitive.
 *
 * One component covers both labeled form fields and bare toolbar filters:
 *  - pass `label` / `error` / `helperText` and the outer column lays itself out
 *  - pass none of them and you get just the trigger, sized to its content
 *
 * Pass `name` to emit a hidden <input> for native FormData submission
 * (used by the contact form, which is uncontrolled).
 */

import * as React from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void

  label?: string
  error?: string
  helperText?: string

  placeholder?: string
  disabled?: boolean
  required?: boolean

  /** When set, renders a hidden <input> mirroring the value so the field
   *  participates in native <form> submissions / FormData. */
  name?: string

  id?: string
  wrapperClassName?: string
  triggerClassName?: string
  contentClassName?: string

  "aria-label"?: string
}

export function Select({
  options,
  value,
  defaultValue,
  onChange,
  label,
  error,
  helperText,
  placeholder,
  disabled = false,
  required = false,
  name,
  id,
  wrapperClassName,
  triggerClassName,
  contentClassName,
  "aria-label": ariaLabel,
}: SelectProps) {
  const reactId = React.useId()
  const fieldId = id || `select-${reactId}`
  const listboxId = `${fieldId}-listbox`

  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<string>(
    defaultValue ?? ""
  )
  const current = isControlled ? value : internalValue

  const [open, setOpen] = React.useState(false)
  const [highlighted, setHighlighted] = React.useState<number>(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  // Popover is portaled to <body> so overflow:hidden parents (admin tables,
  // cards) can't clip it. We re-measure on open and whenever the viewport
  // changes so the popover tracks the trigger.
  const [position, setPosition] = React.useState<{
    top: number
    left: number
    width: number
    placement: "bottom" | "top"
  } | null>(null)

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const margin = 8
    const popoverMaxHeight = 288 // matches max-h-72 below
    const spaceBelow = window.innerHeight - rect.bottom - margin
    const spaceAbove = rect.top - margin
    // Flip up only when the popover wouldn't fit below AND there's more
    // room above. Keeps the default "drop down" behavior for the common
    // case where the trigger is near the top of the page.
    const placement: "bottom" | "top" =
      spaceBelow < popoverMaxHeight && spaceAbove > spaceBelow ? "top" : "bottom"
    setPosition({
      top: placement === "bottom" ? rect.bottom + margin : rect.top - margin,
      left: rect.left,
      width: rect.width,
      placement,
    })
  }, [])

  React.useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    const onScrollOrResize = () => updatePosition()
    window.addEventListener("scroll", onScrollOrResize, true)
    window.addEventListener("resize", onScrollOrResize)
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true)
      window.removeEventListener("resize", onScrollOrResize)
    }
  }, [open, updatePosition])

  const selected = options.find((opt) => opt.value === current)
  const isBare = !label && !error && !helperText

  // Highlight the current value (or first enabled option) when the popover
  // opens, so keyboard nav has a sane starting point.
  React.useEffect(() => {
    if (!open) return
    const idx = options.findIndex(
      (opt) => opt.value === current && !opt.disabled
    )
    if (idx >= 0) {
      setHighlighted(idx)
      return
    }
    const firstEnabled = options.findIndex((opt) => !opt.disabled)
    setHighlighted(firstEnabled)
  }, [open, current, options])

  // Click outside closes. Popover is portaled, so we also check popoverRef
  // — otherwise clicking an option would register as "outside" and close
  // the menu before the click event fires on the option button.
  React.useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [open])

  const commit = React.useCallback(
    (idx: number) => {
      const opt = options[idx]
      if (!opt || opt.disabled) return
      if (!isControlled) setInternalValue(opt.value)
      if (opt.value !== current) onChange?.(opt.value)
      setOpen(false)
      triggerRef.current?.focus()
    },
    [options, isControlled, current, onChange]
  )

  const moveHighlight = React.useCallback(
    (direction: 1 | -1) => {
      if (options.length === 0) return
      setHighlighted((prev) => {
        let next = prev
        for (let step = 0; step < options.length; step++) {
          next = (next + direction + options.length) % options.length
          if (!options[next]?.disabled) return next
        }
        return prev
      })
    },
    [options]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        if (!open) setOpen(true)
        else moveHighlight(1)
        break
      case "ArrowUp":
        e.preventDefault()
        if (!open) setOpen(true)
        else moveHighlight(-1)
        break
      case "Home":
        if (open) {
          e.preventDefault()
          const firstEnabled = options.findIndex((o) => !o.disabled)
          if (firstEnabled >= 0) setHighlighted(firstEnabled)
        }
        break
      case "End":
        if (open) {
          e.preventDefault()
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i]?.disabled) {
              setHighlighted(i)
              break
            }
          }
        }
        break
      case "Enter":
      case " ":
        if (open) {
          e.preventDefault()
          if (highlighted >= 0) commit(highlighted)
        } else {
          e.preventDefault()
          setOpen(true)
        }
        break
      case "Escape":
        if (open) {
          e.preventDefault()
          setOpen(false)
        }
        break
      case "Tab":
        if (open) setOpen(false)
        break
    }
  }

  const displayLabel = selected?.label ?? placeholder ?? "Select…"
  const isPlaceholder = !selected && !!placeholder

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      id={fieldId}
      disabled={disabled}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-activedescendant={
        open && highlighted >= 0 ? `${fieldId}-opt-${highlighted}` : undefined
      }
      aria-label={ariaLabel}
      aria-required={required || undefined}
      aria-invalid={error ? true : undefined}
      onClick={() => !disabled && setOpen((v) => !v)}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex h-12 items-center gap-2 rounded-xl bg-white dark:bg-gray-900 px-4 pr-10 text-sm text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] outline-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-brand-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
        isBare ? "w-fit min-w-[10rem]" : "w-full",
        isPlaceholder && "text-muted-foreground",
        error && "ring-2 ring-destructive",
        triggerClassName
      )}
    >
      <span className="flex-1 truncate text-left">{displayLabel}</span>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform",
          open && "rotate-180"
        )}
      />
    </button>
  )

  const popover =
    open && mounted && position
      ? createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            id={listboxId}
            aria-labelledby={label ? `${fieldId}-label` : undefined}
            style={{
              position: "fixed",
              top: position.placement === "bottom" ? position.top : undefined,
              bottom:
                position.placement === "top"
                  ? window.innerHeight - position.top
                  : undefined,
              left: position.left,
              minWidth: position.width,
            }}
            className={cn(
              "z-50 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-gray-900 py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10",
              contentClassName
            )}
          >
            {options.length === 0 ? (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No options
              </div>
            ) : (
              options.map((opt, i) => {
                const isSelected = opt.value === current
                const isHighlighted = i === highlighted
                return (
                  <button
                    key={opt.value}
                    id={`${fieldId}-opt-${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onMouseEnter={() => !opt.disabled && setHighlighted(i)}
                    onClick={() => commit(i)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors",
                      isHighlighted &&
                        !opt.disabled &&
                        "bg-accent text-accent-foreground",
                      opt.disabled && "cursor-not-allowed opacity-50",
                      isSelected && "font-medium"
                    )}
                  >
                    <span className="flex-1 truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-brand-primary" aria-hidden />
                    )}
                  </button>
                )
              })
            )}
          </div>,
          document.body
        )
      : null

  const control = (
    <div
      ref={containerRef}
      className={cn(
        "relative",
        isBare ? "inline-block" : "w-full",
        isBare && wrapperClassName
      )}
    >
      {trigger}
      {popover}
      {name && (
        <input
          type="hidden"
          name={name}
          value={current}
          required={required}
        />
      )}
    </div>
  )

  if (isBare) return control

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label && (
        <label
          id={`${fieldId}-label`}
          htmlFor={fieldId}
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {control}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
