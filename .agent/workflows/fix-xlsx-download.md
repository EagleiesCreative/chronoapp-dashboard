---
description: How to fix browser file downloads that produce random UUID filenames instead of the intended filename
---

# Fix: Browser Downloads Producing Random UUID Filenames Instead of `.xlsx`

## Problem

When using `URL.createObjectURL()` + `<a download="filename.xlsx">` to trigger file downloads in the browser, Chrome and some other browsers **ignore the `download` attribute** and instead use the blob URL's internal UUID as the filename. This results in files like:

```
fa2fa1c7-1e4b-479e-88de-d65c
d6c93c25e-868a-a60e-a509-c0f6bd40058e
```

...instead of the intended `chrono-analytics.xlsx`.

## Root Cause

- `URL.createObjectURL()` creates a blob URL like `blob:http://localhost:3000/fa2fa1c7-...`
- Chrome does **not** reliably respect the `download` attribute on `<a>` tags when the `href` is a blob URL, particularly in development environments or with certain MIME types.
- This is a known, long-standing browser behavior inconsistency.

## Solution

Use the **`file-saver`** library, which handles cross-browser file download edge cases internally.

### Step 1: Install dependencies

```bash
npm install file-saver @types/file-saver
```

### Step 2: Use `saveAs()` instead of manual blob/link approach

```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export function exportToExcel(data: any[], filename: string = 'export.xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    // Use type: 'array' to get an ArrayBuffer
    const wbArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array',
    });

    const blob = new Blob([wbArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // file-saver handles filename correctly across all browsers
    saveAs(blob, filename);
}
```

### Key Points

| Approach | Filename Reliable? | Cross-Browser? |
|---|---|---|
| `XLSX.writeFile(wb, name)` | ❌ Broken in Turbopack/Next.js | ❌ |
| `URL.createObjectURL` + `<a download>` | ❌ Chrome ignores `download` attr on blob URLs | ❌ |
| `file-saver` `saveAs(blob, name)` | ✅ Works everywhere | ✅ |

### Why NOT `XLSX.writeFile()`?

`XLSX.writeFile()` internally tries to use Node.js `fs` module. In browser-only environments (especially Next.js with Turbopack), this falls back to a blob approach that has the same UUID filename problem.

### Why `type: 'array'` instead of `type: 'binary'`?

- `type: 'binary'` returns a binary string that needs manual conversion via `s2ab()` helper
- `type: 'array'` returns a native `ArrayBuffer` that can be directly passed to `new Blob()`
- Cleaner, fewer lines, no helper functions needed
