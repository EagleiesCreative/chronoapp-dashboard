"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconPlus, IconEdit, IconTrash, IconMapPin, IconCurrencyDollar } from "@tabler/icons-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Booth {
  id: string
  client_id: string | null
  active_layout_id: string | null
  name: string
  location: string
  status: string
  created_at: string
  booth_id: string
  dslrbooth_api: string
  dslrbooth_pass: string
  price: number
  booth_code: string
  assigned_to?: string
}

interface Member {
  id: string
  name: string
  email: string
  role: string
}

function generateBoothId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateBoothCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  let code = ''

  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length))
  }

  code += '-'

  for (let i = 0; i < 4; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length))
  }

  return code
}

export default function BoothsPage() {
  const { isLoaded: orgLoaded, organization, membership } = useOrganization()
  const { isLoaded: userLoaded, user } = useUser()
  const [booths, setBooths] = useState<Booth[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [dslrboothApi, setDslrboothApi] = useState("")
  const [dslrboothPass, setDslrboothPass] = useState("")
  const [price, setPrice] = useState("")
  const [assignedTo, setAssignedTo] = useState("")

  // pagination state
  const LIMIT = 5
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  const isAdmin = membership?.role === "org:admin"

  const getMemberName = (userId: string | undefined): string => {
    if (!userId || userId === "__unassigned") return "Unassigned"
    const member = members.find(m => m.id === userId)
    return member ? member.name : "Unknown"
  }

  const fetchBooths = async (opts?: { limit?: number; offset?: number }) => {
    try {
      setLoading(true)
      const l = opts?.limit ?? LIMIT
      const o = opts?.offset ?? offset
      const res = await fetch(`/api/booths?orgId=${organization?.id}&limit=${l}&offset=${o}`)
      if (!res.ok) throw new Error('Failed to fetch booths')
      const data = await res.json()
      setBooths(data.booths || [])
      setTotal(data.count || 0)
    } catch (error) {
      console.error('Error fetching booths:', error)
      toast.error('Failed to load booths')
    } finally {
      setLoading(false)
    }
  }

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true)
      const res = await fetch(`/api/orgs/members?orgId=${organization?.id}`)
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = await res.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Error fetching members:', error)
      toast.error('Failed to load members')
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    if (orgLoaded && userLoaded && organization && user) {
      setOffset(0)
      fetchBooths({ limit: LIMIT, offset: 0 })
      fetchMembers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLoaded, userLoaded, organization, user])

  const handlePageNext = () => {
    const next = offset + LIMIT
    if (next >= total) return
    setOffset(next)
    fetchBooths({ limit: LIMIT, offset: next })
  }

  const handlePagePrev = () => {
    const prev = Math.max(0, offset - LIMIT)
    setOffset(prev)
    fetchBooths({ limit: LIMIT, offset: prev })
  }

  const resetForm = () => {
    setName("")
    setLocation("")
    setDslrboothApi("")
    setDslrboothPass("")
    setPrice("")
    setAssignedTo("")
  }

  const handleCreate = async () => {
    if (!name.trim() || !location.trim() || !price) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!assignedTo) {
      toast.error("Please select an assignee")
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/booths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization?.id,
          name,
          location,
          dslrbooth_api: dslrboothApi,
          dslrbooth_pass: dslrboothPass,
          price: parseFloat(price),
          booth_id: generateBoothId(),
          booth_code: generateBoothCode(),
          assigned_to: assignedTo
        })
      })

      if (!res.ok) throw new Error('Failed to create booth')

      toast.success('Booth created successfully!')
      setIsCreateOpen(false)
      resetForm()
      fetchBooths()
    } catch (error) {
      console.error('Error creating booth:', error)
      toast.error('Failed to create booth')
    } finally {
      setSaving(false)
    }
  }



  const handleDelete = async (boothId: string) => {
    if (!confirm('Delete this booth? This cannot be undone.')) return

    try {
      const res = await fetch('/api/booths', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization?.id,
          boothId
        })
      })

      if (!res.ok) throw new Error('Failed to delete booth')

      toast.success('Booth deleted successfully!')
      fetchBooths()
    } catch (error) {
      console.error('Error deleting booth:', error)
      toast.error('Failed to delete booth')
    }
  }



  if (!orgLoaded || !userLoaded) {
    return (
      <div className="p-4 md:p-6">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-[600px] animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4 md:p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Organization</CardTitle>
            <CardDescription>
              Please select or create an organization to manage booths.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const displayBooths = booths

  const assignableMembers = members.filter(m => m.role !== 'org:admin')

  const createButton = isAdmin ? (
    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => resetForm()}>
          <IconPlus className="mr-2 h-4 w-4" />
          Create Booth
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Booth</DialogTitle>
          <DialogDescription>
            Fill in the booth details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="assignee">Assign to Member *</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="assignee">
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {loadingMembers ? (
                  <div className="p-2 text-sm text-muted-foreground">Loading members...</div>
                ) : assignableMembers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No members available</div>
                ) : (
                  assignableMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="name">Booth Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Booth"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hall A, Booth 12"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="dslrboothApi">DSLR Booth API</Label>
            <Input
              id="dslrboothApi"
              value={dslrboothApi}
              onChange={(e) => setDslrboothApi(e.target.value)}
              placeholder="API endpoint"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="dslrboothPass">DSLR Booth Password</Label>
            <Input
              id="dslrboothPass"
              type="password"
              value={dslrboothPass}
              onChange={(e) => setDslrboothPass(e.target.value)}
              placeholder="Password"
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label htmlFor="price">Price *</Label>
            <Input
              id="price"
              type="number"
              step="1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Booth'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Booth Management</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Manage all booths in your organization' : 'Manage your assigned booths'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {createButton}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Booths</CardTitle>
            <IconMapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayBooths.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Booths</CardTitle>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayBooths.filter(b => b.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booth Price</CardTitle>
            <IconCurrencyDollar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(displayBooths.reduce((sum, b) => sum + b.price, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booths</CardTitle>
          <CardDescription>
            {isAdmin ? 'All booths in your organization' : 'Your assigned booths'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : displayBooths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No booths found</p>
          ) : (
            <div className="space-y-4">
              {displayBooths.map((booth) => {
                return (
                  <div key={booth.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{booth.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {booth.booth_code}
                        </Badge>
                        <Badge variant={booth.status === 'active' ? 'default' : 'secondary'}>
                          {booth.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <IconMapPin className="h-3 w-3" />
                          {booth.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <IconCurrencyDollar className="h-3 w-3" />
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(booth.price)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Booth ID: {booth.booth_id} • Assigned to: {getMemberName(booth.assigned_to)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link href={`/dashboard/booths/${booth.id}`}>
                          <IconEdit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(booth.id)}
                        >
                          <IconTrash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Showing {Math.min(offset + 1, total)} - {Math.min(offset + LIMIT, total)} of {total}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePagePrev} disabled={offset === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={handlePageNext} disabled={offset + LIMIT >= total}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  )
}
