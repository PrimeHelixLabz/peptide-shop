'use client'

/**
 * Authentication Context
 * 
 * Provides authentication state and methods to client components
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  avatar?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Load user on mount
  useEffect(() => {
    loadUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUser()
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUser = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (profile) {
        setUser({
          id: authUser.id,
          email: authUser.email!,
          name: profile.name,
          role: profile.role,
          avatar: profile.avatar,
          phone: profile.phone,
          address: profile.address,
        })
      } else {
        setUser({
          id: authUser.id,
          email: authUser.email!,
          name: authUser.email!,
          role: "user",
        })
      }
    } catch (error) {
      console.error("Error loading user:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return { error: error.message }
        }

        await loadUser()
        
        // Trigger cart and wishlist sync by dispatching custom event
        // The contexts will listen for auth changes and sync automatically
        window.dispatchEvent(new Event("auth-state-changed"))
        
        return {}
      } catch (error) {
        return { error: "Failed to sign in" }
      }
    },
    [supabase, loadUser]
  )

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        })

        if (error) {
          return { error: error.message }
        }

        await loadUser()
        
        // Trigger cart and wishlist sync
        window.dispatchEvent(new Event("auth-state-changed"))
        
        return {}
      } catch (error) {
        return { error: "Failed to sign up" }
      }
    },
    [supabase, loadUser]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/")
  }, [supabase, router])

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
