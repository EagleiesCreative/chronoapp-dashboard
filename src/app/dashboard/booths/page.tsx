"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  IconPlus,
  IconMapPin,
  IconCurrencyDollar,
  IconUser,
  IconClock,
  IconDeviceDesktop,
  IconCircleFilled,
  IconEdit,
  IconTrash,
  IconTicket
} from "@tabler/icons-react"

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

  // Slide-out panel state
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [boothStats, setBoothStats] = useState<{ sessions: number, photos: number } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Create form state
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [dslrboothApi, setDslrboothApi] = useState("")
  const [dslrboothPass, setDslrboothPass] = useState("")
  const [price, setPrice] = useState("")
  const [assignedTo, setAssignedTo] = useState("")

  // Pagination state
  const LIMIT = 10
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
      if (selectedBooth?.id === boothId) {
        setIsPanelOpen(false)
        setSelectedBooth(null)
      }
      fetchBooths()
    } catch (error) {
      console.error('Error deleting booth:', error)
      toast.error('Failed to delete booth')
    }
  }

  const fetchBoothStats = async (id: string) => {
    try {
      setLoadingStats(true)
      const res = await fetch(`/api/booths/${id}/stats`)
      if (res.ok) {
        const data = await res.json()
        setBoothStats(data)
      } else {
        setBoothStats({ sessions: 0, photos: 0 })
      }
    } catch (err) {
      console.error("Error fetching booth stats:", err)
      setBoothStats({ sessions: 0, photos: 0 })
    } finally {
      setLoadingStats(false)
    }
  }

  const handleRowClick = (booth: Booth) => {
    setSelectedBooth(booth)
    setBoothStats(null) // reset while loading
    setIsPanelOpen(true)
    fetchBoothStats(booth.id)
  }

  const renderStatus = (status: string) => {
    const isActive = status === 'active' || status === 'Online'
    const isMaintenance = status === 'maintenance' || status === 'Maintenance'

    if (isActive) {
      return (
        <span className="flex items-center gap-2">
          <IconCircleFilled className="h-4 w-4 text-success" />
          <span className="text-success text-sm font-medium">Online</span>
        </span>
      )
    } else if (isMaintenance) {
      return (
        <span className="flex items-center gap-2">
          <IconCircleFilled className="h-4 w-4 text-warning" />
          <span className="text-warning text-sm font-medium">Maintenance</span>
        </span>
      )
    } else {
      return (
        <span className="flex items-center gap-2">
          <IconCircleFilled className="h-4 w-4 text-error" />
          <span className="text-error text-sm font-medium">Offline</span>
        </span>
      )
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
        <div className="max-w-md p-6 border rounded-lg shadow-sm text-center">
          <h2 className="text-lg font-semibold mb-2">No Organization</h2>
          <p className="text-sm text-muted-foreground">
            Please select or create an organization to manage booths.
          </p>
        </div>
      </div>
    )
  }

  const assignableMembers = members.filter(m => m.role !== 'org:admin')

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Manage all your photobooth devices across locations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
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
                  <DialogDescription>Fill in the booth details below.</DialogDescription>
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
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Booth" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="location">Location *</Label>
                    <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hall A, Booth 12" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="dslrboothApi">DSLR Booth API</Label>
                    <Input id="dslrboothApi" value={dslrboothApi} onChange={(e) => setDslrboothApi(e.target.value)} placeholder="API endpoint" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="dslrboothPass">DSLR Booth Password</Label>
                    <Input id="dslrboothPass" type="password" value={dslrboothPass} onChange={(e) => setDslrboothPass(e.target.value)} placeholder="Password" />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="price">Price *</Label>
                    <Input id="price" type="number" step="1000" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating...' : 'Create Booth'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Device ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading devices...</TableCell>
              </TableRow>
            ) : booths.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No records found.</TableCell>
              </TableRow>
            ) : (
              booths.map((booth) => (
                <TableRow
                  key={booth.id}
                  className={`h-16 cursor-pointer transition-colors ${selectedBooth?.id === booth.id ? 'bg-muted/80' : 'hover:bg-muted/50'}`}
                  onClick={() => handleRowClick(booth)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {booth.booth_code}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {booth.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {booth.location}
                  </TableCell>
                  <TableCell>
                    {renderStatus(booth.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(offset + 1, total || 0)} - {Math.min(offset + LIMIT, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePagePrev} disabled={offset === 0}>Previous</Button>
            <Button variant="outline" size="sm" onClick={handlePageNext} disabled={offset + LIMIT >= total || total === 0}>Next</Button>
          </div>
        </div>
      </div>

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-4">
          {selectedBooth && (
            <div className="flex flex-col h-full">
              <SheetHeader className="pb-6 border-b">
                <div className="flex justify-between items-start pt-4">
                  <div>
                    <SheetTitle className="text-xl font-bold">{selectedBooth.name}</SheetTitle>
                    <SheetDescription asChild>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md">
                          <IconDeviceDesktop className="h-4 w-4 text-primary" />
                          <span className="font-mono text-xs font-semibold">{selectedBooth.booth_code}</span>
                        </div>
                        {renderStatus(selectedBooth.status)}
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="py-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconMapPin className="h-4 w-4 text-blue-500" />
                      Location
                    </div>
                    <div className="text-sm font-semibold truncate" title={selectedBooth.location}>
                      {selectedBooth.location || "Not set"}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconUser className="h-4 w-4 text-purple-500" />
                      Assigned To
                    </div>
                    <div className="text-sm font-semibold truncate" title={getMemberName(selectedBooth.assigned_to)}>
                      {getMemberName(selectedBooth.assigned_to)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconCurrencyDollar className="h-4 w-4 text-emerald-500" />
                      Cost Limit / Price
                    </div>
                    <div className="text-sm font-semibold">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(selectedBooth.price)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconClock className="h-4 w-4 text-orange-500" />
                      Created
                    </div>
                    <div className="text-sm font-semibold">
                      {selectedBooth.created_at ? formatDistanceToNow(new Date(selectedBooth.created_at), { addSuffix: true }) : "-"}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconDeviceDesktop className="h-4 w-4 text-blue-500" />
                      Total Photos
                    </div>
                    <div className="text-sm font-semibold">
                      {loadingStats ? (
                        <span className="inline-block w-8 h-4 animate-pulse bg-muted rounded" />
                      ) : (
                        boothStats?.photos || 0
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <IconMapPin className="h-4 w-4 text-purple-500" />
                      Sessions
                    </div>
                    <div className="text-sm font-semibold">
                      {loadingStats ? (
                        <span className="inline-block w-8 h-4 animate-pulse bg-muted rounded" />
                      ) : (
                        boothStats?.sessions || 0
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <IconTicket className="h-4 w-4 text-muted-foreground" />
                    Management & Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="w-full justify-start text-left font-normal" asChild>
                      <Link href={`/dashboard/booths/${selectedBooth.id}?tab=settings`}>
                        <IconEdit className="h-4 w-4 mr-2" />
                        Edit Configuration
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" asChild>
                      <Link href={`/dashboard/booths/${selectedBooth.id}?tab=vouchers`}>
                        <IconTicket className="h-4 w-4 mr-2" />
                        Manage Vouchers
                      </Link>
                    </Button>
                  </div>

                  {isAdmin && (
                    <div className="pt-4">
                      <Button
                        variant="destructive"
                        className="w-full bg-error/10 text-error hover:bg-error/20 border-0"
                        onClick={() => handleDelete(selectedBooth.id)}
                      >
                        <IconTrash className="h-4 w-4 mr-2" />
                        Delete Device
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
