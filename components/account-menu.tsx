"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { User, LogIn, LogOut, Settings, Package, Heart, CreditCard, Shield } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth/auth-context"
import { getStorageUrl } from "@/lib/storage/supabase-storage"

export function AccountMenu({ isMobileDrawer = false, onClose }: { isMobileDrawer?: boolean; onClose?: () => void }) {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    if (onClose) onClose()
  }

  const handleLinkClick = () => {
    if (onClose) onClose()
  }
  if (loading) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground min-h-[48px] min-w-[48px]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] ${
            isMobileDrawer ? "w-full justify-start px-4 py-3 text-sm font-medium hover:text-foreground rounded-2xl" : "h-9 w-9 sm:h-10 sm:w-10"
          }`}
          aria-label="Account menu"
        >
          {user ? (
            <Avatar
              key={user.avatar || "no-avatar"}
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              {user.avatar && (
                <AvatarImage src={getStorageUrl(user.avatar)} alt={user.name} />
              )}
              <AvatarFallback className="bg-primary text-white text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          )}
          {isMobileDrawer && <span className="ml-2">Account</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0 p-2">
        {user ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-3 p-3 rounded-xl">
              <Avatar
                key={`dropdown-${user.avatar || "no-avatar"}`}
                className="h-10 w-10"
              >
                {user.avatar && (
                  <AvatarImage src={getStorageUrl(user.avatar)} alt={user.name} />
                )}
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
              <Link href="/account" className="flex items-center gap-3 cursor-pointer rounded-xl" onClick={handleLinkClick}>
                <User className="h-4 w-4" />
                My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/orders" className="flex items-center gap-3 cursor-pointer rounded-xl" onClick={handleLinkClick}>
                <Package className="h-4 w-4" />
                My Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/wishlist" className="flex items-center gap-3 cursor-pointer rounded-xl" onClick={handleLinkClick}>
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
            </DropdownMenuItem>
            {user.role === "admin" && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-3 cursor-pointer rounded-xl" onClick={handleLinkClick}>
                  <Shield className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive rounded-xl cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link
                href="/signin"
                className="flex items-center gap-3 cursor-pointer rounded-xl"
                onClick={handleLinkClick}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/signup"
                className="flex items-center gap-3 cursor-pointer rounded-xl"
                onClick={handleLinkClick}
              >
                <User className="h-4 w-4" />
                Create Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-200" />
            <DropdownMenuItem asChild>
              <Link
                href="/wishlist"
                className="flex items-center gap-3 cursor-pointer rounded-xl"
                onClick={handleLinkClick}
              >
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
