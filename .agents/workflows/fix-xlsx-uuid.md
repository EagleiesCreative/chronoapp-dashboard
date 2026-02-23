---
description: How to fix browser file downloads that produce random UUID filenames instead of the intended filename
---

# Prompt Guideline: Fixing UUID Filenames in Browser File Exports

**Author:** Senior Software Engineer  
**Target Audience:** AI Assistants & Frontend Developers  
**Context:** When a user reports that downloading an `.xlsx` (or `.csv`) file results in a file with a random UUID name (e.g., `fa2fa1c7-1e4b-479e-88de-d65c`) instead of the requested filename, follow this standard operating procedure.

---

## 🛑 The Problem
In modern web applications (especially Next.js / Turbopack / Tauri webviews), generating a file client-side using `URL.createObjectURL(blob)` and triggering a download via a hidden `<a download="filename.ext">` tag often fails. 

**Symptoms:**
1. The browser completely ignores the `download` attribute on the `<a>` element.
2. The downloaded file assumes the name of the Blob URL's trailing UUID (e.g., `blob:http://localhost:3000/1234-5678...` downloads as `1234-5678...`).
3. The downloaded file lacks an extension (no `.xlsx`), confusing the operating system.

## 🔍 Root Cause Analysis
- **Chrome / WebKit Security:** Browsers are increasingly restrictive about programmatic downloads from cross-origin contexts or dynamically generated Blob URIs, often stripping the `download` attribute for security or structural reasons.
- **Node `fs` Fallbacks:** Libraries like `xlsx` attempting to use `XLSX.writeFile()` on the frontend will try to polyfill Node's `fs`, failing over to a flawed Blob-URL implementation that suffers from this exact UUID bug.
- **Framework Interception:** Frameworks like Next.js App Router or Tauri intercept global `<a>` clicks, sometimes discarding standard HTML5 attributes like `download`.

---

## ✅ The Standard Fix (Do This!)

Never use `URL.createObjectURL` or `XLSX.writeFile` for client-side downloads when this bug is reported. Instead, strictly implement the **`file-saver`** library, which relies on battle-tested, cross-browser techniques (including proper `Content-Disposition` mimics and `msSaveOrOpenBlob` for Edge/IE).

### Step 1: Install Dependencies
Instruct the environment to install `file-saver`:
```bash
npm install file-saver @types/file-saver
```

### Step 2: Implement the `saveAs` Pattern
Rewrite the export utility to utilize `XLSX.write` with `type: 'array'` to securely generate an `ArrayBuffer`, convert it to a `Blob`, and pass it to `saveAs`.

```typescript
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Robust Client-Side Excel Export
 * Guaranteed to respect the filename in Chrome, Safari, and Tauri.
 */
export function exportToExcel(data: any[], filename: string = 'export.xlsx') {
    // 1. Create Worksheet/Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // 2. Write to ArrayBuffer (Do NOT use XLSX.writeFile)
    const wbArrayBuffer = XLSX.write(wb, {
        bookType: 'xlsx',
        type: 'array', // Crucial: Returns native ArrayBuffer for the Blob
    });

    // 3. Create Blob with strict MIME type
    const blob = new Blob([wbArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // 4. Trigger safe download
    saveAs(blob, filename);
}
```

### 💡 Why this is the Architecturally Sound Choice:
- **`type: 'array'`** bypasses the need for legacy binary-string conversion (`s2ab` loops).
- **`saveAs`** manages the messy DOM injection, click simulation, and cleanup automatically, while guaranteeing the filename is respected across all modern browsers.
