"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    IconSend,
    IconLoader,
    IconEye,
    IconAlertTriangle,
    IconPlus,
} from "@tabler/icons-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { broadcastSchema, BroadcastFormValues, LIMITS } from "./schema"
import { createBroadcast } from "./actions"

interface ComposeDialogProps {
    organizationName: string
}

export function ComposeDialog({ organizationName }: ComposeDialogProps) {
    const [open, setOpen] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const form = useForm<BroadcastFormValues>({
        resolver: zodResolver(broadcastSchema),
        defaultValues: {
            subject: "",
            message: "",
            priority: "low",
        },
    })

    const watchSubject = form.watch("subject")
    const watchMessage = form.watch("message")
    const watchPriority = form.watch("priority")

    const subjectLength = watchSubject?.length || 0
    const messageLength = watchMessage?.length || 0

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-red-500/10 border-red-500/50 text-red-500"
            case "medium":
                return "bg-yellow-500/10 border-yellow-500/50 text-yellow-500"
            default:
                return "bg-green-500/10 border-green-500/50 text-green-500"
        }
    }

    const getPriorityBadgeVariant = (priority: string) => {
        switch (priority) {
            case "high":
                return "destructive"
            case "medium":
                return "default"
            default:
                return "secondary"
        }
    }

    const handleSubmit = (data: BroadcastFormValues) => {
        // Show confirmation for high priority messages
        if (data.priority === "high" && !showConfirmation) {
            setShowConfirmation(true)
            return
        }

        startTransition(async () => {
            try {
                await createBroadcast(data)
                toast.success("Broadcast message sent successfully!")
                form.reset()
                setShowPreview(false)
                setShowConfirmation(false)
                setOpen(false)
                router.refresh()
            } catch (error) {
                console.error("Broadcast error:", error)
                toast.error(error instanceof Error ? error.message : "Failed to send broadcast message")
            }
        })
    }

    const resetDialog = () => {
        form.reset()
        setShowPreview(false)
        setShowConfirmation(false)
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetDialog()
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <IconPlus className="h-4 w-4" />
                    Compose Broadcast
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {showConfirmation ? "Confirm High Priority Broadcast" : showPreview ? "Preview Broadcast" : "Compose Broadcast"}
                    </DialogTitle>
                    <DialogDescription>
                        {showConfirmation
                            ? "You are about to send a high priority broadcast. This will be prominently displayed to all members."
                            : showPreview
                                ? "Review your broadcast before sending."
                                : `Send a notification to all members of ${organizationName}.`}
                    </DialogDescription>
                </DialogHeader>

                {showConfirmation ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                            <IconAlertTriangle className="h-5 w-5 text-red-500" />
                            <p className="text-sm text-red-500">
                                High priority broadcasts are displayed prominently and may interrupt users. Are you sure?
                            </p>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowConfirmation(false)}
                                disabled={isPending}
                            >
                                Go Back
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleSubmit(form.getValues())}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <IconSend className="mr-2 h-4 w-4" />
                                        Confirm & Send
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : showPreview ? (
                    <div className="space-y-4">
                        <Card className={`border-2 ${getPriorityColor(watchPriority)}`}>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">{watchSubject || "No subject"}</h3>
                                    <Badge
                                        variant={getPriorityBadgeVariant(watchPriority) as "destructive" | "default" | "secondary"}
                                        className={watchPriority === "medium" ? "bg-yellow-500 hover:bg-yellow-600 text-white" :
                                            watchPriority === "low" ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                                    >
                                        {watchPriority.toUpperCase()}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {watchMessage || "No message"}
                                </p>
                                <p className="text-xs text-muted-foreground">Just now</p>
                            </CardContent>
                        </Card>
                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowPreview(false)}
                                disabled={isPending}
                            >
                                Edit
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSubmit(form.getValues())}
                                disabled={isPending}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                {isPending ? (
                                    <>
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <IconSend className="mr-2 h-4 w-4" />
                                        Send Broadcast
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit((data) => setShowPreview(true))} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Subject</FormLabel>
                                            <span className={`text-xs ${subjectLength > LIMITS.MAX_SUBJECT_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {subjectLength}/{LIMITS.MAX_SUBJECT_LENGTH}
                                            </span>
                                        </div>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter message subject"
                                                disabled={isPending}
                                                maxLength={LIMITS.MAX_SUBJECT_LENGTH}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isPending}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-green-500" />
                                                        Low Priority
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="medium">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                                        Medium Priority
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="high">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-red-500" />
                                                        High Priority
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Message</FormLabel>
                                            <span className={`text-xs ${messageLength > LIMITS.MAX_MESSAGE_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {messageLength}/{LIMITS.MAX_MESSAGE_LENGTH}
                                            </span>
                                        </div>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Type your message here..."
                                                className="min-h-[150px] resize-none"
                                                disabled={isPending}
                                                maxLength={LIMITS.MAX_MESSAGE_LENGTH}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full sm:w-auto"
                                >
                                    <IconEye className="mr-2 h-4 w-4" />
                                    Preview
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}
