"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { User, Mail, Phone, MapPin, Upload, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)

    try {
      // Upload avatar if changed
      let avatarUrl = profile.avatar

      if (avatarFile) {
        const formData = new FormData()
        formData.append("file", avatarFile)

        const uploadResponse = await fetch("/api/upload/avatar", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          // Extract just the path from the full URL
          const path = uploadData.path
          avatarUrl = path
        } else {
          throw new Error("Failed to upload avatar")
        }
      }

      // Update profile
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone || null,
          address: profile.address.street ? profile.address : null,
          avatar: avatarUrl,
        }),
      })

      if (response.ok) {
        toast.success("Profile updated successfully")
        await refreshUser()
        setAvatarFile(null)
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Profile Information */}
      <Card className="rounded-3xl bg-white dark:bg-gray-900 shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={profile.name} />
                ) : profile.avatar ? (
                  <AvatarImage src={getStorageUrl(profile.avatar)} alt={profile.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-white text-lg">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="avatar" className="text-sm font-medium">
                Profile Picture
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl"
                >
                  <label htmlFor="avatar" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </label>
                </Button>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
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
  )
}
