"use client"

import { Menu } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getStorageUrl } from "@/lib/storage/supabase-storage"

interface AdminHeaderProps {
  title: string
  onMenuToggle: () => void
}

export function AdminHeader({ title, onMenuToggle }: AdminHeaderProps) {
  const { user } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] px-6 md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-foreground">{user?.name || "Admin"}</p>
          <p className="text-xs text-muted-foreground">{user?.email || "admin@elysian.com"}</p>
        </div>
        <Avatar className="h-9 w-9">
          {user?.avatar ? (
            <AvatarImage src={getStorageUrl(user.avatar)} alt={user.name} />
          ) : null}
          <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs">
            {user ? getInitials(user.name) : "A"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
