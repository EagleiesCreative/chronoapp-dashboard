# Prompt Part 2: Backend API Implementation

**Objective**: Build the server-side infrastructure for the Frame Builder using Next.js API Route Handlers.

## 1. Directory Structure
Create handlers in:
- [src/app/api/frames/route.ts](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/app/api/frames/route.ts) (List & Create)
- `src/app/api/frames/[id]/route.ts` (Update & Delete)

## 2. API Specifications

### `GET /api/frames`
- **Auth**: Use Clerk `auth()` to get `orgId`.
- **Query**: Fetch from Supabase [frames](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/app/api/frames) where `organization_id = orgId`.
- **Response**: Return JSON array of frames.

### `POST /api/frames`
- **Auth**: Check `orgRole === "org:admin"`.
- **Schema Validation**: Use Zod to validate:
    - `name`: string
    - `image_url`: string (temporary URL or file payload)
    - `photo_slots`: array of PhotoSlot objects
    - `canvas_width`: number
    - `canvas_height`: number
- **Sanitization**: Call `sanitize()` on the `name`.
- **R2 Integration**: If a file is uploaded, use `lib/r2-storage.ts` to upload to the [frames](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/app/api/frames) folder.
- **Database**: Insert into Supabase table with `organization_id`.

### `PATCH /api/frames/[id]`
- **Auth**: Verify ownership! Query frame first and check `frame.organization_id === orgId`.
- **Update**: Allow partial updates to `photo_slots`, `is_active`, and `name`.
- **IDOR Protection**: NEVER update based on ID alone without the ORG check.

## 3. Database Schema Reference
```sql
TABLE public.frames (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  photo_slots jsonb DEFAULT '[]'::jsonb,
  price integer DEFAULT 15000,
  is_active boolean DEFAULT true,
  canvas_width integer DEFAULT 600,
  canvas_height integer DEFAULT 1050,
  booth_id uuid REFERENCES booths(id) -- Optional: for booth-specific frames
)
```

## 4. Implementation Guidelines
- **Logging**: Log all errors with the route path (e.g., `console.error("/api/frames POST error", err)`).
- **Service Role**: Use `supabase-server.ts` to perform operations as the service role to bypass individual user RLS, but perform manual Org checks.
- **Error Responses**: Always return `NextResponse.json({ error: "..." }, { status: ... })`.
