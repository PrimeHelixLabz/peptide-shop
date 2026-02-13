/**
 * Authentication Middleware
 * 
 * Middleware functions to protect API routes using Supabase Auth
 */

import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser, requireAuth, requireAdmin as requireAdminAuth } from "./supabase-auth"

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuthMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAuth()
      const authReq = req as AuthenticatedRequest
      authReq.user = user
      return handler(authReq)
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdminMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const user = await requireAdminAuth()
      const authReq = req as AuthenticatedRequest
      authReq.user = user
      return handler(authReq)
    } catch (error) {
      if (error instanceof Error && error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
}

/**
 * Optional auth - adds user if authenticated, but doesn't require it
 */
export function optionalAuthMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authReq = req as AuthenticatedRequest
    const user = await getCurrentUser()
    if (user) {
      authReq.user = user
    }
    return handler(authReq)
  }
}
