"use client"

import { useState, useEffect } from "react"
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
} from "@tabler/icons-react"
import { toast } from "sonner"

interface SessionPhoto {
    id: string
    final_image_url: string
    created_at: string
    booth_name: string
    booth_id: string
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
    const [loadingMore, setLoadingMore] = useState(false)
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const fetchGallery = async (page = 1, append = false) => {
        if (!organization?.id) return

        if (append) {
            setLoadingMore(true)
        } else {
            setLoading(true)
        }

        try {
            const res = await fetch(`/api/gallery?page=${page}&limit=50`)
            const data = await res.json()

            if (data.error) {
                throw new Error(data.error)
            }

            if (append && galleryData) {
                // Merge folders if the same date spans across pages
                const newFolders = [...galleryData.folders]

                data.folders.forEach((newFolder: DateFolder) => {
                    const existingIdx = newFolders.findIndex((f) => f.date === newFolder.date)
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

                setGalleryData({
                    ...data,
                    folders: newFolders,
                    totalFolders: newFolders.length,
                    totalPhotos: data.totalPhotos // updated total from api
                })
            } else {
                setGalleryData(data)
                // Auto-select first folder on initial load
                if (data.folders && data.folders.length > 0 && !selectedFolder) {
                    setSelectedFolder(data.folders[0].date)
                }
            }
        } catch (error) {
            console.error("Error fetching gallery:", error)
            toast.error("Failed to load gallery")
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        if (isLoaded && organization) {
            fetchGallery(1, false)
        }
    }, [isLoaded, organization])

    const activeFolderData = galleryData?.folders.find(
        (f) => f.date === selectedFolder
    )

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
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Gallery
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Browse sessions organized by date
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {galleryData && (
                        <Badge variant="secondary" className="text-xs">
                            {galleryData.totalPhotos} photos
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchGallery(1, false)}
                        disabled={loading}
                    >
                        <IconRefresh
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>
            </div>

            {/* ── Empty state ── */}
            {!galleryData || galleryData.folders.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <IconPhoto className="h-14 w-14 text-muted-foreground/40 mb-4" />
                        <h3 className="text-base font-medium mb-1">
                            No Photos Yet
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Photos from your photobooth sessions will appear
                            here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* ── Folder Grid ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {galleryData.folders.map((folder) => {
                            const isActive = selectedFolder === folder.date
                            const coverPhoto = folder.photos[0]

                            return (
                                <button
                                    key={folder.date}
                                    onClick={() =>
                                        setSelectedFolder(
                                            isActive ? null : folder.date
                                        )
                                    }
                                    className={`
                                        group relative flex flex-col rounded-xl overflow-hidden
                                        border bg-card text-left transition-all duration-200
                                        hover:shadow-md hover:border-primary/30
                                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                                        ${isActive ? "ring-2 ring-primary border-primary shadow-md" : "border-border"}
                                    `}
                                >
                                    {/* Cover thumbnail */}
                                    <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                                        {coverPhoto ? (
                                            <Image
                                                src={coverPhoto.final_image_url}
                                                alt={folder.displayDate}
                                                fill
                                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <IconFolder className="h-10 w-10 text-muted-foreground/30" />
                                            </div>
                                        )}

                                        {/* Photo count badge */}
                                        <div className="absolute top-2 right-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
                                                <IconPhoto className="h-3 w-3" />
                                                {folder.count}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Folder info */}
                                    <div className="p-3 space-y-0.5">
                                        <p className="text-sm font-medium leading-tight truncate">
                                            {new Date(
                                                folder.date + "T00:00:00"
                                            ).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <IconCalendar className="h-3 w-3" />
                                            {new Date(
                                                folder.date + "T00:00:00"
                                            ).toLocaleDateString("en-US", {
                                                weekday: "long",
                                            })}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* ── Load More Folders ── */}
                    {galleryData.hasMore && (
                        <div className="flex justify-center mt-4 mb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchGallery(galleryData.nextPage || 2, true)}
                                disabled={loadingMore}
                                className="w-full max-w-[200px]"
                            >
                                {loadingMore ? (
                                    <>
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    'Load Older Sessions'
                                )}
                            </Button>
                        </div>
                    )}

                    {/* ── Selected Folder Photos ── */}
                    {activeFolderData && (
                        <div className="space-y-4 pt-4 border-t mt-2">
                            {/* Section header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <IconFolder className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold">
                                            {activeFolderData.displayDate}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">{activeFolderData.count} photos in this folder</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 rounded-full bg-muted/50 hover:bg-muted"
                                    onClick={() => setSelectedFolder(null)}
                                >
                                    <IconX className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Photo grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {activeFolderData.photos.map((photo) => (
                                    <div
                                        key={photo.id}
                                        className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted cursor-pointer ring-1 ring-border/50 hover:ring-2 hover:ring-primary/50 transition-all duration-200 shadow-sm hover:shadow"
                                        onClick={() =>
                                            setSelectedImage(
                                                photo.final_image_url
                                            )
                                        }
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
                                                    {new Date(
                                                        photo.created_at
                                                    ).toLocaleTimeString(
                                                        "en-US",
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
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
                                src={selectedImage}
                                alt="Full size"
                                fill
                                sizes="100vw"
                                className="object-contain"
                                priority
                            />
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-white/20"
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
            )}
        </div>
    )
}
