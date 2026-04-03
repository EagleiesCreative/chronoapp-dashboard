"use client"

import { useState, useRef, useEffect } from "react"
import { 
    Upload, 
    Plus, 
    Trash2, 
    Save, 
    Maximize2, 
    Layers, 
    Settings2,
    Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"

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

interface FrameData {
    id?: string
    name: string
    image_url: string
    photo_slots: PhotoSlot[]
    canvas_width: number
    canvas_height: number
    price: number
    booth_id?: string | null
    booth_session_id?: string | null
}

interface FrameBuilderProps {
    initialData?: FrameData | null
    orgId: string
    onSaveSuccess?: () => void
}

const CANVAS_PRESETS = [
    { id: "custom", name: "Custom Size", width: 0, height: 0 },
    { id: "4r-p", name: "4R (Portrait) - 1200x1800", width: 1200, height: 1800 },
    { id: "4r-l", name: "4R (Landscape) - 1800x1200", width: 1800, height: 1200 },
    { id: "a3-p", name: "A3 (Portrait) - 3508x4961", width: 3508, height: 4961 },
    { id: "a3-l", name: "A3 (Landscape) - 4961x3508", width: 4961, height: 3508 },
]

export function FrameBuilder({ initialData, orgId, onSaveSuccess }: FrameBuilderProps) {
    const [frame, setFrame] = useState<FrameData>(initialData || {
        name: "New Frame",
        image_url: "",
        photo_slots: [],
        canvas_width: 600,
        canvas_height: 1050,
        price: 15000,
        booth_id: null,
        booth_session_id: null,
    })

    const [booths, setBooths] = useState<any[]>([])
    const [sessions, setSessions] = useState<any[]>([])
    const [isLoadingBooths, setIsLoadingBooths] = useState(false)
    const [isLoadingSessions, setIsLoadingSessions] = useState(false)

    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Fetch booths on mount
    useEffect(() => {
        async function fetchBooths() {
            setIsLoadingBooths(true)
            try {
                const res = await fetch(`/api/booths?orgId=${orgId}`)
                const data = await res.json()
                if (res.ok) {
                    setBooths(data.booths || [])
                }
            } catch (err) {
                console.error("Failed to fetch booths", err)
            } finally {
                setIsLoadingBooths(false)
            }
        }
        fetchBooths()
    }, [orgId])

    // Fetch sessions when booth changes
    useEffect(() => {
        async function fetchSessions() {
            if (!frame.booth_id || frame.booth_id === 'none') {
                setSessions([])
                return
            }
            setIsLoadingSessions(true)
            try {
                const res = await fetch(`/api/booths/${frame.booth_id}/sessions`)
                const data = await res.json()
                if (res.ok) {
                    setSessions(data.sessions || [])
                }
            } catch (err) {
                console.error("Failed to fetch sessions", err)
            } finally {
                setIsLoadingSessions(false)
            }
        }
        fetchSessions()
    }, [frame.booth_id])

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        
        // Metadata for frame creation
        const metadata = {
            name: frame.name || file.name.split('.')[0],
            dimensions: { width: frame.canvas_width, height: frame.canvas_height },
            photo_slots: frame.photo_slots,
            price: frame.price,
            booth_id: frame.booth_id === 'none' ? null : frame.booth_id,
            booth_session_id: frame.booth_session_id === 'none' ? null : frame.booth_session_id
        }
        formData.append('metadata', JSON.stringify(metadata))

        try {
            const res = await fetch('/api/frames', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (res.ok) {
                setFrame(prev => ({ ...prev, image_url: data.data.image_url, id: data.data.id }))
                toast.success("Frame image uploaded!")
            } else {
                toast.error(data.error || "Upload failed")
            }
        } catch (err) {
            console.error("Upload error", err)
            toast.error("An error occurred during upload")
        } finally {
            setIsUploading(false)
        }
    }

    const addSlot = () => {
        const newSlot: PhotoSlot = {
            id: `slot-${Date.now()}`,
            x: 50,
            y: 50,
            width: 500,
            height: 350,
            rotation: 0,
            layer: 'below',
            capture_index: frame.photo_slots.length
        }
        setFrame(prev => ({
            ...prev,
            photo_slots: [...prev.photo_slots, newSlot]
        }))
        setSelectedSlotId(newSlot.id)
    }

    const updateSlot = (id: string, updates: Partial<PhotoSlot>) => {
        setFrame(prev => ({
            ...prev,
            photo_slots: prev.photo_slots.map(slot => 
                slot.id === id ? { ...slot, ...updates } : slot
            )
        }))
    }

    const removeSlot = (id: string) => {
        setFrame(prev => ({
            ...prev,
            photo_slots: prev.photo_slots.filter(slot => slot.id !== id)
        }))
        if (selectedSlotId === id) setSelectedSlotId(null)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const url = frame.id ? `/api/frames/${frame.id}` : '/api/frames'
            const method = frame.id ? 'PATCH' : 'POST'
            
            // For saving existing without file upload, we use standard JSON
            // But if it's new without file, the API will fail anyway (image_url required)
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: frame.name,
                    image_url: frame.image_url,
                    photo_slots: frame.photo_slots,
                    dimensions: { width: frame.canvas_width, height: frame.canvas_height },
                    price: frame.price,
                    booth_id: frame.booth_id === 'none' ? null : frame.booth_id,
                    booth_session_id: frame.booth_session_id === 'none' ? null : frame.booth_session_id
                })
            })
            
            if (res.ok) {
                toast.success("Frame saved successfully!")
                onSaveSuccess?.()
            } else {
                const data = await res.json()
                toast.error(data.error || "Save failed")
            }
        } catch (err) {
            console.error("Save error", err)
            toast.error("Failed to save frame")
        } finally {
            setIsSaving(false)
        }
    }

    const selectedSlot = frame.photo_slots.find(s => s.id === selectedSlotId)

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Canvas Preview Area */}
            <div className="xl:col-span-8 flex flex-col gap-4">
                <Card className="bg-card/50 border-border/50 overflow-hidden relative group">
                    <div className="p-8 flex items-center justify-center bg-black/40 min-h-[600px] relative">
                        {frame.image_url ? (
                            <div 
                                className="relative shadow-2xl transition-all duration-500"
                                style={{ 
                                    width: '100%', 
                                    maxWidth: '500px', 
                                    aspectRatio: `${frame.canvas_width}/${frame.canvas_height}`,
                                    backgroundColor: '#111' 
                                }}
                            >
                                {/* Photo Slots Layer (Below) */}
                                {frame.photo_slots.filter(s => s.layer === 'below').map(slot => (
                                    <SlotPreview 
                                        key={slot.id} 
                                        slot={slot} 
                                        isSelected={selectedSlotId === slot.id}
                                        onClick={() => setSelectedSlotId(slot.id)}
                                        canvasWidth={frame.canvas_width}
                                        canvasHeight={frame.canvas_height}
                                    />
                                ))}

                                {/* Frame Image */}
                                <div className="absolute inset-0 z-10 pointer-events-none">
                                    <Image 
                                        src={frame.image_url} 
                                        alt="Frame Design" 
                                        fill
                                        className="object-contain"
                                        unoptimized // Since it's a dynamic preview and we need pixel perfection
                                    />
                                </div>

                                {/* Photo Slots Layer (Above) */}
                                {frame.photo_slots.filter(s => s.layer === 'above').map(slot => (
                                    <SlotPreview 
                                        key={slot.id} 
                                        slot={slot} 
                                        isSelected={selectedSlotId === slot.id}
                                        onClick={() => setSelectedSlotId(slot.id)}
                                        canvasWidth={frame.canvas_width}
                                        canvasHeight={frame.canvas_height}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Upload className="w-12 h-12 opacity-20" />
                                <p>Upload a frame image to start building</p>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    Choose File
                                </Button>
                            </div>
                        )}
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                </Card>
            </div>

            {/* Settings Sidebar */}
            <div className="xl:col-span-4 space-y-6">
                <Tabs defaultValue="canvas" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/20">
                        <TabsTrigger value="canvas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Settings2 className="w-4 h-4 mr-2" />
                            Canvas
                        </TabsTrigger>
                        <TabsTrigger value="layers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Layers className="w-4 h-4 mr-2" />
                            Layers ({frame.photo_slots.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="canvas" className="space-y-6 pt-4 mt-0">
                        <Card className="bg-card/30 border-border/50">
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label>Frame Name</Label>
                                    <Input 
                                        value={frame.name} 
                                        onChange={e => setFrame(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="E.g. Summer Wedding 4x6"
                                        className="bg-background/50"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label>Canvas Preset</Label>
                                    <Select 
                                        onValueChange={(val) => {
                                            const preset = CANVAS_PRESETS.find(p => p.id === val);
                                            if (preset && preset.id !== "custom") {
                                                setFrame(prev => ({ 
                                                    ...prev, 
                                                    canvas_width: preset.width, 
                                                    canvas_height: preset.height 
                                                }));
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="bg-background/50 border-border/50">
                                            <SelectValue placeholder="Choose a size preset..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CANVAS_PRESETS.map(preset => (
                                                <SelectItem key={preset.id} value={preset.id}>
                                                    {preset.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Width (px)</Label>
                                        <Input 
                                            type="number" 
                                            value={frame.canvas_width} 
                                            onChange={e => setFrame(prev => ({ ...prev, canvas_width: parseInt(e.target.value) || 0 }))}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Height (px)</Label>
                                        <Input 
                                            type="number" 
                                            value={frame.canvas_height} 
                                            onChange={e => setFrame(prev => ({ ...prev, canvas_height: parseInt(e.target.value) || 0 }))}
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Price (IDR)</Label>
                                    <Input 
                                        type="number" 
                                        value={frame.price} 
                                        onChange={e => setFrame(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                                        className="bg-background/50"
                                    />
                                </div>

                                <div className="space-y-4 pt-2 border-t border-border/50">
                                    <div className="space-y-2">
                                        <Label>Assigned Booth</Label>
                                        <Select 
                                            value={frame.booth_id || 'none'} 
                                            onValueChange={(val) => setFrame(prev => ({ ...prev, booth_id: val, booth_session_id: null }))}
                                            disabled={isLoadingBooths}
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/50">
                                                <SelectValue placeholder={isLoadingBooths ? "Loading booths..." : "Select a booth..."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None (Public)</SelectItem>
                                                {booths.map(booth => (
                                                    <SelectItem key={booth.id} value={booth.id}>
                                                        {booth.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Assigned Session</Label>
                                        <Select 
                                            value={frame.booth_session_id || 'none'} 
                                            onValueChange={(val) => setFrame(prev => ({ ...prev, booth_session_id: val }))}
                                            disabled={!frame.booth_id || frame.booth_id === 'none' || isLoadingSessions}
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/50">
                                                <SelectValue placeholder={
                                                    !frame.booth_id || frame.booth_id === 'none' 
                                                        ? "Select a booth first" 
                                                        : isLoadingSessions 
                                                            ? "Loading sessions..." 
                                                            : "Select a session..."
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {sessions.map(session => (
                                                    <SelectItem key={session.id} value={session.id}>
                                                        {session.name} {session.is_active ? "(Active)" : ""}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button 
                                    className="w-full mt-2 bg-primary/10 text-primary hover:bg-primary/20" 
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUploading ? "Uploading..." : "Replace Frame Image"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="layers" className="space-y-4 pt-4 mt-0">
                        <Button onClick={addSlot} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Layer / Slot
                        </Button>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {frame.photo_slots.map((slot, index) => (
                                <motion.div 
                                    key={slot.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card 
                                        className={cn(
                                            "bg-card/20 border-border/50 cursor-pointer hover:border-primary/30 transition-colors",
                                            selectedSlotId === slot.id && "border-primary bg-primary/5"
                                        )}
                                        onClick={() => setSelectedSlotId(slot.id)}
                                    >
                                        <CardContent className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                                                    #{index + 1}
                                                </div>
                                                <div className="text-xs">
                                                    <div className="font-medium">Layer {index + 1}</div>
                                                    <div className="text-muted-foreground">Capture {slot.capture_index + 1} • {slot.width}x{slot.height}px</div>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeSlot(slot.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>

                        {selectedSlot && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="pt-4 space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Layer Configuration</h4>
                                    <div className="flex gap-2">
                                        <Select 
                                            value={String(selectedSlot.capture_index)} 
                                            onValueChange={(val) => updateSlot(selectedSlot.id, { capture_index: parseInt(val) })}
                                        >
                                            <SelectTrigger className="h-7 w-[110px] text-[10px] bg-background/50 border-border/50">
                                                <SelectValue placeholder="Capture Index" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                                                    <SelectItem key={idx} value={String(idx)} className="text-[10px]">
                                                        Capture {idx + 1}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-7 text-[10px]"
                                            onClick={() => updateSlot(selectedSlot.id, { layer: selectedSlot.layer === 'above' ? 'below' : 'above' })}
                                        >
                                            <Layers className="w-3 h-3 mr-1" />
                                            {selectedSlot.layer}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <Label>Horizontal Position (X)</Label>
                                            <span className="text-muted-foreground font-mono">{selectedSlot.x}px</span>
                                        </div>
                                        <Slider 
                                            value={[selectedSlot.x]} 
                                            min={0} 
                                            max={frame.canvas_width} 
                                            step={1}
                                            onValueChange={([val]) => updateSlot(selectedSlot.id, { x: val })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <Label>Vertical Position (Y)</Label>
                                            <span className="text-muted-foreground font-mono">{selectedSlot.y}px</span>
                                        </div>
                                        <Slider 
                                            value={[selectedSlot.y]} 
                                            min={0} 
                                            max={frame.canvas_height} 
                                            step={1}
                                            onValueChange={([val]) => updateSlot(selectedSlot.id, { y: val })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <Label>Width</Label>
                                            <span className="text-muted-foreground font-mono">{selectedSlot.width}px</span>
                                        </div>
                                        <Slider 
                                            value={[selectedSlot.width]} 
                                            min={10} 
                                            max={frame.canvas_width} 
                                            step={1}
                                            onValueChange={([val]) => updateSlot(selectedSlot.id, { width: val })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <Label>Height</Label>
                                            <span className="text-muted-foreground font-mono">{selectedSlot.height}px</span>
                                        </div>
                                        <Slider 
                                            value={[selectedSlot.height]} 
                                            min={10} 
                                            max={frame.canvas_height} 
                                            step={1}
                                            onValueChange={([val]) => updateSlot(selectedSlot.id, { height: val })}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <Label>Rotation</Label>
                                            <span className="text-muted-foreground font-mono">{selectedSlot.rotation}°</span>
                                        </div>
                                        <Slider 
                                            value={[selectedSlot.rotation]} 
                                            min={0} 
                                            max={360} 
                                            step={1}
                                            onValueChange={([val]) => updateSlot(selectedSlot.id, { rotation: val })}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </TabsContent>
                </Tabs>

                <div className="pt-4 flex gap-3">
                    <Button 
                        className="flex-1 bg-primary-500 hover:bg-primary-600 text-gray-950 font-bold"
                        onClick={handleSave}
                        disabled={isSaving || !frame.image_url}
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Layout
                    </Button>
                </div>
            </div>
        </div>
    )
}

interface SlotPreviewProps {
    slot: PhotoSlot
    isSelected: boolean
    onClick: () => void
    canvasWidth: number
    canvasHeight: number
}

function SlotPreview({ slot, isSelected, onClick, canvasWidth, canvasHeight }: SlotPreviewProps) {
    const xPct = (slot.x / canvasWidth) * 100
    const yPct = (slot.y / canvasHeight) * 100
    const wPct = (slot.width / canvasWidth) * 100
    const hPct = (slot.height / canvasHeight) * 100

    return (
        <motion.div
            initial={false}
            animate={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                width: `${wPct}%`,
                height: `${hPct}%`,
                rotate: slot.rotation
            }}
            onClick={(e) => {
                e.stopPropagation()
                onClick()
            }}
            className={cn(
                "absolute cursor-pointer flex items-center justify-center overflow-hidden transition-shadow duration-300",
                isSelected ? "border-2 border-primary ring-2 ring-primary/20 z-30 shadow-[0_0_15px_rgba(0,221,99,0.3)]" : "border border-white/20 z-20 hover:border-white/40 shadow-xl",
                slot.layer === 'below' ? 'bg-muted/40' : 'bg-primary/20 backdrop-blur-[2px] border-dashed'
            )}
        >
            <div className="opacity-40 flex flex-col items-center">
                <Maximize2 className="w-4 h-4" />
                <span className="text-[8px] font-bold mt-1">CAPTURE {slot.capture_index + 1}</span>
            </div>
            
            <AnimatePresence>
                {isSelected && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 border-2 border-primary animate-pulse" 
                    />
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ")
}
