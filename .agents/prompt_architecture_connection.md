# Prompt Part 1: Architecture & Connection Blueprint

**Objective**: Establish a seamless bridge between the ChronoSnap Backoffice (Dashboard) and the ChronoSnap Standalone (Kiosk) so that frames created in the web UI are immediately available to the physical booths.

## 1. Shared Database Strategy
- **Central Authority**: Both applications MUST point to the same Supabase project (`ztihgaxyczbcgmgqetyr.supabase.co`).
- **Data Model**: Use the existing `public.frames` table.
- **Multi-Tenancy**: 
    - Dashboard: Filter by `organization_id` (via Clerk).
    - Kiosk: Filter by `organization_id` associated with the Booth ID (via `booth_id` column in [frames](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/app/api/frames) or join with `booths` table).

## 2. Asset Flow (Cloudflare R2)
- **Dashboard Upload**: Use the `src/lib/r2-storage.ts` utility to upload frame PNGs to a bucket.
- **Public URL**: Frames must be stored in a bucket with a public CDN (e.g., `https://pub-<id>.r2.dev/frames/<id>.png`).
- **Kiosk Consumption**: `chronoapp` will fetch the JSON from Supabase and download the `image_url` directly from the R2 CDN. No complex authentication is required for asset downloads to ensure maximum compatibility.

## 3. Real-time Synchronization
- **Scenario**: A user saves a frame in the Dashboard.
- **Mechanism**: The Kiosk should use `supabase.channel('frames').on('postgres_changes', ...)` to detect inserts/updates. 
- **User Experience**: Show a "New Frames Available" toast on the Kiosk or automatically refresh the frame list in the `FrameSelector`.

## 4. Key Considerations for Implementation
- **CORS**: Ensure the R2 bucket allows GET requests from the origin where the Kiosk app is running (or `*` if it's a local Tauri environment).
- **Versioning**: If a frame is edited, append a timestamp/version to the R2 key (e.g., `frame_123_v16.png`) to avoid local caching issues on the Kiosk.
- **Fallback**: Always store `is_active` as a boolean to allow remote "kill switching" of problematic frames from the Dashboard.
