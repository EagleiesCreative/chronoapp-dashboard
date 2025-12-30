"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { IconPhoto, IconFolder, IconChevronDown, IconChevronRight, IconRefresh, IconLoader } from "@tabler/icons-react"
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
}

export default function GalleryPage() {
    const { isLoaded, organization } = useOrganization()
    const [galleryData, setGalleryData] = useState<GalleryData | null>(null)
    const [loading, setLoading] = useState(true)
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const fetchGallery = async () => {
        if (!organization?.id) return

        setLoading(true)
        try {
            const res = await fetch('/api/gallery')
            const data = await res.json()

            if (data.error) {
                throw new Error(data.error)
            }

            setGalleryData(data)
            // Auto-expand first folder if exists
            if (data.folders && data.folders.length > 0) {
                setExpandedFolders(new Set([data.folders[0].date]))
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

    const toggleFolder = (date: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(date)) {
                next.delete(date)
            } else {
                next.add(date)
            }
            return next
        })
    }

    if (!isLoaded || loading) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>No Organization</CardTitle>
                        <CardDescription>Please select an organization to view the gallery.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Photo Gallery</h1>
                    <p className="text-sm text-muted-foreground">
                        Browse your photobooth sessions organized by date
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {galleryData && (
                        <Badge variant="secondary" className="text-sm">
                            {galleryData.totalPhotos} Photos
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchGallery} disabled={loading}>
                        <IconRefresh className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Gallery Content */}
            {!galleryData || galleryData.folders.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <IconPhoto className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No Photos Yet</h3>
                        <p className="text-sm text-muted-foreground">
                            Photos from your photobooth sessions will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {galleryData.folders.map((folder) => {
                        const isExpanded = expandedFolders.has(folder.date)
                        const previewPhotos = folder.photos.slice(0, 4)

                        return (
                            <Card key={folder.date} className="overflow-hidden">
                                {/* Folder Header */}
                                <div
                                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => toggleFolder(folder.date)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <IconChevronDown className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <IconChevronRight className="h-5 w-5 text-muted-foreground" />
                                        )}
                                        <IconFolder className="h-5 w-5 text-primary" />
                                        <div>
                                            <h3 className="font-medium">{folder.displayDate}</h3>
                                            <p className="text-sm text-muted-foreground">{folder.count} Photos</p>
                                        </div>
                                    </div>

                                    {/* Preview Thumbnails (when collapsed) */}
                                    {!isExpanded && (
                                        <div className="flex gap-1">
                                            {previewPhotos.map((photo, idx) => (
                                                <div
                                                    key={photo.id}
                                                    className="w-12 h-12 rounded overflow-hidden bg-muted"
                                                >
                                                    <img
                                                        src={photo.final_image_url}
                                                        alt={`Preview ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                            {folder.count > 4 && (
                                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                                                    +{folder.count - 4}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Photo Grid */}
                                {isExpanded && (
                                    <CardContent className="pt-0">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                            {folder.photos.map((photo) => (
                                                <div
                                                    key={photo.id}
                                                    className="group relative aspect-[3/4] rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                    onClick={() => setSelectedImage(photo.final_image_url)}
                                                >
                                                    <img
                                                        src={photo.final_image_url}
                                                        alt="Session photo"
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="absolute bottom-2 left-2 right-2">
                                                            <p className="text-white text-xs font-medium truncate">
                                                                {photo.booth_name}
                                                            </p>
                                                            <p className="text-white/70 text-xs">
                                                                {new Date(photo.created_at).toLocaleTimeString('en-US', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] p-4">
                        <img
                            src={selectedImage}
                            alt="Full size"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                        />
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setSelectedImage(null)}
                        >
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
