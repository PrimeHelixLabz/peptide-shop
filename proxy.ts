import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { updateSession } from "@/lib/supabase/middleware"

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
    pathname.startsWith("/admin")

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtectedRoute) {
    const signInUrl = new URL("/signin", request.url)
    signInUrl.searchParams.set("redirect", pathname + request.nextUrl.search)
    return NextResponse.redirect(signInUrl)
  }

  // If already authenticated, redirect away from sign-in/sign-up pages to home
  // but allow access to forgot-password and reset-password
  if (user && isAuthPage && !isPasswordPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Admin routes require admin role
  if (pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
