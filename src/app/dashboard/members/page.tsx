"use client"

import { OrganizationSwitcher, SignedIn, OrganizationList } from "@clerk/nextjs"
import { useOrganization } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconUserPlus, IconUsers, IconMail, IconTrash, IconCrown, IconPercentage, IconLoader } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export default function MembersPage() {
  const { isLoaded, organization, membership, invitations, memberships } = useOrganization({
    memberships: {
      pageSize: 50,
      keepPreviousData: false,
      infinite: false,
    },
    invitations: {
      pageSize: 50,
      keepPreviousData: false,
      infinite: false,
    }
  })

  const [isCreating, setIsCreating] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"org:admin" | "org:member">("org:member")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [emailError, setEmailError] = useState("")

  // Revenue share state (per-member)
  const [memberShares, setMemberShares] = useState<Record<string, number>>({})
  const [isSavingShare, setIsSavingShare] = useState<string | null>(null)
  const [isLoadingShare, setIsLoadingShare] = useState(true)

  // Fetch revenue share settings for all members
  useEffect(() => {
    const fetchRevenueShare = async () => {
      if (!organization?.id) return
      try {
        const res = await fetch('/api/orgs/revenue-share')
        const data = await res.json()
        if (data.memberShares) {
          setMemberShares(data.memberShares)
        }
      } catch (error) {
        console.error("Error fetching revenue share:", error)
      } finally {
        setIsLoadingShare(false)
      }
    }
    fetchRevenueShare()
  }, [organization?.id])

  // Email validation helper
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleEmailChange = (value: string) => {
    setInviteEmail(value)
    // Clear error when user starts typing
    if (emailError) setEmailError("")
  }

  if (!isLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-[600px] animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  // Show organization selector if no org or creating new one
  if (!organization || isCreating) {
    return (
      <SignedIn>
        <div className="flex flex-col gap-6 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
            {organization && (
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select or Create Organization</CardTitle>
              <CardDescription>
                Choose an existing organization or create a new one to manage members and settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationList
                hidePersonal
                afterSelectOrganizationUrl="/dashboard/members"
                afterCreateOrganizationUrl="/dashboard/members"
              />
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    )
  }

  const isAdmin = membership?.role === "org:admin"
  const totalMembers = memberships?.count || 0
  const pendingInvites = invitations?.count || 0

  // Redirect non-admins to dashboard
  if (membership && !isAdmin) {
    return (
      <SignedIn>
        <div className="flex flex-col items-center justify-center min-h-[400px] p-4 md:p-6">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You need administrator privileges to access the Members page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href="/dashboard">Go to Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    )
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      setEmailError("Email address is required")
      toast.error("Please enter an email address")
      return
    }

    if (!validateEmail(inviteEmail)) {
      setEmailError("Please enter a valid email address")
      toast.error("Invalid email format")
      return
    }

    setIsInviting(true)
    try {
      const res = await fetch('/api/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organization?.id, emailAddress: inviteEmail, role: inviteRole })
      })

      if (!res.ok) throw new Error('Invite failed')

      // refresh invitations client-side
      await organization?.getInvitations()

      setInviteEmail("")
      setInviteRole("org:member")
      setEmailError("")
      setIsInviteOpen(false)
      toast.success("Invitation sent successfully!")
    } catch (error) {
      console.error("Error inviting member:", error)
      toast.error("Failed to send invitation. Please try again.")
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: "org:admin" | "org:member") => {
    try {
      const res = await fetch('/api/orgs/member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: organization?.id, memberId, action: 'updateRole', newRole })
      })

      if (!res.ok) throw new Error('Update role failed')

      toast.success("Role updated successfully!")
      // Refetch memberships to update the UI
      await organization?.getMemberships()
    } catch (error) {
      console.error("Error updating role:", error)
      toast.error("Failed to update role. Please try again.")
    }
  }

  const saveRevenueShare = async (memberId: string, percent: number) => {
    setIsSavingShare(memberId)
    try {
      const res = await fetch('/api/orgs/revenue-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, clientPercent: percent })
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('API Error Response:', data)
        throw new Error(data.error || data.details || 'Failed to save')
      }

      // Update local state
      setMemberShares(prev => ({ ...prev, [memberId]: percent }))
      toast.success("Revenue share updated!")
    } catch (error: any) {
      console.error("Error saving revenue share:", error)
      toast.error(error.message || "Failed to update revenue share")
    } finally {
      setIsSavingShare(null)
    }
  }

  return (
    <SignedIn>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={organization.imageUrl} alt={organization.name} />
              <AvatarFallback>{organization.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
              <p className="text-sm text-muted-foreground">Organization Members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "!h-9 !rounded-md !border"
                }
              }}
            />
            <Button variant="outline" onClick={() => setIsCreating(true)}>
              Create New
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
              <IconMail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvites}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <IconCrown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{membership?.role?.replace('org:', '') || 'Member'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList>
            <TabsTrigger value="members">Members ({totalMembers})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({pendingInvites})</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <Card className="p-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Members</CardTitle>
                    <CardDescription>Manage your organization members and their roles</CardDescription>
                  </div>
                  {isAdmin && (
                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <IconUserPlus className="mr-2 h-4 w-4" />
                          Invite Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Member</DialogTitle>
                          <DialogDescription>
                            Enter the email address and role for the new member.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="">
                          <div className=" my-4">
                            <Label htmlFor="email" className="mb-4">Email Address</Label>
                            <Input
                              id="email"
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => handleEmailChange(e.target.value)}
                              placeholder="name@example.com"
                              className={emailError ? "border-red-500" : ""}
                            />
                            {emailError && (
                              <p className="text-sm text-red-500 mt-2">{emailError}</p>
                            )}
                          </div>
                          <div className="mt-4">
                            <Label htmlFor="role" className="mb-4">Role</Label>
                            <Select
                              value={inviteRole}
                              onValueChange={(value) => setInviteRole(value as "org:admin" | "org:member")}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="org:member">Member</SelectItem>
                                <SelectItem value="org:admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleInviteMember}
                            disabled={isInviting}
                          >
                            {isInviting ? "Inviting..." : "Send Invitation"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {memberships?.data?.map((member) => {
                    const userData = member.publicUserData
                    if (!userData) return null
                    const userId = userData.userId || member.id
                    const currentShare = memberShares[userId] ?? 80

                    return (
                      <div key={member.id} className="border-b py-4 last:border-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={userData.imageUrl} />
                              <AvatarFallback>
                                {userData.firstName?.[0]}
                                {userData.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {userData.firstName} {userData.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {userData.identifier}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateRole(member.id, value as "org:admin" | "org:member")}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="org:member">Member</SelectItem>
                                <SelectItem value="org:admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            {isAdmin && userData.userId !== membership?.publicUserData?.userId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  if (confirm('Remove this member?')) {
                                    try {
                                      const res = await fetch('/api/orgs/member', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ orgId: organization?.id, memberId: member.id, action: 'remove' })
                                      })

                                      if (!res.ok) throw new Error('Remove failed')

                                      toast.success("Member removed successfully!")
                                      await organization?.getMemberships()
                                    } catch (error) {
                                      console.error("Error removing member:", error)
                                      toast.error("Failed to remove member.")
                                    }
                                  }
                                }}
                              >
                                <IconTrash className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Revenue Share for non-admin members */}
                        {isAdmin && member.role === "org:member" && (
                          <div className="mt-4 ml-12 p-4 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-3">
                              <IconPercentage className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">Revenue Share</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <Slider
                                  value={[currentShare]}
                                  onValueChange={(value) => {
                                    setMemberShares(prev => ({ ...prev, [userId]: value[0] }))
                                  }}
                                  max={100}
                                  min={0}
                                  step={5}
                                  className="w-full"
                                />
                                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                  <span>Client: <span className="font-semibold text-primary">{currentShare}%</span></span>
                                  <span>Org: <span className="font-semibold">{100 - currentShare}%</span></span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => saveRevenueShare(userId, currentShare)}
                                disabled={isSavingShare === userId}
                              >
                                {isSavingShare === userId ? (
                                  <IconLoader className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>Invitations sent to join your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {invitations?.data?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending invitations</p>
                ) : (
                  <div className="space-y-4">
                    {invitations?.data?.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-medium">{invitation.emailAddress}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited {new Date(invitation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{invitation.role?.replace('org:', '')}</Badge>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={async () => {
                                if (confirm('Revoke this invitation?')) {
                                  try {
                                    const res = await fetch('/api/orgs/invite/revoke', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ orgId: organization?.id, invitationId: invitation.id })
                                    })

                                    if (!res.ok) throw new Error('Revoke failed')

                                    toast.success("Invitation revoked successfully!")
                                    await organization?.getInvitations()
                                  } catch (error) {
                                    console.error("Error revoking invitation:", error)
                                    toast.error("Failed to revoke invitation.")
                                  }
                                }
                              }}
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="space-y-4">
              {/* Note about per-member revenue share */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <IconPercentage className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Revenue Share Settings</CardTitle>
                      <CardDescription>Revenue share is now set per-member in the Members tab</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Go to the <strong>Members</strong> tab to set individual revenue share percentages for each client member.
                  </p>
                </CardContent>
              </Card>

              {/* Organization Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>Manage your organization profile and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <p className="text-sm text-muted-foreground">{organization.name}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Created</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(organization.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (confirm('Delete this organization? This cannot be undone.')) {
                        try {
                          const res = await fetch('/api/orgs/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ orgId: organization?.id })
                          })

                          if (!res.ok) throw new Error('Delete org failed')

                          toast.success("Organization deleted successfully!")
                          window.location.href = '/dashboard/members'
                        } catch (error) {
                          console.error("Error deleting organization:", error)
                          toast.error("Failed to delete organization.")
                        }
                      }
                    }}
                  >
                    <IconTrash className="mr-2 h-4 w-4" />
                    Delete Organization
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SignedIn>
  )
}
