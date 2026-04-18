"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { IconLoader } from "@tabler/icons-react"

interface Booth {
  id: string
  client_id: string | null
  active_layout_id: string | null
  name: string
  location: string
  status: string
  created_at: string
  booth_id: string
  price: number
  booth_code: string
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

export default function FramrDashboard() {
  const { isLoaded: orgLoaded, organization, membership } = useOrganization()
  const { isLoaded: userLoaded, user } = useUser()
  const [booths, setBooths] = useState<Booth[]>([])
  const [loading, setLoading] = useState(true)

  const [activeFilter, setActiveFilter] = useState("All")
  const [selectedDevice, setSelectedDevice] = useState<Booth | null>(null)
  const [search, setSearch] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBooth, setNewBooth] = useState({ name: "", location: "", price: "" })
  const [saving, setSaving] = useState(false)

  // Sub panel state
  const [boothStats, setBoothStats] = useState<{ sessions: number, photos: number } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const isAdmin = membership?.role === "org:admin"

  const fetchBooths = async () => {
    try {
      setLoading(true)
      // fetch all devices without pagination for this view since filter is local now
      const res = await fetch(`/api/booths?orgId=${organization?.id}&limit=1000&offset=0`)
      if (!res.ok) throw new Error('Failed to fetch booths')
      const data = await res.json()
      setBooths(data.booths || [])
    } catch (error) {
      console.error('Error fetching booths:', error)
      toast.error('Failed to load booths')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgLoaded && userLoaded && organization && user) {
      fetchBooths()
    }
  }, [orgLoaded, userLoaded, organization, user])

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
    if (selectedDevice?.id === booth.id) {
      setSelectedDevice(null)
      return
    }
    setSelectedDevice(booth)
    setBoothStats(null)
    fetchBoothStats(booth.id)
  }

  const handleCreate = async () => {
    if (!newBooth.name.trim() || !newBooth.location.trim() || !newBooth.price) {
      toast.error("Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/booths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: organization?.id,
          name: newBooth.name,
          location: newBooth.location,
          price: parseFloat(newBooth.price) || 0,
          booth_id: generateBoothId(),
          booth_code: generateBoothCode()
        })
      })

      if (!res.ok) throw new Error('Failed to create booth')

      toast.success('Booth created successfully!')
      setShowCreateModal(false)
      setNewBooth({ name: "", location: "", price: "" })
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
      if (selectedDevice?.id === boothId) {
        setSelectedDevice(null)
      }
      fetchBooths()
    } catch (error) {
      console.error('Error deleting booth:', error)
      toast.error('Failed to delete booth')
    }
  }

  if (!orgLoaded || !userLoaded) {
    return (
      <div className="flex h-screen items-center justify-center w-full p-4">
        <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex h-screen flex-col items-center justify-center w-full p-4">
        <h2 className="text-xl font-medium">No Organization</h2>
        <p className="text-sm text-gray-500 mt-2">Please select or create an organization to manage booths.</p>
      </div>
    )
  }

  // Normalizing status mappings based on convention defined in plan
  const normalizeStatus = (status: string) => {
    const s = (status || "").toLowerCase()
    if (s === 'active' || s === 'online') return 'online'
    return 'offline' // 'maintenance', 'error', 'offline'
  }

  const filters = ["All", "Online", "Offline"]

  const filtered = booths.filter((d) => {
    const norm = normalizeStatus(d.status)
    const matchFilter =
      activeFilter === "All" ||
      (activeFilter === "Online" && norm === "online") ||
      (activeFilter === "Offline" && norm === "offline")
    
    // Safety fallback for empty properties
    const sName = d.name || ""
    const sLoc = d.location || ""
    const sCode = d.booth_code || ""

    const matchSearch =
      sName.toLowerCase().includes(search.toLowerCase()) ||
      sLoc.toLowerCase().includes(search.toLowerCase()) ||
      sCode.toLowerCase().includes(search.toLowerCase())
      
    return matchFilter && matchSearch
  })

  const online = booths.filter((d) => normalizeStatus(d.status) === "online").length
  const offline = booths.filter((d) => normalizeStatus(d.status) === "offline").length

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "row", overflow: "hidden", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "#fafaf9", color: "#1a1a18" }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 28px" }}>
        <div style={{ marginBottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.4px" }}>Devices</div>
            <div style={{ fontSize: 13.5, color: "#9a9288", marginTop: 3 }}>Manage all your photobooth devices across locations</div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ height: 32, padding: "0 14px", borderRadius: 7, background: "#2d1f10", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Create booth
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total devices", val: booths.length, note: "Registered booths", color: "#1a1a18" },
            { label: "Online now", val: online, note: "Active & reachable", color: "#16a34a", dot: true },
            { label: "Offline", val: offline, note: offline === 0 ? "No issues" : "Needs attention", color: offline > 0 ? "#dc2626" : "#b0a898" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 11.5, color: "#b0a898", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, color: s.color, display: "flex", alignItems: "center", gap: 7 }}>
                {s.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
                {s.val}
              </div>
              <div style={{ fontSize: 12, color: "#b0a898", marginTop: 4 }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div style={{ background: "#fff", border: "1px solid #ede9e3", borderRadius: 14, overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0ece6" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  height: 28, padding: "0 12px", borderRadius: 6,
                  border: activeFilter === f ? "1px solid #c8b89a" : "1px solid #ede9e3",
                  background: activeFilter === f ? "#f5f0ea" : "transparent",
                  color: activeFilter === f ? "#2d1f10" : "#9a9288",
                  fontSize: 12.5, fontWeight: activeFilter === f ? 500 : 400, cursor: "pointer"
                }}>{f}</button>
              ))}
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                    <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L13 13" /></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search devices…" style={{ paddingLeft: 28, paddingRight: 10, height: 30, width: 200, border: "1px solid #ede9e3", borderRadius: 7, fontSize: 12.5, background: "#faf8f5", outline: "none", color: "#1a1a18" }} />
                </div>
                <button onClick={() => fetchBooths()} disabled={loading} style={{ background: "transparent", border: "1px solid #ede9e3", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "#1a1a18", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <IconLoader className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #f0ece6" }}>
                {["Device ID", "Name", "Location", "Created", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "9px 16px", fontSize: 11, fontWeight: 600, color: "#b0a898", textAlign: "left", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && booths.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#b0a898", fontSize: 13.5 }}>
                    Loading devices...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#b0a898", fontSize: 13.5 }}>
                    No devices match your search.
                  </td>
                </tr>
              )}
              {filtered.map(d => {
                const isOnline = normalizeStatus(d.status) === "online"
                return (
                  <tr key={d.id}
                    onClick={() => handleRowClick(d)}
                    style={{ borderBottom: "1px solid #f8f5f1", cursor: "pointer", background: selectedDevice?.id === d.id ? "#faf7f3" : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (selectedDevice?.id !== d.id) e.currentTarget.style.background = "#faf8f5" }}
                    onMouseLeave={e => { if (selectedDevice?.id !== d.id) e.currentTarget.style.background = "transparent" }}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#9a9288", background: "#f5f2ee", padding: "3px 7px", borderRadius: 5 }}>{d.booth_code}</span>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 500, color: "#1a1a18" }}>{d.name}</td>
                    <td style={{ padding: "13px 16px", fontSize: 13, color: "#6b6358" }}>{d.location || "Not set"}</td>
                    <td style={{ padding: "13px 16px", fontSize: 12.5, color: "#b0a898" }}>{d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 9px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                        background: isOnline ? "#dcfce7" : "#f3f0eb",
                        color: isOnline ? "#15803d" : "#9a9288",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#22c55e" : "#c0b8ac" }} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                        <button onClick={e => { e.stopPropagation(); handleRowClick(d); }} style={{ height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid #ede9e3", background: "#fff", fontSize: 12, color: "#6b6358", cursor: "pointer" }}>View</button>
                        <Link href={`/dashboard/booths/${d.id}?tab=settings`} onClick={e => e.stopPropagation()} style={{ height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid #ede9e3", background: "#fff", fontSize: 12, color: "#6b6358", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center" }}>Edit</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ padding: "11px 16px", borderTop: "1px solid #f0ece6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, color: "#b0a898" }}>Showing {filtered.length} of {booths.length} devices</span>
          </div>
        </div>
      </div>

      {/* Device detail panel */}
      {selectedDevice && (
        <div style={{ width: 300, borderLeft: "1px solid #ede9e3", background: "#fff", padding: "20px 20px", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Device details</div>
            <button onClick={() => setSelectedDevice(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#b0a898", fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ width: "100%", height: 90, borderRadius: 10, background: "linear-gradient(135deg,#f5f0ea,#e8ddd0)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round">
              <rect x="4" y="8" width="28" height="20" rx="3" /><path d="M4 16h28M12 28v3M24 28v3M9 31h18" />
            </svg>
          </div>
          {[
            { label: "Device ID", val: selectedDevice.booth_code, mono: true },
            { label: "Name", val: selectedDevice.name },
            { label: "Location", val: selectedDevice.location || "Not set" },
            { label: "Status", val: normalizeStatus(selectedDevice.status) === "online" ? "Online" : "Offline" },
            { label: "Sessions", val: loadingStats ? "..." : (boothStats?.sessions || 0) },
            { label: "Photos Captures", val: loadingStats ? "..." : (boothStats?.photos || 0) },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#b0a898", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{row.label}</div>
              <div style={{ fontSize: 13.5, color: "#1a1a18", fontFamily: row.mono ? "monospace" : "inherit" }}>{row.val}</div>
            </div>
          ))}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href={`/dashboard/booths/${selectedDevice.id}?tab=settings`} style={{ width: "100%", height: 34, borderRadius: 8, background: "#2d1f10", color: "#fff", border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Manage device</Link>
            {isAdmin && (
              <button onClick={() => handleDelete(selectedDevice.id)} style={{ width: "100%", height: 34, borderRadius: 8, background: "transparent", color: "#dc2626", border: "1px solid #fecaca", fontSize: 13, cursor: "pointer" }}>Remove device</button>
            )}
          </div>
        </div>
      )}

      {/* Create booth modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Add new booth</div>
            <div style={{ fontSize: 13, color: "#9a9288", marginBottom: 22 }}>Register a new photobooth device</div>
            {[{ label: "Booth name", key: "name", placeholder: "e.g. Kemang Studio", type: "text" }, { label: "Location", key: "location", placeholder: "e.g. Jakarta Selatan", type: "text" }, { label: "Cost limit / Price", key: "price", placeholder: "35000", type: "number" }].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#6b6358", marginBottom: 6 }}>{f.label} *</div>
                <input
                  type={f.type}
                  value={(newBooth as any)[f.key]}
                  onChange={e => setNewBooth({ ...newBooth, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  style={{ width: "100%", height: 36, padding: "0 12px", border: "1px solid #ede9e3", borderRadius: 8, fontSize: 13.5, color: "#1a1a18", outline: "none", background: "#faf8f5" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 22 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, height: 36, borderRadius: 8, border: "1px solid #ede9e3", background: "transparent", fontSize: 13.5, color: "#6b6358", cursor: "pointer" }}>Cancel</button>
              <button onClick={handleCreate} disabled={saving} style={{ flex: 1, height: 36, borderRadius: 8, background: "#2d1f10", color: "#fff", border: "none", fontSize: 13.5, fontWeight: 500, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Creating..." : "Create booth"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
