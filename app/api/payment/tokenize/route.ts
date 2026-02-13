import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const tokenizeSchema = z.object({
  number: z.string().min(13),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024),
  cvc: z.string().min(3),
  name: z.string().min(1),
})

/**
 * Tokenize card with PaymentCloud
 * In production, this should use PaymentCloud SDK
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const card = tokenizeSchema.parse(body)

    // TODO: Integrate PaymentCloud tokenization SDK
    // For MVP, we'll create a mock token
    // In production, use PaymentCloud SDK:
    // const token = await paymentCloud.tokenize(card)
    
    // Mock token for MVP (replace with actual PaymentCloud tokenization)
    const mockToken = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    return NextResponse.json({ token: mockToken })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Tokenization error:", error)
    return NextResponse.json(
      { error: "Failed to tokenize card" },
      { status: 500 }
    )
  }
}
