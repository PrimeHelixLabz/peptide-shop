"use client"

import { Menu, User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStorageUrl } from "@/lib/storage/supabase-storage"

interface AdminHeaderProps {
  title: string
  onMenuToggle: () => void
}

export function AdminHeader({ title, onMenuToggle }: AdminHeaderProps) {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
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

      {/* User avatar with dropdown */}
      {loading ? (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800 mb-1" />
            <div className="h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
        </div>
      ) : user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 p-1">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Avatar className="h-9 w-9">
                {user.avatar ? (
                  <AvatarImage src={getStorageUrl(user.avatar)} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-white text-xs">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0 p-2">
            <DropdownMenuLabel className="flex items-center gap-3 p-3 rounded-xl">
              <Avatar className="h-10 w-10">
                {user.avatar ? (
                  <AvatarImage src={getStorageUrl(user.avatar)} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-white text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground truncate" title={user.email}>
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/admin/profile" className="flex items-center gap-3 cursor-pointer rounded-xl">
                <User className="h-4 w-4" />
                Profile
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive rounded-xl cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  )
}
