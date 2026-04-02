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
  const isAuthApiRoute = pathname.startsWith("/api/auth")

  // Public SEO routes that must be accessible without authentication
  const isPublicSeoRoute =
    pathname === "/sitemap.xml" || pathname === "/robots.txt"

  // Global auth guard: require login to view any non-auth, non-API route
  if (!user && !isAuthPage && !isAuthApiRoute && !isPublicSeoRoute && !pathname.startsWith("/api")) {
    const signInUrl = new URL("/signin", request.url)
    signInUrl.searchParams.set("redirect", pathname + request.nextUrl.search)
    return NextResponse.redirect(signInUrl)
  }

  // If already authenticated, redirect away from sign-in/sign-up pages to home
  // but allow access to forgot-password and reset-password
  if (user && isAuthPage && !isPasswordPage) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Check admin routes after session is updated
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const signInUrl = new URL("/signin", request.url)
      signInUrl.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(signInUrl)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
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
