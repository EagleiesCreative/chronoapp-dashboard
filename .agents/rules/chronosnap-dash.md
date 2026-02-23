---
trigger: always_on
---

# ChronoSnap Backoffice — Agent Rules

> **These rules are mandatory for every AI agent interaction with this codebase.**
> Violating any rule below will produce incorrect, broken, or inconsistent code.

---

## 1. Project Identity

| Key | Value |
|---|---|
| **App Name** | ChronoSnap Backoffice |
| **Purpose** | Admin dashboard / backoffice for the ChronoSnap photobooth SaaS platform |
| **Framework** | Next.js **16.0.10** (App Router, Turbopack) |
| **React** | **19.2.0** (with React Compiler enabled) |
| **Language** | TypeScript **5.x** (strict mode) |
| **Styling** | **TailwindCSS v4** (NOT v3 — no `tailwind.config.ts`, uses `@theme inline` in CSS) |
| **UI Library** | **shadcn/ui** (new-york style) + Radix UI primitives |
| **Icons** | **Lucide React** (primary) + **Tabler Icons** (secondary) |
| **Auth** | **Clerk** (`@clerk/nextjs` v6) — organizations + role-based access |
| **Database** | **Supabase** (PostgreSQL) via `@supabase/supabase-js` — server-side only with service role key |
| **Payments** | **Xendit** (Indonesia-focused) — QRIS, bank transfers, e-wallets |
| **Storage** | **Cloudflare R2** (S3-compatible) via `@aws-sdk/client-s3` |
| **Monitoring** | **Sentry** (`@sentry/nextjs` v10) |
| **Deployment** | **Vercel** — region `sin1` (Singapore) — serverless functions max 30s |
| **Package Manager** | **npm** (use `npm`, never `yarn` or `pnpm`) |

---

## 2. Directory Structure — NEVER deviate

```
backoffice-chronosnap/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── (auth)/             # Auth-specific route group (Clerk sign-in/sign-up)
│   │   ├── api/                # API route handlers (server-side only)
│   │   │   ├── admin/          # Platform admin APIs
│   │   │   ├── analytics/      # Analytics data API
│   │   │   ├── booths/         # Booth management API
│   │   │   ├── broadcast/      # Broadcast/notifications API
│   │   │   ├── dashboard/      # Dashboard stats API
│   │   │   ├── gallery/        # Photo gallery API
│   │   │   ├── orgs/           # Organization management APIs
│   │   │   ├── payments/       # Payment processing API
│   │   │   ├── payment-info/   # Payment info management
│   │   │   ├── reports/        # Report generation API
│   │   │   ├── subscriptions/  # Subscription management API
│   │   │   ├── vouchers/       # Voucher system API
│   │   │   ├── webhooks/       # External webhook handlers (Xendit, Clerk)
│   │   │   └── withdraw/       # Withdrawal management API
│   │   ├── dashboard/          # Dashboard pages (protected)
│   │   │   ├── analytics/
│   │   │   ├── billing/
│   │   │   ├── booths/
│   │   │   ├── broadcast/
│   │   │   ├── device-status/
│   │   │   ├── gallery/
│   │   │   ├── help/
│   │   │   ├── members/
│   │   │   ├── payments/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── support/
│   │   ├── globals.css         # Global CSS + TailwindCSS v4 theme + design tokens
│   │   └── layout.tsx          # Root layout (ClerkProvider → ThemeProvider → Toaster)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components — DO NOT manually edit
│   │   ├── dashboard/          # Dashboard-specific feature components
│   │   ├── backoffice/         # Platform admin components
│   │   ├── app-sidebar.tsx     # Main sidebar navigation
│   │   ├── site-header.tsx     # Top header bar
│   │   └── feature-gate.tsx    # Feature gating wrapper component
│   ├── lib/                    # Shared utilities (server-side focused)
│   │   ├── supabase-server.ts  # Supabase singleton client (service role)
│   │   ├── xendit.ts           # Xendit payment integration
│   │   ├── features.ts         # Subscription feature checking
│   │   ├── encryption.ts       # AES encryption for sensitive data
│   │   ├── r2-storage.ts       # Cloudflare R2 file operations
│   │   ├── clerk-sync.ts       # Clerk webhook → Supabase sync
│   │   ├── excel-generator.ts  # Server-side Excel report generation
│   │   ├── export-excel.ts     # Client-side Excel export (uses XLSX + file-saver)
│   │   ├── pdf-generator.tsx   # PDF generation (@react-pdf/renderer)
│   │   ├── sanitize.ts         # DOMPurify input sanitization
│   │   └── utils.ts            # cn() utility (clsx + tailwind-merge)
│   ├── hooks/                  # React hooks
│   │   └── use-mobile.ts
│   ├── data/                   # Static data & configuration                
│   ├── proxy.ts                # Middleware (Clerk auth + rate limiting)
│   └── proxy-protected.ts      # Protected route middleware helper
├── prisma/                     # Prisma migrations (historical reference only)
├── public/                     # Static assets
├── scripts/                    # Build/deploy scripts
├── vercel.json                 # Vercel deployment config
├── components.json             # shadcn/ui configuration
└── package.json
```

### Critical File Location Rules

- **New pages** → `src/app/dashboard/[feature-name]/page.tsx`
- **New API routes** → `src/app/api/[feature-name]/route.ts`
- **New feature components** → `src/components/dashboard/` or `src/components/[feature-name]/`
- **New UI primitives** → Use `npx shadcn@latest add [component]` — NEVER create manually in `src/components/ui/`
- **New utilities** → `src/lib/[utility-name].ts`
- **New hooks** → `src/hooks/use-[name].ts`
- **Middleware** → `src/proxy.ts` (this IS the Next.js middleware — exported as default)

---

## 3. Import Path Rules

### ALWAYS use the `@/` path alias

```typescript
// ✅ CORRECT
import { supabase } from "@/lib/supabase-server"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ❌ WRONG — never use relative paths for cross-directory imports
import { supabase } from "../../lib/supabase-server"
import { Button } from "../ui/button"
```

The `@/` alias maps to `./src/*` as defined in `tsconfig.json`.

### Import Order Convention

1. React/Next.js imports
2. Third-party library imports
3. `@/lib/*` imports
4. `@/components/*` imports
5. `@/hooks/*` imports
6. Relative imports (same directory only)

---

## 4. React & Next.js Patterns

### Client vs. Server Components

- **Default is Server Component** in the App Router. Only add `"use client"` when the component needs:
  - `useState`, `useEffect`, or any React hooks
  - Browser APIs (`window`, `document`, `localStorage`)
  - Event handlers (`onClick`, `onChange`, etc.)
  - Third-party client-only libraries
- **API route handlers** (`route.ts`) are ALWAYS server-side — never add `"use client"`
- **Layout files** (`layout.tsx`) should be server components when possible

### Component Pattern

```typescript
// "use client" — only if needed (see rules above)
"use client"

import { useState } from "react"
import { SomeIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Always define prop interfaces above the component
interface MyComponentProps {
    title: string
    data: SomeType[]
    loading?: boolean
    onAction?: (id: string) => void
}

// Use named exports for components (not default exports, except pages)
export function MyComponent({ title, data, loading = false, onAction }: MyComponentProps) {
    // component body
}
```

### Page Component Pattern

```typescript
// Pages use default export
export default function Page() {
    // ...
}

// Pages with params:
export default function Page({ params }: { params: { id: string } }) {
    // ...
}
```

### Data Fetching Pattern (Client-Side)

This project fetches data client-side via internal API routes:

```typescript
"use client"

import { useEffect, useState } from "react"

export default function Page() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/some-endpoint')
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (err) {
                console.error("Failed to fetch data", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // render with loading states
}
```

---

## 5. API Route Handler Pattern

Every API route follows this exact structure:

```typescript
import { NextResponse, NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate with Clerk
        const { userId, orgId, orgRole } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // 2. Role check if needed
        const isAdmin = orgRole === "org:admin"

        // 3. Query Supabase
        const { data, error } = await supabase
            .from('table_name')
            .select('*')
            .eq('organization_id', orgId)

        if (error) {
            console.error("Error description:", error)
            return NextResponse.json({ error: "Human-readable error" }, { status: 500 })
        }

        // 4. Return data
        return NextResponse.json({ data })

    } catch (err: any) {
        console.error("/api/endpoint-name METHOD error", err)
        return NextResponse.json({
            error: err.message || "Internal server error"
        }, { status: 500 })
    }
}
```

### API Route Rules

1. **ALWAYS authenticate** with `const { userId, orgId, orgRole } = await auth()` — check `userId` and `orgId`
2. **ALWAYS use try/catch** with proper error logging via `console.error`
3. **ALWAYS return `NextResponse.json()`** — never return raw Response objects
4. **ALWAYS scope queries by `organization_id`** — this is a multi-tenant system
5. **ALWAYS validate request body** before processing
6. **Log errors with the route path** — e.g., `console.error("/api/withdraw POST error", err)`
7. **Role checking**: use `orgRole === "org:admin"` for admin-only operations
8. **NEVER expose** `SUPABASE_SERVICE_ROLE_KEY` or any secrets to the client

---

## 6. Database (Supabase) Rules

### Client Usage

- **Server-side ONLY**: Import from `@/lib/supabase-server` — uses service role key
- **NEVER create a Supabase client in client components** — always go through API routes
- The Supabase client is a lazy-initialized singleton via Proxy pattern

### Query Conventions

```typescript
// ✅ CORRECT — always scope by organization_id
const { data, error } = await supabase
    .from('table_name')
    .select('column1, column2')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

// ❌ WRONG — never query without org scoping
const { data, error } = await supabase
    .from('table_name')
    .select('*')
```

### Database Rules

1. **ALWAYS filter by `organization_id`** — every user-facing query must be org-scoped
2. **ALWAYS check the `error` return** from Supabase operations
3. **Use `.select()` with specific columns** when possible — avoid `select('*')` in production queries
4. **Use `.single()`** when expecting exactly one row
5. **Before inserting data, verify the table schema** — check column names exist using the Supabase MCP tools (`list_tables`, `execute_sql`) to avoid `column does not exist` errors
6. **NEVER assume column names** — always verify against the actual database schema first
7. **Date columns** use `created_at` and `updated_at` naming convention
8. **Status fields** use UPPERCASE strings: `'PENDING'`, `'PAID'`, `'SETTLED'`, `'EXPIRED'`, `'SUCCEEDED'`, `'FAILED'`, `'ACCEPTED'`
9. **Boolean columns** use `is_` prefix: `is_admin`, `is_active`

### Supabase Project

- The Supabase project URL references hostname `ztihg