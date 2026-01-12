"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
    IconPlus,
    IconLoader,
    IconSend,
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
import {
    newTicketSchema,
    NewTicketFormValues,
    TICKET_CATEGORIES,
    TICKET_PRIORITIES,
    LIMITS,
} from "./schema"
import { createTicket, getUserBooths } from "./actions"

interface Booth {
    id: string
    name: string
}

export function NewTicketDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [booths, setBooths] = useState<Booth[]>([])
    const router = useRouter()

    const form = useForm<NewTicketFormValues>({
        resolver: zodResolver(newTicketSchema),
        defaultValues: {
            title: "",
            category: "technical",
            priority: "medium",
            booth_id: "",
            description: "",
        },
    })

    const watchTitle = form.watch("title")
    const watchDescription = form.watch("description")

    const titleLength = watchTitle?.length || 0
    const descriptionLength = watchDescription?.length || 0

    // Fetch booths when dialog opens
    useEffect(() => {
        if (open) {
            getUserBooths().then(setBooths).catch(console.error)
        }
    }, [open])

    const handleSubmit = (data: NewTicketFormValues) => {
        startTransition(async () => {
            try {
                await createTicket(data)
                toast.success("Ticket created successfully!")
                form.reset()
                setOpen(false)
                router.refresh()
            } catch (error) {
                console.error("Ticket creation error:", error)
                toast.error(error instanceof Error ? error.message : "Failed to create ticket")
            }
        })
    }

    const resetDialog = () => {
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetDialog()
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <IconPlus className="h-4 w-4" />
                    Issue a Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        Create Support Ticket
                    </DialogTitle>
                    <DialogDescription>
                        Describe your issue and we&apos;ll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Title</FormLabel>
                                        <span className={`text-xs ${titleLength > LIMITS.MAX_TITLE_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {titleLength}/{LIMITS.MAX_TITLE_LENGTH}
                                        </span>
                                    </div>
                                    <FormControl>
                                        <Input
                                            placeholder="Brief summary of your issue"
                                            disabled={isPending}
                                            maxLength={LIMITS.MAX_TITLE_LENGTH}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            disabled={isPending}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {TICKET_CATEGORIES.map((category) => (
                                                    <SelectItem key={category.value} value={category.value}>
                                                        {category.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                                {TICKET_PRIORITIES.map((priority) => (
                                                    <SelectItem key={priority.value} value={priority.value}>
                                                        <span className="flex items-center gap-2">
                                                            <span className={`h-2 w-2 rounded-full ${priority.color}`} />
                                                            {priority.label}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {booths.length > 0 && (
                            <FormField
                                control={form.control}
                                name="booth_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Related Booth (Optional)</FormLabel>
                                        <Select
                                            onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                                            defaultValue={field.value || "none"}
                                            disabled={isPending}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a booth (optional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {booths.map((booth) => (
                                                    <SelectItem key={booth.id} value={booth.id}>
                                                        {booth.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Description</FormLabel>
                                        <span className={`text-xs ${descriptionLength > LIMITS.MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                            {descriptionLength}/{LIMITS.MAX_DESCRIPTION_LENGTH}
                                        </span>
                                    </div>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Please describe your issue in detail. Include any steps to reproduce the problem."
                                            className="min-h-[150px] resize-none"
                                            disabled={isPending}
                                            maxLength={LIMITS.MAX_DESCRIPTION_LENGTH}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                            >
                                {isPending ? (
                                    <>
                                        <IconLoader className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <IconSend className="mr-2 h-4 w-4" />
                                        Submit Ticket
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
