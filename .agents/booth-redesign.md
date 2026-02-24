# Redesign: Booth Management Page

## Objective

Completely redesign the **Booth Management** page (`src/app/dashboard/booths/page.tsx`) and the **Booth Detail** page (`src/app/dashboard/booths/[boothId]/page.tsx`) to match the reference design: a **data table + slide-out detail panel** layout.

> **Reference design**: `.agents/booth-redesign-reference.png`

---

## Reference Design Breakdown

The reference shows a **two-panel layout**:

### Left Panel — Device/Booth Table (≈60% width)
- **Page header**: title "Devices" + subtitle describing the page purpose
- **Data table** with the following columns:
  - **Device ID** — formatted as `DEV-001`, `DEV-002`, etc. (short code, monospace)
  - **Name** — booth display name (e.g., "Glam Cam Alpha", "Studio Booth A")
  - **Location** — human-readable location (e.g., "Grand Ballroom", "Sunset Terrace")
  - **Status** — colored dot + label:
    - 🟢 **Online** (green dot + green text)
    - 🔴 **Offline** (red dot + red text)
    - 🟡 **Maintenance** (yellow/amber dot + yellow text)
- Table rows are clickable — clicking a row opens the **detail panel** on the right
- The currently selected row should have a subtle highlight

### Right Panel — Detail Side Panel (≈40% width, slides in from right)
- **Header section**:
  - Close button (✕) top-right
  - Booth name as panel title (e.g., "Studio Booth A")
  - Device icon + Device ID (e.g., `DEV-006`)
  - Status badge (🟢 Online)
- **Info grid** (2×2 card grid):
  - **Location** — with map-pin icon and value (e.g., "Downtown Studio")
  - **Last Seen** — with clock icon and relative time (e.g., "8 min ago")
  - **Total Photos** — with camera icon and count (e.g., "890")
  - **Sessions** — with list icon and count (e.g., "33")
- **Power/Battery indicator** (optional):
  - Power icon + percentage (e.g., "78%")
- **Session History** section:
  - List of recent sessions with:
    - Session name (e.g., "Wedding Reception")
    - Session ID + date (e.g., "SES-101 · Feb 17")
    - Photo count aligned right (e.g., "48 photos")

---

## Current State (What Exists Now)

### `src/app/dashboard/booths/page.tsx` (~488 lines)
- Card-based list (not a table)
- Shows booth name, code, status badge, location, price, assigned member
- Create booth dialog (for admins)
- Delete booth button (for admins)
- Simple pagination (Previous/Next)
- 3 summary cards: Total Booths, Active Booths, Booth Price
- Clicking edit navigates to `/dashboard/booths/[boothId]` (a **separate page**)

### `src/app/dashboard/booths/[boothId]/page.tsx` (~571 lines)
- Separate full page with back button
- Tabs: Settings, Vouchers
- Settings tab: form with name, location, DSLR API, price, assignee, PIN
- Vouchers tab: CRUD for voucher codes

### What Needs to Change
- Replace card list with a proper **data table** (use the existing `@tanstack/react-table` or manual `<table>`)
- Replace navigating to a separate page with a **slide-out side panel** (use `Sheet` from shadcn/ui)
- Move the detail/edit view into the side panel instead of a full page
- Add session history and stats to the side panel
- Keep the Create Booth dialog as-is (it's already a dialog)
- Keep the Vouchers tab functionality accessible from the panel

---

## Implementation Plan

### Files to Modify

#### `src/app/dashboard/booths/page.tsx` — FULL REWRITE
Redesign this page to include:

1. **Page Header**
   - Title: "Booth Management"
   - Subtitle: "Manage all your photobooth devices across locations."
   - "Create Booth" button (admin only) — keep existing dialog

2. **Data Table**
   - Use a `<table>` element with proper styling (match existing `data-table` patterns in the project)
   - Columns:
     | Column | Source | Format |
     |---|---|---|
     | Booth Code | `booth.booth_code` | Monospace, dim text (e.g., `ABCD-1234`) |
     | Name | `booth.name` | Bold text |
     | Location | `booth.location` | Normal text |
     | Status | `booth.status` | Colored dot + badge: `active` → 🟢 Online, `inactive` → 🔴 Offline, `maintenance` → 🟡 Maintenance |
     | Price | `booth.price` | IDR currency format |
     | Assigned To | `booth.assigned_to` | Member name |
   - Rows are clickable → opens the detail panel
   - Selected row gets a highlighted background
   - Include pagination at the bottom

3. **Detail Side Panel** (Sheet from shadcn/ui, slides from right)
   - Opens when a table row is clicked
   - **Header**:
     - Booth name as title
     - Close button (✕)
     - Booth code sub-label
     - Status badge
   - **Info Grid** (2-column grid of small cards):
     - Location (with `MapPin` icon)
     - Price (with `CurrencyDollar` icon)
     - Assigned To (with `User` icon)
     - Created At (with `Clock` icon)
   - **Quick Actions** (button row):
     - "Edit" button → opens edit dialog or inline edit
     - "Delete" button (admin only, destructive)
   - **Session History** section (stretch goal):
     - Show recent photo sessions for this booth
     - Each session: name, date, photo count
   - **Vouchers** section:
     - Show active voucher count
     - Link/button to manage vouchers

#### `src/app/dashboard/booths/[boothId]/page.tsx` — KEEP BUT OPTIONAL
- This page can remain as a fallback deep-link for direct booth editing
- OR it can be removed entirely if all editing moves into the side panel
- **Decision**: Keep it for now but update it to match the new design language

---

## Technical Requirements

### Must Follow Project Rules (from AGENTS.md)

1. **Framework**: This is a `"use client"` page — it uses React hooks (`useState`, `useEffect`, `useCallback`)
2. **Imports**: Use `@/` path alias for all imports
3. **Icons**: Use Lucide React (primary) or Tabler Icons (secondary)
4. **UI Components**: Use shadcn/ui components:
   - `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` for the side panel
   - `Badge` for status indicators
   - `Button` for actions
   - `Card` for info grid items
   - `Dialog` for create/edit modals
   - `Table` for the data table OR raw `<table>` with Tailwind classes
5. **Styling**: Use TailwindCSS v4 design tokens — **NEVER raw hex colors**
   - Status colors: use `text-success`/`bg-success` for online, `text-error`/`bg-error` for offline, `text-warning`/`bg-warning` for maintenance
   - Use `bg-card`, `text-card-foreground`, `border-border`, `text-muted-foreground`
6. **Data fetching**: Keep the existing pattern — `fetch('/api/booths')` with `useEffect`
7. **Auth**: Keep `useOrganization()` and `useUser()` from Clerk
8. **Toast**: Use `toast` from `sonner` for notifications
9. **Pagination**: Keep the existing limit/offset pagination
10. **Responsiveness**: On mobile, the detail panel should slide over the full width

### shadcn/ui Components Needed
If `Sheet` is not yet installed, run:
```bash
npx shadcn@latest add sheet
```

Check if it already exists at `src/components/ui/sheet.tsx` — if yes, no installation needed.

---

## Design Specifications

### Table Row Styles
```
Default:      bg-transparent, hover:bg-muted/50
Selected:     bg-accent, border-l-2 border-primary
```

### Status Dot + Badge
```tsx
// Online
<span className="flex items-center gap-2">
  <span className="h-2 w-2 rounded-full bg-success" />
  <span className="text-success text-sm font-medium">Online</span>
</span>

// Offline
<span className="flex items-center gap-2">
  <span className="h-2 w-2 rounded-full bg-error" />
  <span className="text-error text-sm font-medium">Offline</span>
</span>

// Maintenance
<span className="flex items-center gap-2">
  <span className="h-2 w-2 rounded-full bg-warning" />
  <span className="text-warning text-sm font-medium">Maintenance</span>
</span>
```

### Detail Panel Info Card
```tsx
<div className="rounded-lg border border-border bg-card p-3">
  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
    <MapPin className="h-3 w-3" />
    Location
  </div>
  <div className="text-sm font-semibold text-card-foreground">
    Downtown Studio
  </div>
</div>
```

### Session History Row
```tsx
<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
  <div>
    <div className="text-sm font-medium">Wedding Reception</div>
    <div className="text-xs text-muted-foreground">SES-101 · Feb 17</div>
  </div>
  <div className="text-sm text-muted-foreground">48 photos</div>
</div>
```

---

## Step-by-Step Execution Order

1. **Verify `Sheet` component exists** → check `src/components/ui/sheet.tsx`, install if missing
2. **Rewrite `src/app/dashboard/booths/page.tsx`**:
   - Keep all existing data fetching logic (`fetchBooths`, `fetchMembers`, Create/Delete handlers)
   - Replace the card-based list with data table
   - Add `selectedBooth` state + `Sheet` panel for detail view
   - Add status dot rendering logic
   - Keep pagination
   - Keep Create Booth dialog (admin only)
3. **Test**:
   - Verify table renders correctly with booth data
   - Verify clicking a row opens the side panel with correct data
   - Verify Create/Delete still work
   - Verify pagination works
   - Verify mobile responsiveness (panel goes full-width)
4. **Optional enhancements**:
   - Add search/filter to table
   - Add session history to detail panel (requires API endpoint)
   - Add inline editing in the panel
