"use client"

import React, { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    IconPhoto,
    IconFolder,
    IconRefresh,
    IconLoader,
    IconX,
    IconCalendar,
    IconChevronRight,
    IconFolderFilled,
    IconDownload
} from "@tabler/icons-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SessionPhoto {
    id: string
    final_image_url: string
    created_at: string
    booth_name: string
    booth_id: string
    event_name?: string
}

interface DateFolder {
    date: string
    displayDate: string
    photos: SessionPhoto[]
    count: number
}

interface GalleryData {
    folders: DateFolder[]
    totalPhotos: number
    totalFolders: number
    hasMore: boolean
    nextPage: number | null
}

export default function GalleryPage() {
    const { isLoaded, organization } = useOrganization()
    const [galleryData, setGalleryData] = useState<GalleryData | null>(null)
    const [loading, setLoading] = useState(true)
    // Path for Google Drive style navigation: [year, month, date]
    const [currentPath, setCurrentPath] = useState<string[]>([])
    const [selectedImage, setSelectedImage] = useState<SessionPhoto | null>(null)

    const fetchGallery = async () => {
        if (!organization?.id) return

        setLoading(true)

        try {
            let currentPage = 1
            let allData: GalleryData | null = null
            let isFetching = true

            while (isFetching) {
                const res = await fetch(`/api/gallery?page=${currentPage}&limit=100`)
                const data = await res.json()

                if (data.error) {
                    throw new Error(data.error)
                }

                if (!allData) {
                    allData = data
                } else {
                    const newFolders: DateFolder[] = [...allData.folders]

                    data.folders.forEach((newFolder: DateFolder) => {
                        const existingIdx = newFolders.findIndex((f: DateFolder) => f.date === newFolder.date)
                        if (existingIdx >= 0) {
                            newFolders[existingIdx].photos = [
                                ...newFolders[existingIdx].photos,
                                ...newFolder.photos
                            ]
                            newFolders[existingIdx].count += newFolder.count
                        } else {
                            newFolders.push(newFolder)
                        }
                    })

                    allData = {
                        ...data,
                        folders: newFolders,
                        totalFolders: newFolders.length,
                        totalPhotos: data.totalPhotos
                    }
                }

                isFetching = data.hasMore
                currentPage++
            }

            if (allData) {
                setGalleryData(allData)
            }
        } catch (error) {
            console.error("Error fetching gallery:", error)
            toast.error("Failed to load gallery")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isLoaded && organization) {
            fetchGallery()
        }
    }, [isLoaded, organization])

    // ── Generate View Data ──
    let viewType = 'empty'
    let viewItems: any[] = []

    if (galleryData && galleryData.folders.length > 0) {
        if (currentPath.length === 0) {
            viewType = 'folders'
            const years = new Map<string, number>()
            galleryData.folders.forEach(f => {
                const year = f.date.split('-')[0]
                years.set(year, (years.get(year) || 0) + f.count)
            })
            viewItems = Array.from(years.entries()).map(([year, count]) => ({
                id: year, title: year, count, path: [year]
            })).sort((a, b) => b.title.localeCompare(a.title))
        }
        else if (currentPath.length === 1) {
            viewType = 'folders'
            const year = currentPath[0]
            const months = new Map<string, number>()
            galleryData.folders.forEach(f => {
                const [y, m] = f.date.split('-')
                if (y === year) {
                    months.set(m, (months.get(m) || 0) + f.count)
                }
            })
            viewItems = Array.from(months.entries()).map(([m, count]) => {
                const monthName = new Date(`${year}-${m}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' })
                return { id: m, title: monthName, count, path: [year, m] }
            }).sort((a, b) => a.id.localeCompare(b.id))
        }
        else if (currentPath.length === 2) {
            viewType = 'folders'
            const year = currentPath[0]
            const month = currentPath[1]
            const days = new Map<string, { count: number, folder: DateFolder }>()
            galleryData.folders.forEach(f => {
                const [y, m, d] = f.date.split('-')
                if (y === year && m === month) {
                    days.set(f.date, { count: f.count, folder: f })
                }
            })
            viewItems = Array.from(days.entries()).map(([date, data]) => {
                const displayDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                return {
                    id: date,
                    title: displayDate,
                    count: data.count,
                    path: [year, month, date],
                    coverPhoto: data.folder.photos[0]
                }
            }).sort((a, b) => b.id.localeCompare(a.id))
        }
        else if (currentPath.length === 3) {
            viewType = 'photos'
            const date = currentPath[2]
            const folder = galleryData.folders.find(f => f.date === date)
            viewItems = folder ? folder.photos : []
        }
    }

    // ── Loading state ──
    if (!isLoaded || loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    // ── No organization ──
    if (!organization) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <IconPhoto className="h-12 w-12 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                            Please select an organization to view the gallery.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 pb-20">
            {/* ── Breadcrumb Header ── */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center flex-wrap gap-1 text-xl sm:text-2xl font-medium tracking-tight overflow-x-auto whitespace-nowrap">
                    <button
                        onClick={() => setCurrentPath([])}
                        className="hover:bg-muted/50 px-2 py-1 rounded-md transition-colors"
                    >
                        My Gallery
                    </button>
                    {currentPath.map((step, idx) => {
                        const path = currentPath.slice(0, idx + 1);
                        let label = step;
                        if (idx === 1) {
                            label = new Date(`${currentPath[0]}-${step}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long' });
                        } else if (idx === 2) {
                            label = new Date(`${step}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }

                        return (
                            <React.Fragment key={step}>
                                <IconChevronRight className="h-5 w-5 text-muted-foreground mx-0.5 shrink-0" />
                                <button
                                    onClick={() => setCurrentPath(path)}
                                    className="hover:bg-muted/50 px-2 py-1 rounded-md transition-colors max-w-[200px] truncate"
                                    title={label}
                                >
                                    {label}
                                </button>
                            </React.Fragment>
                        )
                    })}
                </div>

                <div className="flex items-center gap-2 pl-4 shrink-0">
                    {galleryData && currentPath.length === 0 && (
                        <Badge variant="secondary" className="hidden sm:inline-flex">
                            {galleryData.totalPhotos} photos
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchGallery()}
                        disabled={loading}
                        className="h-9 w-9 shrink-0"
                    >
                        <IconRefresh
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>
            </div>

            {/* ── Main Content ── */}
            {viewType === 'empty' ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <IconPhoto className="h-14 w-14 text-muted-foreground/40 mb-4" />
                        <h3 className="text-base font-medium mb-1">
                            No Photos Yet
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Photos from your photobooth sessions will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : viewType === 'folders' ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {viewItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentPath(item.path)}
                                className="group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all duration-200 text-left hover:border-primary/30 hover:shadow-sm"
                            >
                                <IconFolderFilled className="h-10 w-10 text-muted-foreground/50 group-hover:text-primary/70 transition-colors shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-semibold text-sm truncate">{item.title}</span>
                                    <span className="text-xs text-muted-foreground mt-0.5">{item.count} items</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Root level load more if needed has been removed since we fetch all sessions */}
                </>
            ) : (
                /* ── Photo Grid ── */
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
                                        {new Date(photo.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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
                                    e.stopPropagation();
                                    try {
                                        const response = await fetch(selectedImage.final_image_url);
                                        if (!response.ok) throw new Error("Network response was not ok");
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.style.display = 'none';
                                        a.href = url;
                                        
                                        const baseName = selectedImage.event_name || selectedImage.booth_name;
                                        const safeBoothName = baseName ? baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'camera';
                                        a.download = `framr_${safeBoothName}_${new Date().getTime()}.jpg`;
                                        
                                        document.body.appendChild(a);
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                        document.body.removeChild(a);
                                    } catch (err) {
                                        console.error("Download failed:", err);
                                        toast.error("Failed to download image");
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
                                    e.stopPropagation();
                                    setSelectedImage(null);
                                }}
                            >
                                <IconX className="h-4 w-4 mr-1" />
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
