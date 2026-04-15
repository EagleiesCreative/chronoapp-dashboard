"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    IconLoader,
    IconCheck,
    IconUser,
    IconMail,
    IconCamera,
    IconKey,
    IconTrash,
} from "@tabler/icons-react"

export default function SettingsPage() {
    const { isLoaded, user } = useUser()

    // ─── Profile state ───
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [username, setUsername] = useState("")
    const [profileSaving, setProfileSaving] = useState(false)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // ─── Security state ───
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordSaving, setPasswordSaving] = useState(false)

    // ─── Init profile from Clerk ───
    useEffect(() => {
        if (isLoaded && user) {
            setFirstName(user.firstName || "")
            setLastName(user.lastName || "")
            setUsername(user.username || "")
        }
    }, [isLoaded, user])

    // ─── Profile handlers ───
    const handleProfileSave = async () => {
        if (!user) return
        setProfileSaving(true)
        try {
            await user.update({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                username: username.trim() || undefined,
            })
            toast.success("Profile updated successfully")
        } catch (err: any) {
            console.error("Profile update error:", err)
            const msg = err?.errors?.[0]?.longMessage || err?.message || "Failed to update profile"
            toast.error(msg)
        } finally {
            setProfileSaving(false)
        }
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files?.[0]) return
        const file = e.target.files[0]

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image must be under 10MB")
            return
        }

        setAvatarUploading(true)
        try {
            await user.setProfileImage({ file })
            toast.success("Avatar updated")
        } catch (err: any) {
            console.error("Avatar upload error:", err)
            toast.error("Failed to update avatar")
        } finally {
            setAvatarUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleAvatarRemove = async () => {
        if (!user) return
        setAvatarUploading(true)
        try {
            await user.setProfileImage({ file: null })
            toast.success("Avatar removed")
        } catch (err: any) {
            console.error("Avatar remove error:", err)
            toast.error("Failed to remove avatar")
        } finally {
            setAvatarUploading(false)
        }
    }

    // ─── Password handler ───
    const handlePasswordChange = async () => {
        if (!user) return
        if (!currentPassword || !newPassword) {
            toast.error("Please fill in both password fields")
            return
        }
        if (newPassword.length < 8) {
            toast.error("New password must be at least 8 characters")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords don't match")
            return
        }

        setPasswordSaving(true)
        try {
            await user.updatePassword({
                currentPassword,
                newPassword,
            })
            toast.success("Password updated successfully")
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
        } catch (err: any) {
            console.error("Password update error:", err)
            const msg = err?.errors?.[0]?.longMessage || err?.message || "Failed to update password"
            toast.error(msg)
        } finally {
            setPasswordSaving(false)
        }
    }

    // ─── Loading skeleton ───
    if (!isLoaded) {
        return (
            <div className="p-4 md:p-6 space-y-4">
                <div className="h-8 w-40 animate-pulse rounded bg-muted" />
                <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
            </div>
        )
    }

    const avatarUrl = user?.imageUrl
    const initials = (user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || "U").toUpperCase()

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
                <p className="text-sm text-muted-foreground">
                    Manage your profile, security, and payment settings
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="profile" className="flex items-center gap-2">
                        <IconUser className="h-4 w-4" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <IconKey className="h-4 w-4" />
                        Security
                    </TabsTrigger>

                {/* ─────────────── PROFILE TAB ─────────────── */}
                <TabsContent value="profile" className="space-y-6 mt-6">
                    {/* Avatar Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Photo</CardTitle>
                            <CardDescription>
                                Your avatar is visible to other members in your organization
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6">
                                <div className="relative group">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Avatar"
                                            className="h-20 w-20 rounded-full object-cover border-2 border-border"
                                        />
                                    ) : (
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 border-2 border-primary/30 text-2xl font-semibold text-primary">
                                            {initials}
                                        </div>
                                    )}
                                    {avatarUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                                            <IconLoader className="h-6 w-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={avatarUploading}
                                        >
                                            <IconCamera className="mr-2 h-4 w-4" />
                                            Upload Photo
                                        </Button>
                                        {avatarUrl && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleAvatarRemove}
                                                disabled={avatarUploading}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <IconTrash className="mr-2 h-4 w-4" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG or GIF. Max 10MB.
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/gif"
                                        className="hidden"
                                        onChange={handleAvatarUpload}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Update your name and username
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter your first name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter your last name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter a username"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This is your unique identifier across the platform
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs">Email Address</Label>
                                <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 border border-border">
                                    <IconMail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </span>
                                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                        Primary
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Email changes are managed through your authentication provider
                                </p>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button onClick={handleProfileSave} disabled={profileSaving}>
                                    {profileSaving ? (
                                        <>
                                            <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <IconCheck className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─────────────── SECURITY TAB ─────────────── */}
                <TabsContent value="security" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <IconKey className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Change Password</CardTitle>
                                    <CardDescription>
                                        Update your password to keep your account secure
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Password must be at least 8 characters long
                            </p>
                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handlePasswordChange}
                                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                                >
                                    {passwordSaving ? (
                                        <>
                                            <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        "Update Password"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Sessions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Sessions</CardTitle>
                            <CardDescription>
                                Devices and browsers where you are currently signed in
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border">
                                <div className="p-2 rounded-lg bg-green/10">
                                    <IconCheck className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Current Session</p>
                                    <p className="text-xs text-muted-foreground">
                                        This device • Last active: now
                                    </p>
                                </div>
                                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                    Active
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

        </div>
    )
}
