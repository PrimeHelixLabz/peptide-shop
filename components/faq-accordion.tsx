"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Plus, Minus } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: "Are your products intended for human consumption?",
    answer:
      "No. All products sold by PrimeHelix Labz are strictly intended for in-vitro research and laboratory use only. They are not intended for human or animal consumption, and we do not provide guidance on dosing, administration, or therapeutic use. By purchasing from us, you acknowledge and agree to these terms.",
  },
  {
    question: "How are your peptides tested for purity?",
    answer:
      "Every batch undergoes rigorous third-party testing through independent, ISO-accredited laboratories. We use High-Performance Liquid Chromatography (HPLC) and Mass Spectrometry (MS) to verify identity, purity, and composition. Certificates of Analysis (COAs) are available for every product and can be downloaded directly from the product page.",
  },
  {
    question: "What are your shipping times and methods?",
    answer:
      "Orders placed before 2:00 PM EST on business days ship the same day via FedEx 2Day, with delivery in 2 business days. Shipping is a flat $15, and free for any order with a subtotal of $250 or more.",
  },
  {
    question: "How can I track my order?",
    answer:
      "Once your order ships, you will receive an email confirmation containing your tracking number and a direct link to the carrier\u2019s tracking page. You can also view the status of all current and past orders by logging into your account on our website. If your tracking information has not updated within 48 hours of shipment, please reach out to our support team.",
  },
]

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
