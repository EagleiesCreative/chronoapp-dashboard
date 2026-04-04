"use client"

import { useState, useEffect, useCallback } from "react"
import { useOrganization } from "@clerk/nextjs"
import { Plus, Layout, Grid, Loader2, ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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
import { Card, CardContent } from "@/components/ui/card"
import { FrameBuilder } from "@/components/dashboard/frames/FrameBuilder"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

interface Frame {
    id: string
    name: string
    image_url: string
    photo_slots: PhotoSlot[]
    canvas_width: number
    canvas_height: number
    is_active: boolean
    price: number
    booth_id?: string | null
    booth_session_id?: string | null
    booths?: { name: string } | null
    booth_sessions?: { name: string } | null
}

interface PhotoSlot {
    id: string
    x: number
    y: number
    width: number
    height: number
    rotation: number
    layer: 'above' | 'below'
    capture_index: number
}

export default function FramesPage() {
    const { isLoaded, organization } = useOrganization()
    const [view, setView] = useState<'list' | 'builder'>('list')
    const [frames, setFrames] = useState<Frame[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null)
    const [frameToDelete, setFrameToDelete] = useState<Frame | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchFrames = useCallback(async () => {
        if (!organization?.id) return
        setLoading(true)
        try {
            const res = await fetch(`/api/frames`)
            const data = await res.json()
            if (res.ok) {
                setFrames(data.data)
            }
        } catch (err) {
            console.error("Failed to fetch frames", err)
        } finally {
            setLoading(false)
        }
    }, [organization?.id])

    useEffect(() => {
        if (isLoaded && organization) {
            fetchFrames()
        }
    }, [isLoaded, organization, fetchFrames])

    const handleCreateNew = () => {
        setSelectedFrame(null)
        setView('builder')
    }

    const handleEdit = (frame: Frame) => {
        setSelectedFrame(frame)
        setView('builder')
    }

    const handleSaveSuccess = () => {
        setView('list')
        fetchFrames()
    }

    const handleDelete = async () => {
        if (!frameToDelete) return
        setDeleting(true)
        try {
            const res = await fetch(`/api/frames/${frameToDelete.id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                toast.success("Frame archived successfully")
                fetchFrames()
                setFrameToDelete(null)
            } else {
                toast.error("Failed to archive frame")
            }
        } catch (err) {
            console.error("Delete error:", err)
            toast.error("Internal server error")
        } finally {
            setDeleting(false)
        }
    }

    if (!isLoaded || !organization) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading organization context...</p>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-10 space-y-8">
            <AnimatePresence mode="wait">
                {view === 'list' ? (
                    <motion.div 
                        key="list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1">Frame Library</h1>
                                <p className="text-muted-foreground">Design and manage custom photo booth frames for your booths.</p>
                            </div>
                            <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90 text-primary-foreground animate-glow-pulse self-start">
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Frame
                            </Button>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
                                        <div className="aspect-[4/5] bg-muted/20" />
                                        <CardContent className="p-4 space-y-2">
                                            <div className="h-4 bg-muted/40 rounded w-2/3" />
                                            <div className="h-3 bg-muted/20 rounded w-1/3" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : frames.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 bg-card/20 rounded-3xl border border-dashed border-border/50">
                                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                                    <Layout className="w-10 h-10 text-primary/40" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No frames yet</h3>
                                <p className="text-muted-foreground max-w-sm text-center mb-8">
                                    Create your first frame using our interactive builder to start providing custom designs for your booths.
                                </p>
                                <Button onClick={handleCreateNew} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Launch Builder
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {frames.map((frame) => (
                                    <motion.div
                                        key={frame.id}
                                        whileHover={{ y: -4 }}
                                        className="group cursor-pointer"
                                        onClick={() => handleEdit(frame)}
                                    >
                                        <Card className="bg-card/50 border-border/50 overflow-hidden group-hover:border-primary/50 transition-all duration-300">
                                            <div className="aspect-[4/5] relative bg-black/40 p-4">
                                                <Image 
                                                    src={frame.image_url} 
                                                    alt={frame.name} 
                                                    fill
                                                    className="object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-105"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                />
                                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <CardContent className="p-4 bg-gradient-to-b from-transparent to-black/20">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <h3 className="font-semibold truncate">{frame.name}</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap">
                                                            {frame.is_active ? 'Active' : 'Draft'}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setFrameToDelete(frame)
                                                            }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                    <Grid className="w-3 h-3" />
                                                    {frame.photo_slots?.length || 0} Slots • {frame.canvas_width}x{frame.canvas_height}
                                                </p>
                                                {(frame.booths?.name || frame.booth_sessions?.name) && (
                                                    <div className="mt-2 space-y-1">
                                                        {frame.booths?.name && (
                                                            <p className="text-[10px] text-primary/70 font-medium truncate">
                                                                Booth: {frame.booths.name}
                                                            </p>
                                                        )}
                                                        {frame.booth_sessions?.name && (
                                                            <p className="text-[10px] text-indigo-400 font-medium truncate">
                                                                Session: {frame.booth_sessions.name}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="builder"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full hover:bg-primary/10 hover:text-primary">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{selectedFrame ? 'Edit Frame' : 'Create New Frame'}</h1>
                                <p className="text-muted-foreground">Configure your photo slots and frame layout.</p>
                            </div>
                        </div>

                        <FrameBuilder 
                            initialData={selectedFrame} 
                            orgId={organization.id} 
                            onSaveSuccess={handleSaveSuccess} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <AlertDialog open={!!frameToDelete} onOpenChange={(open) => !open && setFrameToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Archive Frame</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to archive <span className="font-semibold text-foreground">{frameToDelete?.name}</span>? 
                            This frame will be hidden from the library but kept in the database to preserve historical session data. It will no longer be available for new sessions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault()
                                handleDelete()
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Archiving...
                                </>
                            ) : (
                                'Archive'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
