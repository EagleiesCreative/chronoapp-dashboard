# Prompt Part 3: Frontend Builder Component

**Objective**: Create a premium, interactive Frame Builder UI in the Backoffice Dashboard using Tailwind v4 and shadcn/ui.

## 1. Visual Foundation
- **Design Style**: Follow the "Chronosnap Backoffice" premium aesthetic (Dark mode primary, neon green accents).
- **Layout**: Two-column layout:
    - **Left**: Interactive Canvas Preview.
    - **Right**: Settings sidebar (Collapsible sections).

## 2. Canvas Engine Features
- **Responsive Preview**: The canvas should scale to fit the container while maintaining the aspect ratio of the 2R/4R/A4 preset.
- **Photo Slots**:
    - Visually represent slots as boxes over the frame image.
    - Labels: Number each slot (1, 2, 3...).
    - Layer Indicator: Show a small "↑ Above" or "↓ Below" icon on each slot.
- **Dynamic Preview**: When a slot size or position changes via sliders, the canvas MUST update in real-time.

## 3. Sidebar Configuration
Group settings into semantic sections:
- **Canvas Setup**: Select preset (2R, 4R, A4) or input custom dimensions.
- **Asset Upload**: PNG upload with automatic dimension detection.
- **Slot Management**:
    - Add/Remove slots button.
    - List of active slots (click to select).
- **Slot Fine-Tuning** (Visible when a slot is selected):
    - X/Y Position sliders (0 - 1000 range for percentage-based logic).
    - Width/Height sliders.
    - Rotation slider (-180° to 180°).
    - Layer toggle (Above vs Below frame image).

## 4. Technical Requirements
- **Styling**: Use ONLY Tailwind v4 utility classes.
- **State Management**: Use `useState` for all builder state. Encapsulate the "Save" logic into a single JSON object matching the `photo_slots` schema in Supabase.
- **Component Path**: `src/components/dashboard/frames/FrameBuilder.tsx`.
- **Page Path**: `src/app/dashboard/frames/page.tsx` (Use a default export for the page).

## 5. UI Components to Use
- `shadcn/ui`: `Button`, `Input`, `Label`, `Slider`, `Switch`, `Card`, `Tabs`.
- `Lucide React`: `Plus`, `Trash2`, [Save](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/components/admin/FrameEditor.tsx#119-152), [Upload](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/src/components/admin/FrameEditor.tsx#56-89), `Maximize2`.

## 6. Premium Touches
- **Micro-animations**: Use [framer-motion](file:///Users/christinaindahsetiyorini/Documents/Eagleies%20Creative/chronoapp/node_modules/framer-motion) for slot entrance and selection highlights.
- **Empty States**: Show a beautiful "Upload starting image" illustration if `image_url` is null.
- **Feedback**: Use `sonner` for "Frame Saved" and "Upload Failed" notifications.
