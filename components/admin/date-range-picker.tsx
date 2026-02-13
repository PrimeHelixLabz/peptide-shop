"use client"

import { useState } from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { DateRange, Range } from "react-date-range"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"

type PresetRange = "today" | "7d" | "28d" | "30d" | "6m" | "12m" | "mtd" | "qtd" | "ytd" | "all"

interface DateRangePickerProps {
  value: { from: Date | undefined; to: Date | undefined }
  onChange: (range: { from: Date | undefined; to: Date | undefined }) => void
  preset?: PresetRange
  onPresetChange?: (preset: PresetRange | "custom") => void
}

const presetRanges = [
  { label: "Today", value: "today" as PresetRange },
  { label: "Last 7 days", value: "7d" as PresetRange },
  { label: "Last 4 weeks", value: "28d" as PresetRange },
  { label: "Last 30 days", value: "30d" as PresetRange },
  { label: "Last 6 months", value: "6m" as PresetRange },
  { label: "Last 12 months", value: "12m" as PresetRange },
  { label: "Month to date", value: "mtd" as PresetRange },
  { label: "Quarter to date", value: "qtd" as PresetRange },
  { label: "Year to date", value: "ytd" as PresetRange },
  { label: "All time", value: "all" as PresetRange },
]

function getPresetRange(preset: PresetRange): { from: Date; to: Date } {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  switch (preset) {
    case "today":
      return { from: start, to: today }
    case "7d":
      start.setDate(today.getDate() - 6)
      return { from: start, to: today }
    case "28d":
      start.setDate(today.getDate() - 27)
      return { from: start, to: today }
    case "30d":
      start.setDate(today.getDate() - 29)
      return { from: start, to: today }
    case "6m":
      start.setMonth(today.getMonth() - 5)
      start.setDate(1)
      return { from: start, to: today }
    case "12m":
      start.setFullYear(today.getFullYear() - 1)
      start.setMonth(today.getMonth())
      start.setDate(1)
      return { from: start, to: today }
    case "mtd":
      start.setDate(1)
      return { from: start, to: today }
    case "qtd":
      const quarter = Math.floor(today.getMonth() / 3)
      start.setMonth(quarter * 3)
      start.setDate(1)
      return { from: start, to: today }
    case "ytd":
      start.setMonth(0)
      start.setDate(1)
      return { from: start, to: today }
    case "all":
      return { from: new Date(2020, 0, 1), to: today }
    default:
      return { from: start, to: today }
  }
}

export function DateRangePicker({
  value,
  onChange,
  preset = "30d",
  onPresetChange,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetRange | "custom">(preset)

  const dateRange: Range = {
    startDate: value.from || new Date(),
    endDate: value.to || new Date(),
    key: "selection",
  }

  function handlePresetSelect(presetValue: PresetRange) {
    const range = getPresetRange(presetValue)
    onChange(range)
    setSelectedPreset(presetValue)
    onPresetChange?.(presetValue)
    setOpen(false)
  }

  function handleDateRangeChange(item: { selection: Range }) {
    const { startDate, endDate } = item.selection
    if (startDate && endDate) {
      onChange({ from: startDate, to: endDate })
      setSelectedPreset("custom")
      onPresetChange?.("custom")
    }
  }

  const displayText = value.from && value.to
    ? `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`
    : "Select date range"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border-0 bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-4 py-2.5 text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
            !value.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span>{displayText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="block md:hidden lg:block w-[1200px] right-6 md:right-8 lg:right-10 p-0" align="start">
        <div className="flex">
          {/* Preset options */}
          <div className="border-r border-border p-3 bg-gray-50 dark:bg-gray-900 rounded w-[160px] flex-shrink-0">
            <div className="space-y-1">
              {presetRanges.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                    selectedPreset === preset.value
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                      : "text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="p-3 flex-1">
            <DateRange
              ranges={[dateRange]}
              onChange={handleDateRangeChange}
              months={2}
              direction="horizontal"
              showDateDisplay={false}
              rangeColors={["hsl(142, 71%, 45%)"]}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
