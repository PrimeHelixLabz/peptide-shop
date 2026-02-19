"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectBoxProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  align?: "left" | "right"
  disabled?: boolean
}

export function SelectBox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  triggerClassName,
  contentClassName,
  align = "right",
  disabled = false,
}: SelectBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)
  const displayLabel = selectedOption?.label || placeholder

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed",
          triggerClassName
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-sm font-medium flex-1 text-left">{displayLabel}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div
          className={cn(
            "absolute mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10",
            align === "left" ? "left-0" : "right-0",
            contentClassName
          )}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={value === option.value}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors",
                value === option.value && "bg-primary/10 text-primary font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
