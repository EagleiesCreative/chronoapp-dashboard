# Support Tickets Redesign — Agent Prompt

> **Goal**: Redesign the Support Tickets page to use a **data table + slide-out detail panel** layout (same pattern as the Booth Management redesign), replacing the current navigate-to-separate-detail-page flow with an inline Sheet panel.

---

## Reference Design Breakdown

The reference screenshot shows a two-panel layout:

### Left Panel — Tickets Table
- **Page title**: "Tickets" with subtitle "Track and resolve device issues."
- **Filters row** directly above the table: two `Select` dropdowns side by side:
  - "All Status" (filter by ticket status)
  - "All Priority" (filter by ticket priority)
- **Data table** with columns:
  | Column   | Description                          |
  |----------|--------------------------------------|
  | ID       | Ticket number (e.g. `TK-001`)        |
  | Subject  | Ticket title (bold font)             |
  | Device   | Related booth/device name            |
  | Priority | Priority badge (`High`, `Critical`, `Medium`) |
- Rows are **clickable** — clicking opens the slide-out panel on the right.
- The **currently selected row** should have a subtle highlight (`bg-muted/80`).

### Right Panel — Slide-out Sheet (Ticket Detail)
When a table row is clicked, a `Sheet` slides in from the right showing:

1. **Header section**:
   - Ticket number (e.g. `TK-001`) at the very top left, with a close (`X`) button at top right
   - Below that: Ticket title as the main heading (e.g. "Camera lens foggy in humid conditions")
   - Below title: Status badge (e.g. `● Open`) and Priority badge (`High`) inline

2. **Description block**:
   - A light gray background block (no border) containing the full ticket description text

3. **Metadata grid** (two-column layout):
   | Field     | Value                     |
   |-----------|---------------------------|
   | Device    | Booth name (e.g. "Sunset Snap 2") |
   | Assignee  | Person name (e.g. "Jamie Lee")    |
   | Created   | Formatted date (e.g. "Feb 15, 2026") |

4. **Comments section**:
   - Header: "💬 Comments (N)" showing comment count
   - List of comments, each in a white card with a subtle border:
     - Header: User icon/avatar + name (bold) + timestamp to the right (e.g. "Jamie Lee  Feb 16, 2026 10:30 AM")
     - Body: Comment message text below the header
   - Comments are displayed in a vertical list
   
5. **Comment input**:
   - Fixed at the bottom of the form
   - Text input field with placeholder "Add a comment..." taking most of the width
   - A solid "Send" button (purple/primary colored) to the right of the input

---

## Current State Analysis

### Files to Modify

| File | Current State | Action |
|------|--------------|--------|
| `src/app/dashboard/support/support-client.tsx` | Table-based list, navigates to `[id]/page.tsx` on row click | **Rewrite** to add slide-out `Sheet` panel, priority filter, inline detail view |
| `src/app/dashboard/support/schema.ts` | Ticket, TicketMessage types, Zod schemas | **Keep as-is** — no changes needed |
| `src/app/dashboard/support/actions.ts` | Server actions for CRUD, replies, status updates | **Keep as-is** — reuse `getTicketDetail`, `addReply`, `updateTicketStatus` |
| `src/app/dashboard/support/new-ticket-dialog.tsx` | Dialog for creating tickets | **Keep as-is** — still used from the header |
| `src/app/dashboard/support/page.tsx` | Server component fetching tickets | **Keep as-is** |
| `src/app/dashboard/support/[id]/page.tsx` | Separate detail page | **Keep** as fallback/deep link |
| `src/app/dashboard/support/[id]/ticket-detail-client.tsx` | Full-page ticket detail with conversation | **Keep** as fallback/deep link |

### Key Difference from Current
- Currently: clicking a row navigates to `/dashboard/support/[id]` (separate page).
- New: clicking a row opens a **Sheet** panel inline, fetching the ticket detail + messages on the fly.
- The separate detail page (`[id]/page.tsx`) should remain as a fallback for deep links.

---

## Implementation Plan

### Step 1: Update `support-client.tsx`

This is the main file to rewrite. The new component should:

#### 1.1 State Management
```typescript
// Filter state
const [statusFilter, setStatusFilter] = useState<string>("all")
const [priorityFilter, setPriorityFilter] = useState<string>("all")

// Panel state
const [selectedTicket, setSelectedTicket] = useState<TicketWithMessages | null>(null)
const [isPanelOpen, setIsPanelOpen] = useState(false)
const [loadingDetail, setLoadingDetail] = useState(false)

// Comment state
const [newComment, setNewComment] = useState("")
const [sendingComment, setSendingComment] = useState(false)
```

#### 1.2 Data Fetching for Detail
When a row is clicked, fetch the full ticket detail (with messages) using a client-side fetch to a new API endpoint or by calling an existing action:

```typescript
const handleRowClick = async (ticket: Ticket) => {
    setIsPanelOpen(true)
    setLoadingDetail(true)
    try {
        const res = await fetch(`/api/support/${ticket.id}`)
        if (res.ok) {
            const data = await res.json()
            setSelectedTicket(data)
        }
    } catch (err) {
        toast.error("Failed to load ticket details")
    } finally {
        setLoadingDetail(false)
    }
}
```

> **Important**: Since `getTicketDetail` in `actions.ts` is a server action, you may need to create a lightweight `/api/support/[id]/route.ts` API route that wraps it for client-side fetching. Alternatively, call the server action directly using `useTransition` if possible.

#### 1.3 Filters
Replace the current single-filter card with a cleaner inline filter row:

```tsx
<div className="flex items-center gap-3">
    <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {TICKET_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
        </SelectContent>
    </Select>

    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Priority" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
        </SelectContent>
    </Select>
</div>
```

#### 1.4 Table Columns
Match the reference design:

| Column   | Width         | Content                                    |
|----------|---------------|--------------------------------------------|
| ID       | `w-[100px]`   | `ticket.ticket_number` in text-sm          |
| Subject  | flex          | `ticket.title` (bold font)                   |
| Device   | `w-[150px]`   | `ticket.booth?.name` or "—"                |
| Priority | `w-[100px]`   | Priority badge (rounded outline format)  |

#### 1.5 Sheet Panel Layout

```tsx
<Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
    <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-4">
        {loadingDetail ? (
            <SheetLoadingSkeleton />
        ) : selectedTicket ? (
            <div className="flex flex-col h-full">
                {/* Header */}
                <SheetHeader className="pb-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                        <span className="font-semibold">{selectedTicket.ticket_number}</span>
                    </div>
                    <div className="pt-4">
                        <SheetTitle className="text-xl font-bold">{selectedTicket.title}</SheetTitle>
                        <SheetDescription asChild>
                            <div className="flex items-center gap-3 mt-3">
                                <StatusBadge status={selectedTicket.status} />
                                <Badge variant="outline" className="font-medium bg-background">
                                    {getPriorityConfig(selectedTicket.priority).label}
                                </Badge>
                            </div>
                        </SheetDescription>
                    </div>
                </SheetHeader>

                {/* Description */}
                <div className="mt-4 rounded-md bg-muted/60 p-4 border border-transparent">
                    <p className="text-sm whitespace-pre-wrap text-foreground">
                        {selectedTicket.description}
                    </p>
                </div>

                {/* Metadata Grid */}
                <div className="flex items-start gap-12 mt-6">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Device</p>
                        <p className="text-sm font-medium">{selectedTicket.booth?.name || "—"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                        <p className="text-sm font-medium">{/* from user data or ticket */}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Created</p>
                        <p className="text-sm font-medium">
                            {format(new Date(selectedTicket.created_at), "MMM d, yyyy")}
                        </p>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        💬 Comments ({selectedTicket.messages.length})
                    </h3>
                    <div className="mt-3 space-y-3">
                        {selectedTicket.messages.map((msg) => (
                            <div key={msg.id} className="rounded-lg border p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">{msg.sender_name || "User"}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(msg.created_at), "MMM d, yyyy h:mm a")}
                                    </span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Comment Input */}
                <div className="mt-4 flex items-center gap-2">
                    <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                    <Button
                        onClick={handleSendComment}
                        disabled={!newComment.trim() || sendingComment}
                    >
                        Send
                    </Button>
                </div>
            </div>
        ) : null}
    </SheetContent>
</Sheet>
```

### Step 2: Create API Route for Ticket Detail (if needed)

If calling server actions client-side is not feasible, create:

**File**: `src/app/api/support/[id]/route.ts`

```typescript
import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ticketId = (await params).id

    // Fetch ticket with messages, scoped by org
    const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select(`*, booth:booths(id, name)`)
        .eq('id', ticketId)
        .eq('organization_id', orgId)
        .single()

    if (error || !ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    // Fetch messages
    const { data: messages } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

    return NextResponse.json({ ...ticket, messages: messages || [] })
}
```

> ⚠️ **Verify table names** before implementing using Supabase MCP `list_tables` tool. The tables might be `support_tickets` and `ticket_messages` — check the existing `actions.ts` to confirm.

### Step 3: Handle Comment Submission

```typescript
const handleSendComment = async () => {
    if (!selectedTicket || !newComment.trim()) return
    setSendingComment(true)
    try {
        await addReply(selectedTicket.id, { message: newComment })
        setNewComment("")
        // Refresh the detail
        handleRowClick(selectedTicket) // re-fetch
        toast.success("Comment sent!")
    } catch (err) {
        toast.error("Failed to send comment")
    } finally {
        setSendingComment(false)
    }
}
```

---

## Technical Requirements

### Must Follow
- **TailwindCSS v4** semantic tokens (`bg-card`, `text-foreground`, `border-border`, etc.)
- **shadcn/ui components**: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Badge`, `Select`, `Input`, `Button`
- **Tabler Icons** for consistency with the rest of the app
- **Import paths**: Always use `@/` alias
- **No raw hex colors** in className
- **`cn()` utility** for conditional class merging
- Reuse existing `schema.ts` types and constants (`TICKET_STATUSES`, `TICKET_PRIORITIES`, `TICKET_CATEGORIES`)
- Reuse existing `actions.ts` server actions (`addReply`, `updateTicketStatus`)
- Keep the existing `NewTicketDialog` component for creating new tickets

### Status Badge Colors (from schema.ts)
| Status         | Color           |
|----------------|-----------------|
| Open           | `bg-yellow-500` with green dot in reference |
| In Progress    | `bg-blue-500`   |
| Waiting Reply  | `bg-purple-500` |
| Resolved       | `bg-green-500`  |
| Closed         | `bg-gray-500`   |

### Priority Badge Colors (from schema.ts)
| Priority | Color           |
|----------|-----------------|
| Low      | `bg-gray-500`   |
| Medium   | `bg-blue-500`   |
| High     | `bg-orange-500` |
| Urgent   | `bg-red-500`    |

---

## Design Specifications

### Page Header
```
Title: "Tickets"
Subtitle: "Track and resolve device issues."
```

### Table Row Styling
- Default row height: `h-14`
- Hover: `hover:bg-muted/50`
- Selected (panel open for this ticket): `bg-muted/80`
- Cursor: `cursor-pointer`

### Sheet Panel
- Width: `w-full sm:max-w-md md:max-w-lg`
- Internal padding: `p-4`
- Scrollable: `overflow-y-auto`

### Comments
- Each comment in a `rounded-lg border p-3` container
- Sender name in `font-medium`, timestamp in `text-xs text-muted-foreground`
- Vertical spacing: `space-y-3`

### Comment Input
- Simple `Input` + `Button` side by side at the bottom
- Button text: "Send" (primary/red color per reference)

---

## Execution Order

1. Verify database table names using Supabase MCP tools
2. Create `/api/support/[id]/route.ts` API endpoint for fetching ticket detail client-side
3. Rewrite `support-client.tsx` with the new data table + Sheet layout
4. Test: open the Tickets page, click a row, verify the Sheet opens with correct data
5. Test: add a comment from the Sheet, verify it appears
6. Test: filter by status and priority, verify table updates
7. Verify the existing `[id]/page.tsx` deep-link route still works
