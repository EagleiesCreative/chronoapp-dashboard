"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    IconPhoto,
    IconRefresh,
    IconLoader,
    IconX,
    IconChevronRight,
    IconFolderFilled,
    IconDownload,
    IconPackage,
    IconCircleCheck,
    IconTrash
} from "@tabler/icons-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionPhoto {
    id: string
    final_image_url: string
    created_at: string
    booth_name: string
    booth_id: string
    event_name?: string
}

interface DateFolder {
    date: string        // YYYY-MM-DD
    displayDate: string
    photos: SessionPhoto[]
    count: number
}

interface SessionGroup {
    sessionId: string
    sessionName: string
    totalPhotos: number
    sameMonth: boolean
    folders: DateFolder[]
}

interface BoothGroup {
    boothId: string
    boothName: string
    totalPhotos: number
    sessions: SessionGroup[]
}

interface GalleryData {
    booths: BoothGroup[]
    totalPhotos: number
    hasMore: boolean
    nextPage: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const isMonthKey = (s: string) => s.length === 7   // "YYYY-MM"
const isDateKey = (s: string) => s.length === 10  // "YYYY-MM-DD"
const BULK_MAX = 200                              // max photos per ZIP
const BATCH_SIZE = 5                                // concurrent fetches

function monthLabel(key: string) {
    const [yr, mo] = key.split('-')
    return new Date(`${yr}-${mo}-01T00:00:00`).toLocaleDateString('en-US', {
        month: 'long', year: 'numeric'
    })
}

function dateLabel(key: string, format: 'short' | 'full' = 'short') {
    const opts: Intl.DateTimeFormatOptions = format === 'full'
        ? { weekday: 'long', month: 'long', day: 'numeric' }
        : { weekday: 'short', month: 'short', day: 'numeric' }
    return new Date(key + 'T00:00:00').toLocaleDateString('en-US', opts)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GalleryPage() {
    const [galleryData, setGalleryData] = useState<GalleryData | null>(null)
    const [loading, setLoading] = useState(true)
    // Path: [boothId?, sessionId?, month|date?, date?]
    const [currentPath, setCurrentPath] = useState<string[]>([])
    const [selectedImage, setSelectedImage] = useState<SessionPhoto | null>(null)

    // Bulk download state
    const [downloading, setDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const downloadAbortRef = useRef(false)

    // Delete confirmation state
    interface DeleteTarget { label: string; sessionIds: string[] }
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
    const [deleting, setDeleting] = useState(false)

    const confirmDelete = (label: string, sessionIds: string[]) => {
        if (!sessionIds.length) return
        setDeleteTarget({ label, sessionIds })
    }

    const performDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const res = await fetch('/api/gallery', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionIds: deleteTarget.sessionIds })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Delete failed')
            toast.success(`Deleted ${data.deleted} photo${data.deleted === 1 ? '' : 's'} from "${deleteTarget.label}"`)
            setDeleteTarget(null)
            // Navigate up one level if we're inside the deleted folder
            setCurrentPath(p => p.slice(0, Math.max(0, p.length - 1)))
            await fetchGallery()
        } catch (err: any) {
            console.error('Delete error:', err)
            toast.error(err.message || 'Failed to delete')
        } finally {
            setDeleting(false)
        }
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchGallery = useCallback(async () => {
        setLoading(true)
        try {
            let currentPage = 1
            let allData: GalleryData | null = null
            let isFetching = true

            while (isFetching) {
                const res = await fetch(`/api/gallery?page=${currentPage}&limit=100`)
                const data = await res.json()
                if (data.error) throw new Error(data.error)

                if (!allData) {
                    allData = data
                } else {
                    const mergedBooths: BoothGroup[] = [...allData.booths]

                    data.booths.forEach((incomingBooth: BoothGroup) => {
                        const bi = mergedBooths.findIndex((b: BoothGroup) => b.boothId === incomingBooth.boothId)

                        if (bi >= 0) {
                            const mergedSessions: SessionGroup[] = [...mergedBooths[bi].sessions]

                            incomingBooth.sessions.forEach((incomingSess: SessionGroup) => {
                                const si = mergedSessions.findIndex((s: SessionGroup) => s.sessionId === incomingSess.sessionId)

                                if (si >= 0) {
                                    const mergedFolders: DateFolder[] = [...mergedSessions[si].folders]
                                    incomingSess.folders.forEach((newFolder: DateFolder) => {
                                        const fi = mergedFolders.findIndex((f: DateFolder) => f.date === newFolder.date)
                                        if (fi >= 0) {
                                            mergedFolders[fi] = {
                                                ...mergedFolders[fi],
                                                photos: [...mergedFolders[fi].photos, ...newFolder.photos],
                                                count: mergedFolders[fi].count + newFolder.count
                                            }
                                        } else {
                                            mergedFolders.push(newFolder)
                                        }
                                    })
                                    mergedSessions[si] = {
                                        ...mergedSessions[si],
                                        folders: mergedFolders,
                                        totalPhotos: mergedSessions[si].totalPhotos + incomingSess.totalPhotos
                                    }
                                } else {
                                    mergedSessions.push(incomingSess)
                                }
                            })

                            mergedBooths[bi] = {
                                ...mergedBooths[bi],
                                sessions: mergedSessions,
                                totalPhotos: mergedBooths[bi].totalPhotos + incomingBooth.totalPhotos
                            }
                        } else {
                            mergedBooths.push(incomingBooth)
                        }
                    })

                    allData = { ...data, booths: mergedBooths }
                }

                isFetching = data.hasMore
                currentPage++
            }

            if (allData) setGalleryData(allData)
        } catch (error) {
            console.error("Error fetching gallery:", error)
            toast.error("Failed to load gallery")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchGallery() }, [fetchGallery])

    // ── Bulk ZIP download ─────────────────────────────────────────────────────
    //
    // Everything runs in the browser — images are fetched from R2/CDN directly,
    // zipped client-side with JSZip (STORE mode = no CPU-wasteful re-compression
    // since JPEGs are already compressed), then saved via file-saver.
    // Server load: ZERO.

    const downloadAllAsZip = async (photos: SessionPhoto[], zipName: string) => {
        if (photos.length === 0) return

        if (photos.length > BULK_MAX) {
            toast.error(
                `Too many photos (${photos.length}). Max ${BULK_MAX} per download. ` +
                `Browse into a smaller date folder.`
            )
            return
        }

        downloadAbortRef.current = false
        setDownloading(true)
        setDownloadProgress(0)

        const toastId = toast.loading(
            `Preparing ${photos.length} photos…`,
            { duration: Infinity }
        )

        try {
            // Dynamic import → only loaded on demand
            const JSZip = (await import('jszip')).default
            const { saveAs } = await import('file-saver')
            const zip = new JSZip()

            let completed = 0
            let failed = 0

            // Fetch images in batches of BATCH_SIZE
            for (let i = 0; i < photos.length; i += BATCH_SIZE) {
                if (downloadAbortRef.current) break

                const batch = photos.slice(i, i + BATCH_SIZE)
                await Promise.all(
                    batch.map(async (photo, batchIdx) => {
                        try {
                            const res = await fetch(photo.final_image_url)
                            if (!res.ok) throw new Error(`HTTP ${res.status}`)
                            const blob = await res.blob()
                            // Derive extension from URL, strip query params
                            const ext = photo.final_image_url.split('.').pop()?.split('?')[0] || 'jpg'
                            const num = String(i + batchIdx + 1).padStart(4, '0')
                            const ts = new Date(photo.created_at)
                                .toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
                            zip.file(`${ts}_${num}.${ext}`, blob)
                        } catch {
                            failed++
                        }

                        completed++
                        const pct = Math.round((completed / photos.length) * 90) // 0–90%
                        setDownloadProgress(pct)
                        toast.loading(
                            `Downloading… ${completed} / ${photos.length}`,
                            { id: toastId, duration: Infinity }
                        )
                    })
                )
            }

            if (downloadAbortRef.current) {
                toast.dismiss(toastId)
                toast.info("Download cancelled")
                return
            }

            // Generate ZIP (90–100%)
            toast.loading("Compressing ZIP…", { id: toastId, duration: Infinity })
            const zipBlob = await zip.generateAsync(
                {
                    type: 'blob',
                    // STORE = no re-compression (JPEGs are already compressed)
                    // Using DEFLATE here would waste CPU with negligible size savings
                    compression: 'STORE',
                    streamFiles: true
                },
                (meta) => setDownloadProgress(90 + Math.round(meta.percent * 0.1))
            )

            const safeName = zipName.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase()
            saveAs(zipBlob, `${safeName}.zip`)

            if (failed > 0) {
                toast.warning(
                    `Downloaded ${completed - failed} photos (${failed} failed to load).`,
                    { id: toastId, duration: 5000 }
                )
            } else {
                toast.success(
                    `${completed} photos saved as ${safeName}.zip`,
                    { id: toastId, duration: 5000 }
                )
            }
        } catch (err) {
            console.error("Bulk download error:", err)
            toast.error("Download failed. Please try again.", { id: toastId })
        } finally {
            setDownloading(false)
            setDownloadProgress(0)
        }
    }

    // ── Derive view from path ─────────────────────────────────────────────────

    type ViewType = 'empty' | 'booths' | 'sessions' | 'months' | 'dates' | 'photos'
    let viewType: ViewType = 'empty'
    let viewItems: any[] = []
    let currentPhotos: SessionPhoto[] = []   // photos in current view (for bulk download)
    let zipLabel = 'gallery'                 // human-readable name for the ZIP file

    if (galleryData && galleryData.booths.length > 0) {
        if (currentPath.length === 0) {
            // Root — booths: count = number of sessions inside
            viewType = 'booths'
            viewItems = galleryData.booths.map(b => {
                const n = b.sessions.length
                return {
                    id: b.boothId,
                    title: b.boothName,
                    count: n,
                    countLabel: n === 1 ? 'session' : 'sessions',
                    path: [b.boothId]
                }
            })

        } else if (currentPath.length === 1) {
            // Sessions inside a booth: count = number of date/month folders inside
            const booth = galleryData.booths.find(b => b.boothId === currentPath[0])
            if (booth) {
                viewType = 'sessions'
                zipLabel = booth.boothName
                viewItems = booth.sessions.map(sg => {
                    const n = sg.sameMonth
                        ? sg.folders.length
                        : new Set(sg.folders.map(f => f.date.slice(0, 7))).size
                    const unit = sg.sameMonth ? 'date' : 'month'
                    // All session IDs in this session (for delete)
                    const sessionIds = sg.folders.flatMap(f => f.photos.map(p => p.id))
                    return {
                        id: sg.sessionId,
                        title: sg.sessionName,
                        count: n,
                        countLabel: n === 1 ? unit : `${unit}s`,
                        path: [currentPath[0], sg.sessionId],
                        sessionIds,
                        deletable: true
                    }
                })
            }

        } else if (currentPath.length === 2) {
            const booth = galleryData.booths.find(b => b.boothId === currentPath[0])
            const sess = booth?.sessions.find(s => s.sessionId === currentPath[1])

            if (sess) {
                zipLabel = `${booth?.boothName}_${sess.sessionName}`
                if (sess.sameMonth) {
                    // Dates inside a single-month session: count = photos in that date
                    viewType = 'dates'
                    viewItems = sess.folders.map(f => ({
                        id: f.date,
                        title: dateLabel(f.date, 'full'),
                        count: f.count,
                        countLabel: f.count === 1 ? 'photo' : 'photos',
                        path: [currentPath[0], currentPath[1], f.date],
                        sessionIds: f.photos.map(p => p.id),
                        deletable: true
                    }))
                } else {
                    // Month folders: count = number of dates inside each month
                    viewType = 'months'
                    const monthMap = new Map<string, number>()
                    sess.folders.forEach(f => {
                        const m = f.date.slice(0, 7)
                        monthMap.set(m, (monthMap.get(m) || 0) + 1)
                    })
                    viewItems = Array.from(monthMap.entries())
                        .map(([m, n]) => {
                            const sessionIds = sess.folders
                                .filter(f => f.date.startsWith(m))
                                .flatMap(f => f.photos.map(p => p.id))
                            return {
                                id: m,
                                title: monthLabel(m),
                                count: n,
                                countLabel: n === 1 ? 'date' : 'dates',
                                path: [currentPath[0], currentPath[1], m],
                                sessionIds,
                                deletable: true
                            }
                        })
                        .sort((a, b) => b.id.localeCompare(a.id))
                }
            }

        } else if (currentPath.length === 3) {
            const booth = galleryData.booths.find(b => b.boothId === currentPath[0])
            const sess = booth?.sessions.find(s => s.sessionId === currentPath[1])
            const segment = currentPath[2]

            if (sess) {
                if (isMonthKey(segment)) {
                    viewType = 'dates'
                    zipLabel = `${booth?.boothName}_${sess.sessionName}_${segment}`
                    viewItems = sess.folders
                        .filter(f => f.date.startsWith(segment))
                        .map(f => ({
                            id: f.date,
                            title: dateLabel(f.date, 'full'),
                            count: f.count,
                            countLabel: f.count === 1 ? 'photo' : 'photos',
                            path: [currentPath[0], currentPath[1], segment, f.date],
                            sessionIds: f.photos.map(p => p.id),
                            deletable: true
                        }))
                        .sort((a, b) => b.id.localeCompare(a.id))
                } else if (isDateKey(segment)) {
                    viewType = 'photos'
                    zipLabel = `${booth?.boothName}_${sess.sessionName}_${segment}`
                    const folder = sess.folders.find(f => f.date === segment)
                    viewItems = folder ? folder.photos : []
                    currentPhotos = viewItems
                }
            }

        } else if (currentPath.length === 4) {
            const booth = galleryData.booths.find(b => b.boothId === currentPath[0])
            const sess = booth?.sessions.find(s => s.sessionId === currentPath[1])
            const folder = sess?.folders.find(f => f.date === currentPath[3])
            viewType = 'photos'
            zipLabel = `${booth?.boothName}_${sess?.sessionName}_${currentPath[3]}`
            viewItems = folder ? folder.photos : []
            currentPhotos = viewItems
        }
    }

    // ── Breadcrumb label ──────────────────────────────────────────────────────

    function breadcrumbLabel(step: string, idx: number): string {
        if (!galleryData) return step
        if (idx === 0) {
            return galleryData.booths.find(b => b.boothId === step)?.boothName || step
        }
        if (idx === 1) {
            const booth = galleryData.booths.find(b => b.boothId === currentPath[0])
            return booth?.sessions.find(s => s.sessionId === step)?.sessionName || step
        }
        if (isMonthKey(step)) return monthLabel(step)
        if (isDateKey(step)) return dateLabel(step, 'short')
        return step
    }

    // ── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6 pb-20">

            {/* ── Sticky Breadcrumb Bar ── */}
            <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    {/* Breadcrumb path */}
                    <div className="flex items-center flex-wrap gap-1 text-lg sm:text-xl font-medium tracking-tight overflow-x-auto whitespace-nowrap min-w-0">
                        <button
                            onClick={() => setCurrentPath([])}
                            className="hover:bg-muted/60 px-2 py-1 rounded-md transition-colors shrink-0"
                        >
                            Gallery
                        </button>
                        {currentPath.map((step, idx) => {
                            const path = currentPath.slice(0, idx + 1)
                            const label = breadcrumbLabel(step, idx)
                            return (
                                <React.Fragment key={step + idx}>
                                    <IconChevronRight className="h-4 w-4 text-muted-foreground mx-0.5 shrink-0" />
                                    <button
                                        onClick={() => setCurrentPath(path)}
                                        className="hover:bg-muted/60 px-2 py-1 rounded-md transition-colors max-w-[180px] truncate"
                                        title={label}
                                    >
                                        {label}
                                    </button>
                                </React.Fragment>
                            )
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pl-4 shrink-0">
                        {/* Storage bar — only shown at root */}
                        {galleryData && currentPath.length === 0 && (
                            <div className="hidden sm:flex flex-col items-end gap-1 mr-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                    <span>Storage (Est.)</span>
                                    <span className={cn(
                                        "font-semibold",
                                        (galleryData.totalPhotos * 5 * 1024 * 1024) > 900 * 1024 * 1024
                                            ? "text-destructive"
                                            : "text-foreground"
                                    )}>
                                        {((galleryData.totalPhotos * 5 * 1024 * 1024) / (1024 * 1024 * 1024)).toFixed(2)} GB / 1 GB
                                    </span>
                                </div>
                                <div className="h-1.5 w-40 bg-muted rounded-full overflow-hidden border border-border/50">
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            (galleryData.totalPhotos * 5 * 1024 * 1024) > 900 * 1024 * 1024
                                                ? "bg-destructive"
                                                : "bg-primary"
                                        )}
                                        style={{
                                            width: `${Math.min(
                                                ((galleryData.totalPhotos * 5 * 1024 * 1024) / (1024 * 1024 * 1024)) * 100,
                                                100
                                            )}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Bulk download — only shown on photos view */}
                        {viewType === 'photos' && currentPhotos.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={downloading}
                                onClick={() => downloadAllAsZip(currentPhotos, zipLabel)}
                                className="h-9 gap-1.5 text-xs font-medium"
                            >
                                {downloading ? (
                                    <>
                                        <IconLoader className="h-3.5 w-3.5 animate-spin" />
                                        {downloadProgress}%
                                    </>
                                ) : (
                                    <>
                                        <IconPackage className="h-3.5 w-3.5" />
                                        Download ZIP
                                        <span className="text-muted-foreground">
                                            ({currentPhotos.length > BULK_MAX
                                                ? `max ${BULK_MAX}`
                                                : currentPhotos.length})
                                        </span>
                                    </>
                                )}
                            </Button>
                        )}

                        {/* Refresh */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchGallery}
                            disabled={loading}
                            className="h-9 w-9 shrink-0"
                        >
                            <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* Download progress bar */}
                {downloading && (
                    <div className="h-0.5 bg-muted">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* ── Main Content ── */}
            <div className="px-4 md:px-6">
                {viewType === 'empty' ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-20">
                            <IconPhoto className="h-14 w-14 text-muted-foreground/40 mb-4" />
                            <h3 className="text-base font-medium mb-1">No Photos Yet</h3>
                            <p className="text-sm text-muted-foreground">
                                Photos from your photobooth sessions will appear here.
                            </p>
                        </CardContent>
                    </Card>

                ) : viewType === 'photos' ? (
                    /* ── Photo Grid ── */
                    <>
                        {currentPhotos.length > BULK_MAX && (
                            <div className="flex items-center gap-2 text-xs text-warning mb-4 px-1">
                                <IconCircleCheck className="h-4 w-4 shrink-0" />
                                This folder has {currentPhotos.length} photos. ZIP download is capped at {BULK_MAX}. Browse into a specific date for smaller batches.
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {viewItems.map((photo: SessionPhoto) => (
                                <div
                                    key={photo.id}
                                    className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted cursor-pointer ring-1 ring-border/50 hover:ring-2 hover:ring-primary/50 transition-all duration-200 shadow-sm hover:shadow"
                                    onClick={() => setSelectedImage(photo)}
                                >
                                    <Image
                                        src={photo.final_image_url}
                                        alt="Session photo"
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <p className="text-white text-xs font-semibold truncate leading-tight">
                                                {photo.booth_name}
                                            </p>
                                            <p className="text-white/80 text-[10px] uppercase tracking-wider mt-0.5">
                                                {new Date(photo.created_at).toLocaleTimeString("en-US", {
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>

                ) : (
                    /* ── Folder Grid (booths / sessions / months / dates) ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {viewItems.map((item: any) => (
                            <div key={item.id} className="group relative">
                                {/* Navigate button */}
                                <button
                                    onClick={() => setCurrentPath(item.path)}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all duration-200 text-left hover:border-primary/30 hover:shadow-sm"
                                >
                                    <IconFolderFilled className="h-10 w-10 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-semibold text-sm truncate">{item.title}</span>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                            {item.count} {item.countLabel ?? 'items'}
                                        </span>
                                    </div>
                                </button>

                                {/* Delete button — only for sessions / months / dates */}
                                {item.deletable && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            confirmDelete(item.title, item.sessionIds)
                                        }}
                                        title={`Delete "${item.title}"`}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm"
                                    >
                                        <IconTrash className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Lightbox Modal ── */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative w-full h-full max-w-5xl max-h-[100vh] p-4 flex items-center justify-center">
                        <div className="relative w-full h-[90vh]">
                            <Image
                                src={selectedImage.final_image_url}
                                alt="Full size"
                                fill
                                sizes="100vw"
                                className="object-contain"
                                priority
                            />
                        </div>
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-sm"
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                        const response = await fetch(selectedImage.final_image_url)
                                        if (!response.ok) throw new Error("Network response was not ok")
                                        const blob = await response.blob()
                                        const url = window.URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.style.display = 'none'
                                        a.href = url
                                        const baseName = selectedImage.event_name || selectedImage.booth_name
                                        const safeName = baseName
                                            ? baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
                                            : 'photo'
                                        a.download = `framr_${safeName}_${Date.now()}.jpg`
                                        document.body.appendChild(a)
                                        a.click()
                                        window.URL.revokeObjectURL(url)
                                        document.body.removeChild(a)
                                    } catch (err) {
                                        console.error("Download failed:", err)
                                        toast.error("Failed to download image")
                                    }
                                }}
                            >
                                <IconDownload className="h-4 w-4 mr-1" />
                                Download
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-black/50 hover:bg-black/70 text-white border-white/20 backdrop-blur-sm"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedImage(null)
                                }}
                            >
                                <IconX className="h-4 w-4 mr-1" />
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Dialog ── */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete folder?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    You are about to permanently delete{' '}
                                    <span className="font-semibold text-foreground">
                                        &ldquo;{deleteTarget?.label}&rdquo;
                                    </span>{' '}
                                    and all{' '}
                                    <span className="font-semibold text-foreground">
                                        {deleteTarget?.sessionIds.length} photo
                                        {deleteTarget?.sessionIds.length === 1 ? '' : 's'}
                                    </span>{' '}
                                    inside it.
                                </p>
                                <p className="text-destructive font-medium text-sm">
                                    This action cannot be undone. Photos will be removed from storage permanently.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleting}
                            onClick={(e) => {
                                e.preventDefault()
                                performDelete()
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                        >
                            {deleting ? (
                                <>
                                    <IconLoader className="h-4 w-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <IconTrash className="h-4 w-4" />
                                    Delete permanently
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
