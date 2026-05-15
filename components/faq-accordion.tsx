"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Minus } from "lucide-react"
import { faqItems, type FaqItem } from "@/lib/faq-items"

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0)
    }
  }, [isOpen])

  return (
    <div className="border-b border-gray-200 bg-white last:border-b-0">
      <button
        className="flex w-full items-center justify-between gap-6 rounded-2xl px-6 py-5 text-left transition-all duration-300 hover:bg-gray-50 active:scale-[0.98] lg:px-8 lg:py-6 min-h-[48px]"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold leading-snug text-foreground lg:text-base">
          {item.question}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 min-h-[48px] min-w-[48px]">
          {isOpen ? (
            <Minus className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
          ) : (
            <Plus className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          )}
        </span>
      </button>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={{ height }}
      >
        <div ref={contentRef}>
          <p className="px-6 pb-6 text-sm leading-relaxed text-muted-foreground lg:px-8 lg:pb-8 lg:pr-20">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }, [])

  return (
    <section className="bg-[#f6f6f7]">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        {/* Section Header */}
        <div className="mb-12 flex flex-col gap-3 text-center md:mb-16">
          <span className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Common Questions
          </span>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            Everything you need to know about our products, testing protocols,
            and ordering process.
          </p>
        </div>

        {/* Accordion */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
          {faqItems.map((item, index) => (
            <FaqAccordionItem
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 text-center md:mt-16">
          <p className="text-sm text-muted-foreground">
            {"Still have questions? We\u2019re here to help."}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:brightness-110 active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] min-h-[48px]"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  )
}
