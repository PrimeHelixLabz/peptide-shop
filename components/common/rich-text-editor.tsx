"use client"

import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import "react-quill-new/dist/quill.snow.css"

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
})

export interface RichTextEditorProps {
  label?: string
  value: string
  onChange: (value: string) => void
  helperText?: string
  className?: string
}

export function RichTextEditor({
  label,
  value,
  onChange,
  helperText,
  className,
}: RichTextEditorProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}

      <div
        className={cn(
          "rounded-xl border border-border bg-background",
          "shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)]",
          "focus-within:ring-2 focus-within:ring-brand-primary/20"
        )}
      >
        <ReactQuill
          theme="snow"
          value={value || ""}
          onChange={(html) => onChange(html)}
          className="text-sm text-foreground"
          modules={{
            toolbar: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ list: "ordered" }, { list: "bullet" }],
              ["blockquote", "code-block"],
              ["link"],
              ["clean"],
            ],
          }}
        />
      </div>

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  )
}
