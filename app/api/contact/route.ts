import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendContactFormEmail } from "@/lib/email"

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email address").max(320),
  subject: z.enum([
    "order",
    "product",
    "shipping",
    "order-issue",
    "wholesale",
    "other",
  ]),
  message: z.string().trim().min(1, "Message is required").max(10000),
})

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured")
    return NextResponse.json(
      { error: "Email is temporarily unavailable. Please try again later." },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const data = contactSchema.parse(body)
    await sendContactFormEmail(data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.errors[0]
      return NextResponse.json(
        { error: first?.message ?? "Invalid form data" },
        { status: 400 }
      )
    }

    console.error("Contact form API error:", error)
    return NextResponse.json(
      { error: "We could not send your message. Please try again in a moment." },
      { status: 500 }
    )
  }
}
