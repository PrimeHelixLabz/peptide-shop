"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { User, Mail, Phone, MapPin, Upload, X, Save, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { getStorageUrl } from "@/lib/storage/supabase-storage"
import { toast } from "sonner"

interface ProfileData {
  name: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  avatar: string | null
}

export function AccountProfile() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    if (!user) {
      router.push("/signin")
      return
    }

    loadProfile()
  }, [user, router])

  const loadProfile = async () => {
    try {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          phone: data.profile.phone || "",
          address: data.profile.address || {
            street: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
          avatar: data.profile.avatar || null,
        })
        if (data.profile.avatar) {
          setAvatarPreview(getStorageUrl(data.profile.avatar))
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB")
      return
    }

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    try {
      // Upload avatar to storage
      const formData = new FormData()
      formData.append("file", file)

      const uploadResponse = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        let message = "Failed to upload avatar"
        try {
          const errorData = await uploadResponse.json()
          if (errorData?.error) message = errorData.error
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message)
      }

      const uploadData = await uploadResponse.json()
      const path = uploadData.path as string

      // Update local profile state with new avatar path
      setProfile((prev) => (prev ? { ...prev, avatar: path } : prev))

      // Persist avatar to profile (without requiring Save button)
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: path }),
      })

      if (!response.ok) {
        let message = "Failed to save profile image"
        try {
          const errorData = await response.json()
          if (errorData?.error) message = errorData.error
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message)
      }

      toast.success("Profile image updated")
      await refreshUser()
    } catch (error) {
      console.error("Error updating avatar:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update avatar")
    }
  }

  const removeAvatar = async () => {
    // Optimistically clear avatar locally (will fall back to initials)
    setAvatarPreview(null)
    setProfile((prev) => (prev ? { ...prev, avatar: null } : prev))

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: null }),
      })

      if (!response.ok) {
        let message = "Failed to remove profile image"
        try {
          const errorData = await response.json()
          if (errorData?.error) message = errorData.error
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message)
      }

      toast.success("Profile image removed")
      await refreshUser()
      // Notify any listeners that auth-related profile data has changed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-state-changed"))
      }
    } catch (error) {
      console.error("Error removing avatar:", error)
      toast.error(error instanceof Error ? error.message : "Failed to remove profile image")
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        toast.success("Password changed successfully")
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setShowPasswords({
          current: false,
          new: false,
          confirm: false,
        })
        setPasswordDialogOpen(false)
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || "Failed to change password"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error changing password:", error)
      toast.error("An unexpected error occurred. Please try again.")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)

    try {
      // Prepare address - only send if at least one field is filled
      const addressToSend =
        profile.address.street ||
        profile.address.city ||
        profile.address.state ||
        profile.address.zipCode ||
        profile.address.country
          ? profile.address
          : null

      // Update profile (excluding avatar, which is handled separately)
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone || null,
          address: addressToSend,
        }),
      })

      if (response.ok) {
        toast.success("Profile updated successfully")
        await refreshUser()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return null
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
    <div className="flex flex-col gap-6">
      {/* Profile Information */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          {/* Avatar + Name */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="relative">
              <label htmlFor="avatar" className="cursor-pointer block">
                <Avatar
                  key={avatarPreview || profile.avatar || "no-avatar"}
                  className="h-20 w-20"
                >
                  {avatarPreview && (
                    <AvatarImage src={avatarPreview} alt={profile.name} />
                  )}
                  {!avatarPreview && profile.avatar && (
                    <AvatarImage src={getStorageUrl(profile.avatar)} alt={profile.name} />
                  )}
                  <AvatarFallback className="bg-primary text-white text-lg">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
              </label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {(avatarPreview || profile.avatar) && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors"
                  aria-label="Remove avatar"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Enter your full name"
                required
                className="rounded-xl"
              />
            </div>
          </div>

          <Separator />

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
              className="rounded-xl bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="Enter your phone number"
              className="rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Shipping Address
          </CardTitle>
          <CardDescription>Your default shipping address for orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Street */}
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={profile.address.street}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  address: { ...profile.address, street: e.target.value },
                })
              }
              placeholder="Enter street address"
              className="rounded-xl"
            />
          </div>

          {/* City and State */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profile.address.city}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, city: e.target.value },
                  })
                }
                placeholder="Enter city"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={profile.address.state}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, state: e.target.value },
                  })
                }
                placeholder="Enter state"
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Zip Code and Country */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP/Postal Code</Label>
              <Input
                id="zipCode"
                value={profile.address.zipCode}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, zipCode: e.target.value },
                  })
                }
                placeholder="Enter ZIP code"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profile.address.country}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    address: { ...profile.address, country: e.target.value },
                  })
                }
                placeholder="Enter country"
                className="rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-2xl"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="rounded-2xl">
          {saving ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
      </form>

      {/* Password Change Button */}
      <Card className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-2xl">
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </DialogTitle>
                <DialogDescription>
                  Update your account password. Make sure to use a strong password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="dialogCurrentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="dialogCurrentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="Enter your current password"
                      required
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="dialogNewPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="dialogNewPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="Enter new password (min. 8 characters)"
                      required
                      minLength={8}
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="dialogConfirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="dialogConfirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                      required
                      minLength={8}
                      className="rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPasswordDialogOpen(false)
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      })
                      setShowPasswords({
                        current: false,
                        new: false,
                        confirm: false,
                      })
                    }}
                    className="flex-1 rounded-2xl"
                    disabled={changingPassword}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={changingPassword}
                    className="flex-1 rounded-2xl"
                  >
                    {changingPassword ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
