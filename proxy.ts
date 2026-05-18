import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { updateSession } from "@/lib/supabase/middleware"
// Side-effect import: runs env validation on cold start. Throws with a
// grouped error message if anything required is missing or a payment
// provider is half-configured.
import "@/lib/env"

const REF_COOKIE_NAME = "phl_ref"
const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days
// Bound the format defensively; the trigger does the authoritative validation.
const REF_CODE_PATTERN = /^[A-Z0-9]{4,32}$/i

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired and get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Affiliate attribution: capture ?ref=CODE into a 90-day cookie. Last-touch
  // wins. Applied to every response (including redirects) so a user landing
  // on a protected page with ?ref doesn't lose attribution when bounced to
  // /signin.
  const refParam = request.nextUrl.searchParams.get("ref")
  const refToSet =
    refParam && REF_CODE_PATTERN.test(refParam) ? refParam.toUpperCase() : null
  const applyRefCookie = (response: NextResponse) => {
    if (refToSet) {
      response.cookies.set(REF_COOKIE_NAME, refToSet, {
        maxAge: REF_COOKIE_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }
    return response
  }

  const isAuthPage =
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  const isPasswordPage =
    pathname === "/forgot-password" ||
    pathname === "/reset-password"

  // Routes that require authentication - everything else is public
  const isProtectedRoute =
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname === "/account" ||
    pathname === "/wishlist" ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/affiliates/dashboard")

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const signInUrl = new URL("/signin", request.url)
    signInUrl.searchParams.set("redirect", pathname + request.nextUrl.search)
    return applyRefCookie(NextResponse.redirect(signInUrl))
  }

  // If already authenticated, redirect away from sign-in/sign-up pages to home
  // but allow access to forgot-password and reset-password
  if (user && isAuthPage && !isPasswordPage) {
    return applyRefCookie(NextResponse.redirect(new URL("/", request.url)))
  }

  // Admin routes require admin role
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single()

    if (profile?.role !== "admin") {
      return applyRefCookie(NextResponse.redirect(new URL("/", request.url)))
    }
  }

  return applyRefCookie(supabaseResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
