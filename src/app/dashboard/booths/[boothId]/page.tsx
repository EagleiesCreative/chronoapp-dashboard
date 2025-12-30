"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect, use } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconArrowLeft, IconEdit, IconTrash } from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

export default function EditBoothPage({ params }: { params: Promise<{ boothId: string }> }) {
    const { boothId } = use(params)
    const { isLoaded: orgLoaded, organization, membership } = useOrganization()
    const { isLoaded: userLoaded, user } = useUser()
    const router = useRouter()

    const [booth, setBooth] = useState<Booth | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form state
    const [name, setName] = useState("")
    const [location, setLocation] = useState("")
    const [dslrboothApi, setDslrboothApi] = useState("")
    const [dslrboothPass, setDslrboothPass] = useState("")
    const [price, setPrice] = useState("")
    const [assignedTo, setAssignedTo] = useState("")

    const isAdmin = membership?.role === "org:admin"

    const fetchBooth = async () => {
        try {
            setLoading(true)
            // We need a way to fetch a single booth. 
            // Currently the API only supports fetching all with pagination.
            // We might need to update the API or filter client side if the list is small, 
            // but for a detail page, a specific endpoint is better.
            // For now, let's try to fetch all and find it, or update the API.
            // Let's update the API to support fetching by ID in the GET request if we provide a specific ID param?
            // Actually, the current GET route takes query params. Let's assume we can filter by ID or just fetch all and find.
            // Since we don't have a single-fetch endpoint yet, I'll fetch all and find. 
            // OPTIMIZATION: Should update API to fetch single booth.
            const res = await fetch(`/api/booths?orgId=${organization?.id}&limit=100`)
            if (!res.ok) throw new Error('Failed to fetch booth')
            const data = await res.json()
            const foundBooth = data.booths.find((b: Booth) => b.id === boothId)

            if (foundBooth) {
                setBooth(foundBooth)
                setName(foundBooth.name)
                setLocation(foundBooth.location)
                setDslrboothApi(foundBooth.dslrbooth_api)
                setDslrboothPass(foundBooth.dslrbooth_pass)
                setPrice(foundBooth.price.toString())
                setAssignedTo(foundBooth.assigned_to || "")
            } else {
                toast.error("Booth not found")
                router.push("/dashboard/booths")
            }
        } catch (error) {
            console.error('Error fetching booth:', error)
            toast.error('Failed to load booth')
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
            fetchBooth()
            fetchMembers()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgLoaded, userLoaded, organization, user])

    const handleSave = async () => {
        if (!booth) return
        if (!name.trim() || !location.trim() || !price) {
            toast.error("Please fill in all required fields")
            return
        }

        setSaving(true)
        try {
            const assignedPayload = assignedTo === "__unassigned" ? null : (assignedTo || null)

            const res = await fetch('/api/booths', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId: organization?.id,
                    boothId: booth.id,
                    name,
                    location,
                    dslrbooth_api: dslrboothApi,
                    dslrbooth_pass: dslrboothPass,
                    price: parseFloat(price),
                    assigned_to: assignedPayload
                })
            })

            if (!res.ok) {
                const errorText = await res.text()
                console.error('Failed to update booth:', res.status, errorText)
                throw new Error(`Failed to update booth: ${res.status} ${errorText}`)
            }

            toast.success('Booth updated successfully!')
            fetchBooth() // Refresh data
        } catch (error) {
            console.error('Error updating booth:', error)
            toast.error('Failed to update booth')
        } finally {
            setSaving(false)
        }
    }

    const assignableMembers = members.filter(m => m.role !== 'org:admin')

    if (loading) {
        return <div className="p-8">Loading...</div>
    }

    if (!booth) {
        return <div className="p-8">Booth not found</div>
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/booths">
                        <IconArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Edit Booth</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage settings for {booth.name}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="settings" className="w-full">
                <TabsList>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Booth Settings</CardTitle>
                            <CardDescription>
                                Update general information and configuration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="edit-assignee">Assign to Member</Label>
                                    <Select value={assignedTo} onValueChange={setAssignedTo} disabled={!isAdmin}>
                                        <SelectTrigger id="edit-assignee">
                                            <SelectValue placeholder="Select a member" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__unassigned">Unassigned</SelectItem>
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
                                    <Label htmlFor="edit-name">Booth Name *</Label>
                                    <Input
                                        id="edit-name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="edit-location">Location *</Label>
                                    <Input
                                        id="edit-location"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="edit-dslrboothApi">DSLR Booth API</Label>
                                    <Input
                                        id="edit-dslrboothApi"
                                        value={dslrboothApi}
                                        onChange={(e) => setDslrboothApi(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="edit-dslrboothPass">DSLR Booth Password</Label>
                                    <Input
                                        id="edit-dslrboothPass"
                                        type="password"
                                        value={dslrboothPass}
                                        onChange={(e) => setDslrboothPass(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <Label htmlFor="edit-price">Price *</Label>
                                    <Input
                                        id="edit-price"
                                        type="number"
                                        step="1000"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="vouchers" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Voucher Settings</CardTitle>
                            <CardDescription>
                                Manage vouchers for this booth.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <VoucherManager boothId={booth.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function VoucherManager({ boothId }: { boothId: string }) {
    const [vouchers, setVouchers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [editingVoucher, setEditingVoucher] = useState<string | null>(null)

    // New voucher form
    const [code, setCode] = useState("")
    const [discountAmount, setDiscountAmount] = useState("")
    const [discountType, setDiscountType] = useState("fixed")
    const [maxUses, setMaxUses] = useState("")
    const [expiresAt, setExpiresAt] = useState("")

    const fetchVouchers = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/vouchers?boothId=${boothId}`)
            if (!res.ok) throw new Error('Failed to fetch vouchers')
            const data = await res.json()
            setVouchers(data.vouchers || [])
        } catch (error) {
            console.error('Error fetching vouchers:', error)
            toast.error('Failed to load vouchers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVouchers()
    }, [boothId])

    const handleSave = async () => {
        if (!code || !discountAmount) {
            toast.error("Code and amount are required")
            return
        }

        setCreating(true)
        try {
            const url = editingVoucher ? '/api/vouchers' : '/api/vouchers'
            const method = editingVoucher ? 'PUT' : 'POST'
            const body: any = {
                boothId,
                code,
                discountAmount: parseFloat(discountAmount),
                discountType,
                maxUses: maxUses ? parseInt(maxUses) : null,
                expiresAt: expiresAt || null
            }

            if (editingVoucher) {
                body.id = editingVoucher
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) {
                if (res.status === 409) {
                    toast.error('Voucher code already exists')
                    return
                }
                throw new Error('Failed to save voucher')
            }

            toast.success(editingVoucher ? 'Voucher updated!' : 'Voucher created!')
            resetForm()
            fetchVouchers()
        } catch (error) {
            console.error('Error saving voucher:', error)
            toast.error('Failed to save voucher')
        } finally {
            setCreating(false)
        }
    }

    const handleEdit = (v: any) => {
        setEditingVoucher(v.id)
        setCode(v.code)
        setDiscountAmount(v.discount_amount.toString())
        setDiscountType(v.discount_type)
        setMaxUses(v.max_uses ? v.max_uses.toString() : "")
        setExpiresAt(v.expires_at ? new Date(v.expires_at).toISOString().slice(0, 16) : "")
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this voucher?")) return

        try {
            const res = await fetch(`/api/vouchers?id=${id}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Failed to delete voucher')

            toast.success('Voucher deleted')
            fetchVouchers()
        } catch (error) {
            console.error('Error deleting voucher:', error)
            toast.error('Failed to delete voucher')
        }
    }

    const resetForm = () => {
        setEditingVoucher(null)
        setCode("")
        setDiscountAmount("")
        setDiscountType("fixed")
        setMaxUses("")
        setExpiresAt("")
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/10">
                <div className="space-y-2">
                    <Label>Voucher Code</Label>
                    <Input
                        placeholder="e.g. SUMMER2025"
                        value={code}
                        onChange={e => setCode(e.target.value.toUpperCase())}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Amount"
                            value={discountAmount}
                            onChange={e => setDiscountAmount(e.target.value)}
                        />
                        <Select value={discountType} onValueChange={setDiscountType}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fixed">Fixed</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Max Uses (Optional)</Label>
                    <Input
                        type="number"
                        placeholder="Unlimited"
                        value={maxUses}
                        onChange={e => setMaxUses(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Expires At (Optional)</Label>
                    <Input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={e => setExpiresAt(e.target.value)}
                    />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                    {editingVoucher && (
                        <Button variant="outline" onClick={resetForm} disabled={creating}>
                            Cancel
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={creating}>
                        {creating ? 'Saving...' : (editingVoucher ? 'Update Voucher' : 'Create Voucher')}
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-medium">Active Vouchers</h3>
                {loading ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                ) : vouchers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No vouchers found.</div>
                ) : (
                    <div className="border rounded-md divide-y">
                        {vouchers.map((v) => (
                            <div key={v.id} className="p-3 flex justify-between items-center">
                                <div>
                                    <div className="font-medium">{v.code}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {v.discount_type === 'fixed' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(v.discount_amount) : `${v.discount_amount}%`} off
                                        {v.max_uses && ` • ${v.used_count}/${v.max_uses} used`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-sm text-muted-foreground">
                                        {v.expires_at ? new Date(v.expires_at).toLocaleDateString() : 'No expiry'}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(v)}>
                                            <IconEdit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
                                            <IconTrash className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
