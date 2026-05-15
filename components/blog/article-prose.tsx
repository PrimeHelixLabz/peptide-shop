import type { ReactNode } from "react"

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="prose-article max-w-none text-foreground">
      {children}
    </div>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
      {children}
    </h2>
  )
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 mb-3 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
      {children}
    </h3>
  )
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="my-4 text-base leading-relaxed text-muted-foreground md:text-[17px] md:leading-[1.8]">
      {children}
    </p>
  )
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="my-6 ml-6 list-disc space-y-2 text-base leading-relaxed text-muted-foreground md:text-[17px]">
      {children}
    </ul>
  )
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="my-6 ml-6 list-decimal space-y-2 text-base leading-relaxed text-muted-foreground md:text-[17px]">
      {children}
    </ol>
  )
}

export function LI({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900 md:p-6 md:text-base">
      {children}
    </div>
  )
}

export function ResearchNote({ children }: { children: ReactNode }) {
  return (
    <div className="my-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-relaxed text-blue-900 md:p-6 md:text-base">
      <strong className="block mb-1 text-blue-950">Research note</strong>
      {children}
    </div>
  )
}
