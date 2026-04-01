"use client"

import { useState, useEffect } from "react"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type PresetRange = "7d" | "30d" | "90d" | "all"

interface DateRangePickerProps {
  value: { from: Date | undefined; to: Date | undefined }
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void
  preset?: PresetRange
  onPresetChange?: (preset: PresetRange | "custom") => void
}

function getPresetRange(preset: PresetRange): { from: Date; to: Date } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  switch (preset) {
    case "7d":
      start.setDate(today.getDate() - 6)
      return { from: start, to: today }
    case "30d":
      start.setDate(today.getDate() - 29)
      return { from: start, to: today }
    case "90d":
      start.setDate(today.getDate() - 89)
      return { from: start, to: today }
    case "all":
      return { from: new Date(2020, 0, 1), to: today }
    default:
      start.setDate(today.getDate() - 29)
      return { from: start, to: today }
  }
}

export function DateRangePicker({
  value,
  onChange,
  preset = "30d",
  onPresetChange,
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetRange | "custom">(preset)

  function handlePresetSelect(presetValue: PresetRange) {
    const range = getPresetRange(presetValue)
    onChange(range)
    setSelectedPreset(presetValue)
    onPresetChange?.(presetValue)
  }

  function shiftPeriod(direction: -1 | 1) {
    if (!value.from || !value.to) return
    const durationMs = value.to.getTime() - value.from.getTime()
    // +1 day so periods don't overlap
    const shiftMs = durationMs + 24 * 60 * 60 * 1000

    const newFrom = new Date(value.from.getTime() + direction * shiftMs)
    newFrom.setHours(0, 0, 0, 0)
    const newTo = new Date(value.to.getTime() + direction * shiftMs)
    newTo.setHours(23, 59, 59, 999)

    // Don't allow navigating into the future
    const now = new Date()
    if (newFrom > now) return

    // Clamp end date to today
    if (newTo > now) {
      newTo.setTime(now.getTime())
      newTo.setHours(23, 59, 59, 999)
    }

    onChange({ from: newFrom, to: newTo })
    setSelectedPreset("custom")
    onPresetChange?.("custom")
  }

  // Whether we can go forward (the current end date is before today)
  const canGoNext = value.to
    ? value.to.toISOString().split("T")[0] < new Date().toISOString().split("T")[0]
    : false

  // Sync selected preset when value changes externally
  useEffect(() => {
    if (value.from && value.to) {
      // Check if it matches a preset by comparing date strings (YYYY-MM-DD)
      const valueFromStr = value.from.toISOString().split("T")[0]
      const valueToStr = value.to.toISOString().split("T")[0]
      
      const range7d = getPresetRange("7d")
      const range30d = getPresetRange("30d")
      const range90d = getPresetRange("90d")
      const rangeAll = getPresetRange("all")
      
      const range7dFromStr = range7d.from.toISOString().split("T")[0]
      const range7dToStr = range7d.to.toISOString().split("T")[0]
      const range30dFromStr = range30d.from.toISOString().split("T")[0]
      const range30dToStr = range30d.to.toISOString().split("T")[0]
      const range90dFromStr = range90d.from.toISOString().split("T")[0]
      const range90dToStr = range90d.to.toISOString().split("T")[0]
      const rangeAllFromStr = rangeAll.from.toISOString().split("T")[0]
      const rangeAllToStr = rangeAll.to.toISOString().split("T")[0]
      
      let newPreset: PresetRange | "custom" = "custom"
      if (valueFromStr === range7dFromStr && valueToStr === range7dToStr) {
        newPreset = "7d"
      } else if (valueFromStr === range30dFromStr && valueToStr === range30dToStr) {
        newPreset = "30d"
      } else if (valueFromStr === range90dFromStr && valueToStr === range90dToStr) {
        newPreset = "90d"
      } else if (valueFromStr === rangeAllFromStr && valueToStr === rangeAllToStr) {
        newPreset = "all"
      }
      
      if (selectedPreset !== newPreset) {
        setSelectedPreset(newPreset)
      }
    }
  }, [value.from, value.to])

  function handleFromDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fromDate = e.target.value ? new Date(e.target.value) : undefined
    if (fromDate) {
      fromDate.setHours(0, 0, 0, 0)
    }
    onChange({ from: fromDate, to: value.to })
    setSelectedPreset("custom")
    onPresetChange?.("custom")
  }

  function handleToDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const toDate = e.target.value ? new Date(e.target.value) : undefined
    if (toDate) {
      toDate.setHours(23, 59, 59, 999)
    }
    onChange({ from: value.from, to: toDate })
    setSelectedPreset("custom")
    onPresetChange?.("custom")
  }

  const displayText = value.from && value.to
    ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
    : "Select date range"

  const fromDateString = value.from ? format(value.from, "yyyy-MM-dd") : ""
  const toDateString = value.to ? format(value.to, "yyyy-MM-dd") : ""

  return (
    <div className="inline-flex items-center gap-1">
      {/* Previous period button */}
      <button
        onClick={() => shiftPeriod(-1)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Previous period"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="inline-flex items-center gap-3 rounded-xl border-0 bg-background shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] bg-white px-4 py-2.5">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />

        {/* Preset buttons */}
        <div className="flex items-center gap-1 border-r border-border pr-3 mr-3">
          {(["7d", "30d", "90d", "all"] as PresetRange[]).map((presetValue) => (
            <button
              key={presetValue}
              onClick={() => handlePresetSelect(presetValue)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                selectedPreset === presetValue
                  ? "bg-gradient-to-r from-brand-primary to-brand-secondary text-brand-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {presetValue === "7d" ? "7d" : presetValue === "30d" ? "30d" : presetValue === "90d" ? "90d" : "All"}
            </button>
          ))}
        </div>

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDateString}
            onChange={handleFromDateChange}
            className="text-sm text-foreground bg-transparent border-0 outline-none focus:ring-0"
            aria-label="Start date"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={toDateString}
            onChange={handleToDateChange}
            className="text-sm text-foreground bg-transparent border-0 outline-none focus:ring-0"
            aria-label="End date"
          />
        </div>
      </div>

      {/* Next period button */}
      <button
        onClick={() => shiftPeriod(1)}
        disabled={!canGoNext}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-colors",
          canGoNext
            ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/30 cursor-not-allowed"
        )}
        aria-label="Next period"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
