"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
    IconBuildingBank,
    IconLoader,
    IconAlertTriangle,
    IconCheck,
    IconLock,
    IconClock,
    IconWallet,
    IconShieldCheck,
    IconUser,
    IconMail,
    IconCamera,
    IconKey,
    IconTrash,
} from "@tabler/icons-react"

// ─── Bank Options ───
const BANK_OPTIONS = [
    { code: 'BCA', name: 'BCA' },
    { code: 'BNI', name: 'BNI' },
    { code: 'BRI', name: 'BRI' },
    { code: 'MANDIRI', name: 'Mandiri' },
    { code: 'CIMB', name: 'CIMB Niaga' },
    { code: 'PERMATA', name: 'Permata' },
    { code: 'DANAMON', name: 'Danamon' },
    { code: 'BSI', name: 'BSI' },
    { code: 'OVO', name: 'OVO (E-Wallet)' },
    { code: 'DANA', name: 'DANA (E-Wallet)' },
    { code: 'GOPAY', name: 'GoPay (E-Wallet)' },
]

interface PaymentInfo {
    bankCode: string
    accountNumber: string
    accountHolderName: string
    lastUpdated: string
}

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

    // ─── Payment info state ───
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
    const [canEdit, setCanEdit] = useState(true)
    const [nextEditableDate, setNextEditableDate] = useState<string | null>(null)
    const [daysUntilEditable, setDaysUntilEditable] = useState(0)
    const [hasPaymentInfo, setHasPaymentInfo] = useState(false)
    const [paymentLoading, setPaymentLoading] = useState(true)

    // Payment form state
    const [bankCode, setBankCode] = useState("")
    const [accountNumber, setAccountNumber] = useState("")
    const [accountHolderName, setAccountHolderName] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    // Validation state
    const [accountError, setAccountError] = useState("")
    const [isVerifying, setIsVerifying] = useState(false)
    const [isVerified, setIsVerified] = useState(false)

    // Confirmation dialog state
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // ─── Init profile from Clerk ───
    useEffect(() => {
        if (isLoaded && user) {
            setFirstName(user.firstName || "")
            setLastName(user.lastName || "")
            setUsername(user.username || "")
            fetchPaymentInfo()
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

    // ─── Payment info handlers (preserved from existing code) ───
    const fetchPaymentInfo = async () => {
        setPaymentLoading(true)
        try {
            const res = await fetch('/api/payment-info')
            const data = await res.json()

            if (data.paymentInfo) {
                setPaymentInfo(data.paymentInfo)
                setHasPaymentInfo(true)
                setBankCode(data.paymentInfo.bankCode)
                setAccountNumber(data.paymentInfo.accountNumber)
                setAccountHolderName(data.paymentInfo.accountHolderName)
            } else {
                setHasPaymentInfo(false)
                setIsEditing(true)
            }

            setCanEdit(data.canEdit)
            setNextEditableDate(data.nextEditableDate)
            setDaysUntilEditable(data.daysUntilEditable)
        } catch (error) {
            console.error('Failed to fetch payment info:', error)
            toast.error('Failed to load payment information')
        } finally {
            setPaymentLoading(false)
        }
    }

    const handleVerifyAccount = async () => {
        if (!bankCode || !accountNumber) {
            toast.error('Please select bank and enter account number')
            return
        }

        setIsVerifying(true)
        setAccountError("")
        setIsVerified(false)

        try {
            const res = await fetch('/api/validate-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankCode, accountNumber })
            })
            const result = await res.json()

            if (!result.valid) {
                setAccountError(result.error || 'Invalid account number')
                return
            }
            setIsVerified(true)
            toast.success('Account format is valid!')
        } catch (error: any) {
            console.error('Validation error:', error)
            setAccountError('Validation failed. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleSaveClick = () => {
        if (!bankCode || !accountNumber || !accountHolderName) {
            toast.error("Please fill in all fields")
            return
        }
        if (!isVerified) {
            toast.error("Please verify your account number first")
            return
        }
        setConfirmDialogOpen(true)
    }

    const handleConfirmSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/payment-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankCode, accountNumber, accountHolderName })
            })
            const result = await res.json()

            if (!res.ok) throw new Error(result.error || 'Failed to save payment information')

            toast.success(result.message || 'Payment information saved successfully!')
            setConfirmDialogOpen(false)
            setIsEditing(false)
            fetchPaymentInfo()
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(error.message || 'Failed to save payment information')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEditClick = () => {
        if (!canEdit) {
            toast.error(`You can edit payment information again on ${new Date(nextEditableDate!).toLocaleDateString()}`)
            return
        }
        setIsEditing(true)
        setIsVerified(false)
    }

    const handleCancelEdit = () => {
        if (hasPaymentInfo && paymentInfo) {
            setBankCode(paymentInfo.bankCode)
            setAccountNumber(paymentInfo.accountNumber)
            setAccountHolderName(paymentInfo.accountHolderName)
        }
        setIsEditing(false)
        setAccountError("")
        setIsVerified(false)
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
                    <TabsTrigger value="payment" className="flex items-center gap-2">
                        <IconBuildingBank className="h-4 w-4" />
                        Payment
                    </TabsTrigger>
                </TabsList>

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

                {/* ─────────────── PAYMENT TAB ─────────────── */}
                <TabsContent value="payment" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <IconBuildingBank className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Payment Information</CardTitle>
                                        <CardDescription>
                                            Save your bank details for faster withdrawals
                                        </CardDescription>
                                    </div>
                                </div>
                                {hasPaymentInfo && !isEditing && (
                                    <Button
                                        onClick={handleEditClick}
                                        disabled={!canEdit || paymentLoading}
                                        variant={canEdit ? "outline" : "ghost"}
                                    >
                                        {canEdit ? "Edit" : (
                                            <>
                                                <IconLock className="mr-2 h-4 w-4" />
                                                Locked
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {paymentLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <IconLoader className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    {/* 14-Day Restriction Warning */}
                                    {!canEdit && hasPaymentInfo && (
                                        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                                            <IconClock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-amber-700 dark:text-amber-300">
                                                <p className="font-semibold mb-1">Edit Restricted</p>
                                                <p>
                                                    For security reasons, payment information can only be edited once every 14 days.
                                                    You can edit again in <strong>{daysUntilEditable} day(s)</strong> on{' '}
                                                    <strong>{new Date(nextEditableDate!).toLocaleDateString()}</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Last Updated Info */}
                                    {hasPaymentInfo && paymentInfo && !isEditing && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <IconCheck className="h-4 w-4 text-green-600" />
                                            <span>
                                                Last updated: {new Date(paymentInfo.lastUpdated).toLocaleDateString()} at{' '}
                                                {new Date(paymentInfo.lastUpdated).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Display Mode */}
                                    {hasPaymentInfo && !isEditing ? (
                                        <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                                            <div className="grid gap-4 md:grid-cols-3">
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Bank / E-Wallet</Label>
                                                    <p className="font-medium mt-1">
                                                        {BANK_OPTIONS.find(b => b.code === paymentInfo?.bankCode)?.name || paymentInfo?.bankCode}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Account Number</Label>
                                                    <p className="font-mono font-medium mt-1">{paymentInfo?.accountNumber}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-muted-foreground">Account Holder Name</Label>
                                                    <p className="font-medium mt-1">{paymentInfo?.accountHolderName}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Edit Mode */
                                        <div className="space-y-4">
                                            {/* Security Notice */}
                                            <div className="flex gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                                                <IconShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                                <div className="text-sm text-blue-700 dark:text-blue-300">
                                                    <p className="font-semibold mb-1">Secure & Encrypted</p>
                                                    <p>Your payment information is encrypted and stored securely. This will be used to pre-fill withdrawal forms.</p>
                                                </div>
                                            </div>

                                            {/* Bank Selection */}
                                            <div className="space-y-2">
                                                <Label htmlFor="bank" className="font-semibold">
                                                    Bank / E-Wallet *
                                                </Label>
                                                <Select value={bankCode} onValueChange={setBankCode} disabled={!isEditing}>
                                                    <SelectTrigger id="bank">
                                                        <SelectValue placeholder="Select your bank or e-wallet" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                            Banks
                                                        </div>
                                                        {BANK_OPTIONS.filter(b => !['OVO', 'DANA', 'GOPAY'].includes(b.code)).map((bank) => (
                                                            <SelectItem key={bank.code} value={bank.code}>
                                                                <div className="flex items-center gap-2">
                                                                    <IconBuildingBank className="h-4 w-4" />
                                                                    {bank.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                                                            E-Wallets
                                                        </div>
                                                        {BANK_OPTIONS.filter(b => ['OVO', 'DANA', 'GOPAY'].includes(b.code)).map((bank) => (
                                                            <SelectItem key={bank.code} value={bank.code}>
                                                                <div className="flex items-center gap-2">
                                                                    <IconWallet className="h-4 w-4" />
                                                                    {bank.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Account Number */}
                                            <div className="space-y-2">
                                                <Label htmlFor="accountNumber" className="font-semibold">
                                                    Account Number *
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="accountNumber"
                                                        placeholder="Enter your account number"
                                                        value={accountNumber}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '')
                                                            setAccountNumber(value)
                                                            setAccountError("")
                                                            setIsVerified(false)
                                                        }}
                                                        disabled={!isEditing}
                                                        className={`font-mono flex-1 ${accountError ? 'border-red-500' : isVerified ? 'border-green-500' : ''}`}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleVerifyAccount}
                                                        disabled={isVerifying || !bankCode || !accountNumber || !isEditing}
                                                    >
                                                        {isVerifying ? (
                                                            <IconLoader className="h-4 w-4 animate-spin" />
                                                        ) : isVerified ? (
                                                            <IconCheck className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            "Verify"
                                                        )}
                                                    </Button>
                                                </div>
                                                {accountError && (
                                                    <p className="text-xs text-red-500">{accountError}</p>
                                                )}
                                                {isVerified && (
                                                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                                        <IconCheck className="h-4 w-4 text-green-600" />
                                                        <span className="text-xs text-green-700 dark:text-green-300">
                                                            ✓ Account number format is valid
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Account Holder Name */}
                                            <div className="space-y-2">
                                                <Label htmlFor="accountHolder" className="font-semibold">
                                                    Account Holder Name *
                                                </Label>
                                                <Input
                                                    id="accountHolder"
                                                    placeholder="Enter name EXACTLY as registered"
                                                    value={accountHolderName}
                                                    onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                                                    disabled={!isEditing}
                                                    className="uppercase"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    ⚠️ Must match your bank account registration exactly
                                                </p>
                                            </div>

                                            {/* Action Buttons */}
                                            {isEditing && (
                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        onClick={handleSaveClick}
                                                        disabled={!bankCode || !accountNumber || !accountHolderName || !isVerified || isSaving}
                                                        className="flex-1"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <IconCheck className="mr-2 h-4 w-4" />
                                                                Save Payment Information
                                                            </>
                                                        )}
                                                    </Button>
                                                    {hasPaymentInfo && (
                                                        <Button
                                                            variant="outline"
                                                            onClick={handleCancelEdit}
                                                            disabled={isSaving}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Payment Confirmation Dialog */}
            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                                <IconAlertTriangle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <DialogTitle>Confirm Payment Information</DialogTitle>
                                <DialogDescription>
                                    Please review carefully before confirming
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                            <div className="flex gap-2">
                                <IconAlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-700 dark:text-red-300">
                                    <p className="font-bold mb-2">⚠️ Important Warning</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li><strong>This action cannot be reversed for 14 days</strong></li>
                                        <li>Double-check all information before confirming</li>
                                        <li>Incorrect details may result in failed transfers</li>
                                        <li>You are responsible for any errors in account information</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                Payment Information Summary
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Bank / E-Wallet</span>
                                    <span className="font-semibold">
                                        {BANK_OPTIONS.find(b => b.code === bankCode)?.name}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Account Number</span>
                                    <span className="font-mono font-semibold">{accountNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Account Holder</span>
                                    <span className="font-semibold">{accountHolderName}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialogOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "I Understand, Save Information"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
