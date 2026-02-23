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

- The Supabase project URL references hostname `ztihgaxyczbcgmgqetyr.supabase.co`
- Always use the Supabase MCP tools to verify schema before making database changes

---

## 7. Authentication (Clerk) Rules

### Provider Hierarchy

Root layout wraps everything in:
```
ClerkProvider → ThemeProvider → Toaster
```

### Auth Patterns

- **Server-side (API routes)**: `import { auth } from "@clerk/nextjs/server"` → `await auth()`
- **Client-side (components)**: Use Clerk hooks (`useUser`, `useOrganization`, `useAuth`)
- **Middleware**: Defined in `src/proxy.ts` using `clerkMiddleware` with rate limiting

### Protected Routes

These routes require authentication (defined in `src/proxy.ts`):
- `/dashboard(.*)` — all dashboard pages
- `/api/payments(.*)` — payment APIs
- `/api/booths(.*)` — booth APIs
- `/api/analytics(.*)` — analytics APIs
- `/api/reports(.*)` — report APIs

### Clerk Webhook Sync

When Clerk fires org/user events, they sync to Supabase via `src/lib/clerk-sync.ts`. Always maintain this sync when adding new user/org fields.

### Role-Based Access

- **Admin**: `orgRole === "org:admin"` — full access to org data
- **Member**: Limited to their own data (scoped by `user_id`)
- Always check both `userId` AND `orgId` before proceeding

---

## 8. Styling Rules (TailwindCSS v4)

### ⚠️ CRITICAL: This project uses TailwindCSS v4, NOT v3

- **NO `tailwind.config.ts`** — configuration lives in `src/app/globals.css` using `@theme inline`
- **NO `@apply` outside `@layer base`** — use utility classes in JSX
- Dark mode variant: `@custom-variant dark (&:is(.dark *))`

### Design Token System

Colors are defined as CSS custom properties in `globals.css`:

| Token | Light | Dark |
|---|---|---|
| Primary (Neon Green) | `#00dd63` | `#00dd63` |
| Secondary (Indigo) | `#6366f1` | `#6366f1` |
| Background | `#f3f4f6` | `#030712` |
| Card | `#ffffff` | `#111827` |
| Destructive | `#ef4444` | `#ef4444` |

### Color Usage Rules

```typescript
// ✅ CORRECT — use semantic token names
className="bg-background text-foreground"
className="bg-card text-card-foreground"
className="bg-primary text-primary-foreground"
className="border-border"
className="text-muted-foreground"

// ✅ Extended palette available with numbered variants
className="bg-primary-500 text-gray-950"
className="text-primary-400"

// ❌ WRONG — never use raw hex/rgb in className
className="bg-[#00dd63]"
className="text-[#111827]"
```

### Semantic Colors Available

- `success` → `#10b981`
- `error` → `#ef4444`
- `warning` → `#f59e0b`
- `info` → `#3b82f6`
- `purple` → `#8b5cf6`

### Typography

- Sans font: **Geist** (CSS var: `--font-geist-sans`)
- Mono font: **Geist Mono** (CSS var: `--font-geist-mono`)
- Both loaded via `next/font/google`

### Class Merging

Always use the `cn()` utility for conditional/merged classes:

```typescript
import { cn } from "@/lib/utils"

<div className={cn(
    "base-classes",
    isActive && "active-classes",
    variant === "destructive" && "text-destructive"
)} />
```

### Animations

Custom animations are defined in `globals.css`:
- `.animate-glow-pulse` — neon glow effect for CTAs
- `.animate-bar-grow` — chart bar entrance animation
- Always respect `prefers-reduced-motion`

---

## 9. UI Component Rules

### shadcn/ui Configuration

- Style: **new-york**
- RSC: **true**
- Icon library: **lucide**
- CSS variables: **enabled**

### Adding New shadcn/ui Components

```bash
# ✅ CORRECT — use the CLI
npx shadcn@latest add [component-name]

# ❌ WRONG — never manually create files in src/components/ui/
```

### Component Library Rules

1. **NEVER manually edit `src/components/ui/` files** — these are shadcn/ui generated
2. **Custom components** go in `src/components/` or `src/components/dashboard/`
3. **Use `Sonner`** for toast notifications: `import { toast } from "sonner"` → `toast.success()`, `toast.error()`
4. **Use Radix UI `Select`** — the `<Select.Item>` component CANNOT have an empty string `""` as its `value`. Use a non-empty placeholder like `"none"` and convert to `null` in form submission
5. **Use `@tanstack/react-table`** for data tables — see `src/components/data-table.tsx`
6. **Use `react-hook-form` + `zod`** for form validation with `@hookform/resolvers`
7. **Use `recharts`** for data visualization/charts
8. **Use `vaul`** for drawer components

### Theme Switching

- Default theme: **dark**
- Theme provider: `next-themes` with `attribute="class"`
- Theme switch component: `src/components/ThemeSwitch.tsx`

---

## 10. File Export & Download Rules

### Client-Side Excel Export

Use `src/lib/export-excel.ts` which uses **XLSX + file-saver**:

```typescript
import { exportToExcel } from "@/lib/export-excel"

// Always use file-saver's saveAs() for downloads — NOT URL.createObjectURL + anchor
exportToExcel(transactions, stats, 'filename.xlsx')
```

### Server-Side Report Generation

- Excel: `src/lib/excel-generator.ts` (ExcelJS)
- PDF: `src/lib/pdf-generator.tsx` (@react-pdf/renderer)

### Download Filename Rules

> **CRITICAL**: Browser downloads can produce random UUID filenames instead of the intended name. Always use `file-saver`'s `saveAs()` for client-side downloads. See the workflow `/fix-xlsx-download` for fixing this issue.

---

## 11. Payment Integration (Xendit) Rules

- Integration code: `src/lib/xendit.ts`
- Webhook handler: `src/app/api/webhooks/route.ts`
- Payment channels: QRIS, bank transfers (BCA, BNI, BRI, Mandiri, etc.), e-wallets
- **Currency**: IDR (Indonesian Rupiah) — always display amounts in IDR
- **Status values**: `PENDING`, `PAID`, `SETTLED`, `EXPIRED`, `FAILED`
- **Xendit invoice IDs** are stored as `xendit_invoice_id` — use this to deduplicate payment records
- **NEVER expose `XENDIT_SECRET_KEY`** to the client

---

## 12. Feature Gating & Subscription System

### Feature Gate Pattern

```typescript
import { hasFeature, FEATURES } from "@/lib/features"

// In API routes:
if (!(await hasFeature(orgId, FEATURES.VOUCHERS))) {
    return NextResponse.json({ error: "Feature not available on your plan" }, { status: 403 })
}

// In components:
import { FeatureGate } from "@/components/feature-gate"

<FeatureGate feature="vouchers">
    <VoucherComponent />
</FeatureGate>
```

### Available Features

- `vouchers`, `multiprint`, `paper_tracking`, `priority_support`, `custom_branding`, `advanced_analytics`

### Subscription Plans

- **Basic** — always active, limited features
- **Pro** — requires active subscription status + expiry check

---

## 13. Security Rules — MANDATORY FOR ALL CODE

> ⚠️ **CRITICAL**: Security is NON-NEGOTIABLE. Every line of code that handles user input, database queries, authentication, or external communication MUST follow these rules. Violations can lead to data breaches, financial loss, and legal liability.

### 13.1 Input Sanitization & Validation (XSS Prevention)

**Every piece of user input MUST be sanitized before storage or rendering.**

```typescript
import { sanitize } from "@/lib/sanitize"

// ✅ CORRECT — sanitize ALL user-provided strings before storing or rendering
const cleanTitle = sanitize(body.title)
const cleanDescription = sanitize(body.description)
const cleanName = sanitize(body.name)

// ❌ WRONG — storing raw user input directly
const title = body.title // DANGEROUS — may contain <script> tags
```

**Rules:**
1. **ALWAYS call `sanitize()`** on every string field from `req.json()` before inserting into Supabase
2. **NEVER use `dangerouslySetInnerHTML`** — if absolutely required, sanitize with DOMPurify first
3. **NEVER trust client-side data** — always re-validate on the server
4. **Sanitize URL parameters and query strings** before using them in queries or rendering
5. **Strip HTML tags** from user display names, descriptions, and any free-text fields

### 13.2 SQL Injection Prevention

Supabase JS client uses parameterized queries internally, but you MUST still follow these rules:

```typescript
// ✅ CORRECT — use Supabase query builder with typed parameters
const { data } = await supabase
    .from('booths')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('id', boothId)

// ❌ WRONG — NEVER concatenate user input into raw SQL
const { data } = await supabase.rpc('custom_function', {
    query: `SELECT * FROM booths WHERE id = '${boothId}'`  // SQL INJECTION!
})

// ❌ WRONG — NEVER use string interpolation in .or() or .filter()
const { data } = await supabase
    .from('booths')
    .select('*')
    .or(`name.eq.${userInput}`)  // INJECTION RISK!

// ✅ CORRECT — use proper filter syntax
const { data } = await supabase
    .from('booths')
    .select('*')
    .eq('name', userInput)  // Parameterized safely
```

**Rules:**
1. **NEVER concatenate user input** into raw SQL strings or RPC parameters
2. **NEVER use string interpolation** in Supabase `.or()`, `.filter()`, or `.rpc()` calls
3. **ALWAYS use the Supabase query builder** methods (`.eq()`, `.in()`, `.ilike()`, etc.)
4. If you must use `.rpc()`, pass user input as **bound parameters**, never as part of the SQL string

### 13.3 Broken Access Control (IDOR Prevention)

**Insecure Direct Object Reference (IDOR)** is the #1 vulnerability in multi-tenant SaaS apps.

```typescript
// ✅ CORRECT — ALWAYS verify the resource belongs to the authenticated org
const { data: booth, error } = await supabase
    .from('booths')
    .select('*')
    .eq('id', boothId)                  // User-provided ID
    .eq('organization_id', orgId)        // MUST scope to authenticated org
    .single()

if (!booth) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
}

// ❌ WRONG — fetching by ID without org scoping allows cross-tenant access
const { data: booth } = await supabase
    .from('booths')
    .select('*')
    .eq('id', boothId)  // ANY user can access ANY booth!
    .single()
```

**Rules:**
1. **EVERY query that uses a user-provided ID MUST also include `.eq('organization_id', orgId)`**
2. **EVERY update/delete operation MUST verify ownership** before modifying the resource
3. **Non-admin users** must additionally be scoped by `user_id` for personal data
4. **NEVER trust client-provided `organization_id`** — always use the one from `await auth()` (Clerk)
5. **For admin-only operations**, always check `orgRole === "org:admin"` before proceeding
6. **Return 404 (not 403)** when a resource doesn't belong to the user's org — don't leak existence info

### 13.4 Mass Assignment Prevention

**NEVER insert or update with the raw request body.** Always pick only the allowed fields.

```typescript
// ✅ CORRECT — explicitly pick allowed fields
const body = await req.json()
const { name, description, location } = body

await supabase.from('booths').insert({
    name: sanitize(name),
    description: sanitize(description),
    location: sanitize(location),
    organization_id: orgId,  // From Clerk auth, NOT from body
    created_by: userId,      // From Clerk auth, NOT from body
})

// ❌ WRONG — spreading the entire body allows attackers to set any field
await supabase.from('booths').insert({
    ...body,                 // Attacker can set organization_id, is_admin, etc!
    organization_id: orgId,
})
```

**Rules:**
1. **NEVER use spread operator (`...body`)** for database inserts or updates
2. **NEVER allow the client to set**: `organization_id`, `user_id`, `is_admin`, `orgRole`, `status`, `created_at`, `updated_at`
3. **Always destructure only the expected fields** from the request body
4. **Server-owned fields** (`organization_id`, `user_id`, `created_at`) must be set by the server, not the client

### 13.5 Authentication & Session Security

```typescript
// ✅ CORRECT — full auth check pattern (MANDATORY for every API route)
export async function POST(req: NextRequest) {
    try {
        const { userId, orgId, orgRole } = await auth()
        
        // Step 1: Verify user is authenticated
        if (!userId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }

        // Step 2: Verify org is selected (multi-tenant isolation)
        if (!orgId) {
            return NextResponse.json({ error: "No organization selected" }, { status: 400 })
        }

        // Step 3: Role check for sensitive operations
        if (orgRole !== "org:admin") {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
        }

        // Step 4: THEN proceed with business logic...
    } catch (err: any) {
        // ...
    }
}
```

**Rules:**
1. **EVERY API route MUST call `await auth()`** as the FIRST operation
2. **NEVER skip the `orgId` check** — this is your tenant isolation boundary
3. **NEVER trust client-side role checks alone** — always re-verify on the server
4. **NEVER store or log JWT tokens, session IDs, or Clerk secrets**
5. **Admin operations** MUST check `orgRole === "org:admin"` on the server — client-side checks are insufficient

### 13.6 Sensitive Data Protection & Encryption

```typescript
import { encrypt, decrypt, maskBankAccount } from "@/lib/encryption"

// ✅ CORRECT — encrypt sensitive data before storing
const encryptedAccountNumber = encrypt(accountNumber)
const encryptedHolderName = encrypt(accountHolderName)
const last4 = accountNumber.slice(-4)

await supabase.from('withdrawals').insert({
    account_number_encrypted: encryptedAccountNumber,
    account_holder_name_encrypted: encryptedHolderName,
    account_number_last4: last4,  // Only store last 4 digits unencrypted
    // ...
})

// ✅ CORRECT — mask sensitive data in API responses
const masked = maskBankAccount(accountNumber)  // Shows "****1234"
```

**Rules:**
1. **NEVER store bank account numbers, credit card numbers, or PII in plaintext**
2. **ALWAYS encrypt** using `encrypt()` from `@/lib/encryption` before inserting into Supabase
3. **ONLY store the last 4 digits** unencrypted for display purposes
4. **NEVER return decrypted sensitive data** in API responses — return masked versions only
5. **NEVER log sensitive data** — no `console.log(accountNumber)`, `console.log(body)` with PII

### 13.7 Environment Variables & Secrets

**NEVER hardcode secrets. NEVER expose server-side secrets to the client.**

```typescript
// ✅ CORRECT — access secrets only in server-side code (API routes, lib/)
const xenditKey = process.env.XENDIT_SECRET_KEY

// ❌ WRONG — using NEXT_PUBLIC_ prefix exposes secrets to the browser
const xenditKey = process.env.NEXT_PUBLIC_XENDIT_SECRET_KEY  // EXPOSED TO CLIENT!
```

**Rules:**
1. **`NEXT_PUBLIC_` prefix** = exposed to the browser. Only use for genuinely public values (Supabase URL, Clerk publishable key, Sentry DSN)
2. **Server secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `CLERK_SECRET_KEY`, `XENDIT_SECRET_KEY`, `R2_SECRET_ACCESS_KEY`, `CLERK_WEBHOOK_SECRET`, `XENDIT_CALLBACK_TOKEN`) must NEVER have `NEXT_PUBLIC_` prefix
3. **NEVER include secrets** in error messages, console.log, or API responses
4. **NEVER commit `.env.local`** or `.env.prod` to version control (already in `.gitignore`)
5. **NEVER hardcode** API keys, tokens, or passwords in source code — always use `process.env`

**Required env vars (from `ENV_TEMPLATE.md`):**

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 Server-only | Service role key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Clerk publishable key |
| `CLERK_SECRET_KEY` | 🔒 Server-only | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | 🔒 Server-only | Webhook signing secret |
| `XENDIT_SECRET_KEY` | 🔒 Server-only | Xendit API secret |
| `XENDIT_CALLBACK_TOKEN` | 🔒 Server-only | Callback verification token |
| `R2_ENDPOINT` | 🔒 Server-only | Cloudflare R2 endpoint |
| `R2_ACCESS_KEY_ID` | 🔒 Server-only | R2 access key |
| `R2_SECRET_ACCESS_KEY` | 🔒 Server-only | R2 secret key |
| `R2_BUCKET_NAME` | 🔒 Server-only | R2 bucket name |
| `SENTRY_AUTH_TOKEN` | 🔒 Server-only | Sentry auth token |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Sentry DSN |

### 13.8 Rate Limiting

- Implemented in `src/proxy.ts` using in-memory token bucket
- Config: 20 max tokens, 1 token/second refill
- Applied to all `/api/*` routes EXCEPT `/api/webhooks`
- For strict global rate limiting, upgrade to Redis (Upstash)

**Rules:**
1. **NEVER disable rate limiting** for user-facing API routes
2. **Webhook routes are exempt** because they have their own signature verification
3. **Consider stricter limits** for sensitive operations (withdrawals, password changes): implement per-route limiting if needed

---

## 14. Error Handling Rules

1. **ALWAYS wrap API route handlers in try/catch**
2. **Log errors with route context**: `console.error("/api/[route] [METHOD] error", err)`
3. **Return structured JSON errors**: `{ error: "Human-readable message", details?: string }`
4. **Use appropriate HTTP status codes**:
   - `401` — Not authenticated
   - `400` — Bad request / missing org / invalid input
   - `403` — Feature not available / insufficient permissions
   - `404` — Resource not found
   - `429` — Rate limited
   - `500` — Internal server error
5. **Client-side**: Use `toast.error("message")` from Sonner for user-facing errors

---

## 15. Deployment & Vercel Rules

### Vercel Configuration

- Region: **sin1** (Singapore)
- API function max duration: **30 seconds**
- CORS headers applied to all `/api/*` routes via `vercel.json`

### Build & Dev Commands

```bash
npm run dev      # Local development (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

### Serverless Function Limits

- Max body size: ~4.5 MB (Vercel free/hobby) — use presigned URLs for large file uploads
- Max duration: 30 seconds (configured in `vercel.json`)
- Cold starts affect rate limiting (in-memory token bucket resets)

---

## 16. Sentry Error Monitoring

- Client config: `sentry.client.config.ts`
- Server config: `sentry.server.config.ts`
- Edge config: `sentry.edge.config.ts`
- Tunnel route: `/monitoring` (bypass ad-blockers)
- Tree-shaking: Debug logging automatically removed in production
- Global error boundary: `src/app/global-error.tsx`

---

## 17. Multi-Tenant Architecture Rules

This is a **multi-tenant SaaS** application. Every data operation MUST be scoped to the current organization.

1. **Every database query MUST include `organization_id` filter** (unless it's a platform admin operation in `/api/admin/*`)
2. **Every API route MUST verify `orgId`** from Clerk auth before proceeding
3. **Member data visibility** is restricted by `user_id` — only admins see all org data
4. **Revenue sharing** is per-member via `member_revenue_shares` table
5. **Subscription plans** are per-organization, not per-user

---

## 18. Common Mistakes to AVOID

### Database

- ❌ Inserting data with column names that don't exist in the table schema — ALWAYS verify schema first
- ❌ Missing `organization_id` filter on queries — this leaks data between tenants
- ❌ Not checking Supabase `error` return values
- ❌ Using `select('*')` in high-traffic queries — specify columns

### Components

- ❌ Using `<Select.Item value="">` — Radix Select does not allow empty string values
- ❌ Manually creating files in `src/components/ui/` — use shadcn CLI
- ❌ Using `alert()` or `window.confirm()` — use Sonner toasts or Dialog components
- ❌ Forgetting `"use client"` on components that use hooks/event handlers

### Styling

- ❌ Using TailwindCSS v3 syntax (`tailwind.config.ts`, `@tailwind base/components/utilities`) — this is v4
- ❌ Using raw hex colors instead of design tokens
- ❌ Not using `cn()` for conditional class merging

### Auth

- ❌ Accessing Supabase directly from client components — always go through API routes
- ❌ Not checking both `userId` AND `orgId` in API routes
- ❌ Exposing service role keys or secret keys to the client

### File Downloads

- ❌ Using `URL.createObjectURL` + anchor tag for downloads — produces UUID filenames in some browsers
- ❌ Not using `file-saver`'s `saveAs()` for client-side file downloads

### Deployment

- ❌ Uploading large files (>4.5MB) directly through API routes — use presigned R2 URLs
- ❌ Long-running operations in API routes (>30s) — they will timeout on Vercel

---

## 19. Code Quality Standards

1. **TypeScript strict mode** — no `any` types unless absolutely necessary (legacy data patterns OK)
2. **Always define interfaces** for component props
3. **Named exports** for components, **default exports** for pages only
4. **Use `const` over `let`** whenever possible
5. **Async/await** over `.then()` chains
6. **Meaningful variable names** — no single letters except loop counters
7. **Comment complex business logic** — especially payment/subscription/revenue-share calculations

---

## 20. When Adding New Features — Checklist

Before implementing any new feature, verify the following:

- [ ] Checked the Supabase database schema for existing tables/columns using MCP tools
- [ ] API route includes Clerk auth check (`userId` + `orgId`)
- [ ] Database queries are scoped by `organization_id`
- [ ] Error handling with try/catch and proper HTTP status codes
- [ ] Client components have `"use client"` directive if using hooks
- [ ] Styling uses design tokens (not raw colors)
- [ ] Feature gating checked if this is a premium feature
- [ ] toast notifications for user feedback (success/error)
- [ ] Loading states handled in the UI
- [ ] The new route is added to middleware protection if needed (`src/proxy.ts`)

---

## 21. API Security Hardening

### 21.1 Request Body Validation with Zod

**EVERY API route that accepts a request body MUST validate it with Zod before processing.**

```typescript
import { z } from "zod"

// Define strict schema BEFORE the handler
const CreateBoothSchema = z.object({
    name: z.string().min(1).max(100).trim(),
    location: z.string().max(200).trim().optional(),
    description: z.string().max(500).trim().optional(),
})

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth()
        if (!userId || !orgId) { /* ... */ }

        const body = await req.json()
        
        // ✅ CORRECT — validate and parse BEFORE using any data
        const parsed = CreateBoothSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json({
                error: "Invalid input",
                details: parsed.error.flatten().fieldErrors
            }, { status: 400 })
        }

        // Now use parsed.data — it is typed and validated
        const { name, location, description } = parsed.data
        // ...
    } catch (err: any) { /* ... */ }
}
```

**Rules:**
1. **Define Zod schemas** at the top of the route file or in a shared `src/lib/validations/` directory
2. **Use `.safeParse()`** — NEVER use `.parse()` (it throws and you lose control of the error response)
3. **Apply constraints**: `.min()`, `.max()`, `.trim()`, `.email()`, `.url()`, `.regex()` as appropriate
4. **Numeric fields**: Use `z.number().int().positive()` for amounts, IDs, etc.
5. **Enum fields**: Use `z.enum(['PENDING', 'PAID', ...])` for status fields
6. **NEVER trust `body.amount`** for financial operations — validate it's a positive integer

### 21.2 Financial Amount Validation

```typescript
// ✅ CORRECT — always validate amounts as positive integers (IDR has no decimals)
const AmountSchema = z.number()
    .int("Amount must be a whole number")
    .positive("Amount must be positive")
    .max(100_000_000, "Amount exceeds maximum limit")  // 100M IDR cap

// ✅ CORRECT — re-verify balance server-side before processing withdrawal
if (amount > netBalance) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
}

// ❌ WRONG — trusting client-provided balance
const balance = body.availableBalance  // NEVER trust this!
```

### 21.3 Response Data Filtering

**NEVER return raw database rows to the client. Always filter sensitive fields.**

```typescript
// ✅ CORRECT — explicitly shape the response
return NextResponse.json({
    withdrawal: {
        id: withdrawal.id,
        reference_id: withdrawal.reference_id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        created_at: withdrawal.created_at,
    }
})

// ❌ WRONG — returning the full database row
return NextResponse.json({ withdrawal })  // May leak encrypted fields, internal IDs, etc.
```

**Fields that MUST NEVER appear in API responses:**
- `account_number_encrypted`, `account_holder_name_encrypted`
- `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`
- Internal `user_id` from other organizations
- Raw Clerk tokens or session data
- Database internal metadata (`ctid`, system columns)

### 21.4 HTTP Method Enforcement

```typescript
// Only export the HTTP methods your route actually supports
// Next.js automatically returns 405 for unsupported methods

// ✅ If a route only supports GET, only export GET
export async function GET(req: NextRequest) { /* ... */ }

// ❌ WRONG — exporting methods you don't need
export async function GET(req: NextRequest) { /* ... */ }
export async function POST(req: NextRequest) { /* not implemented */ }
export async function DELETE(req: NextRequest) { /* not implemented */ }
```

---

## 22. Client-Side Security Rules

### 22.1 XSS Prevention in React Components

```typescript
// ✅ CORRECT — React auto-escapes JSX expressions
<p>{userData.name}</p>  // Safe — React escapes this

// ❌ WRONG — NEVER use dangerouslySetInnerHTML with unsanitized content
<div dangerouslySetInnerHTML={{ __html: userData.bio }} />  // XSS VULNERABILITY!

// ✅ If you MUST render HTML (very rare), sanitize first
import DOMPurify from "dompurify"
const cleanHtml = DOMPurify.sanitize(userData.bio)
<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
```

**Rules:**
1. **NEVER use `dangerouslySetInnerHTML`** unless you have sanitized the content with DOMPurify
2. **NEVER construct HTML strings** with user data — always use JSX
3. **NEVER use `eval()`**, `new Function()`, or `document.write()` — ever
4. **NEVER insert user data** into `href`, `src`, or event handler attributes without validation

### 22.2 URL & Link Safety

```typescript
// ✅ CORRECT — validate URLs before using them
const isValidUrl = (url: string) => {
    try {
        const parsed = new URL(url)
        return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
        return false
    }
}

// ❌ WRONG — using user-provided URLs without validation
<a href={userProvidedUrl}>Click here</a>  // Could be javascript: protocol!
<img src={userProvidedSrc} />              // Could load malicious content!
```

**Rules:**
1. **NEVER use user-provided URLs** in `href` or `src` without validating the protocol is `http:` or `https:`
2. **Block `javascript:` protocol** in all user-provided URLs
3. **Use `rel="noopener noreferrer"`** on external links with `target="_blank"`

### 22.3 Sensitive Data in Client Components

```typescript
// ❌ WRONG — NEVER store secrets in client-side state or localStorage
localStorage.setItem('supabaseKey', key)      // EXPOSED!
const [secret, setSecret] = useState(apiKey)  // EXPOSED IN DEVTOOLS!

// ❌ WRONG — NEVER log sensitive data in client components
console.log('Payment data:', paymentDetails)  // Visible in browser console!

// ✅ CORRECT — all sensitive operations go through API routes
const res = await fetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify({ amount, method }),  // Only send what's needed
})
```

**Rules:**
1. **NEVER store API keys, tokens, or secrets** in `localStorage`, `sessionStorage`, or cookies
2. **NEVER store PII** (bank accounts, passwords, full names) in client-side state longer than needed
3. **NEVER log sensitive data** in client components — `console.log` output is visible to users
4. **Clear sensitive form data** after submission (reset form state)

---

## 23. Webhook Security Rules

### 23.1 Webhook Signature Verification (MANDATORY)

**EVERY webhook handler MUST verify the request signature before processing.**

```typescript
// ✅ CORRECT — verify Xendit webhook callback token
export async function POST(req: NextRequest) {
    try {
        const callbackToken = req.headers.get('x-callback-token')
        
        if (callbackToken !== process.env.XENDIT_CALLBACK_TOKEN) {
            console.error('Invalid Xendit callback token')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only process the webhook AFTER verification
        const body = await req.json()
        // ...
    } catch (err) { /* ... */ }
}

// ✅ CORRECT — verify Clerk webhook signature
import { Webhook } from 'svix'

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) throw new Error('Missing CLERK_WEBHOOK_SECRET')

    const svixHeaders = {
        'svix-id': req.headers.get('svix-id') || '',
        'svix-timestamp': req.headers.get('svix-timestamp') || '',
        'svix-signature': req.headers.get('svix-signature') || '',
    }

    const body = await req.text()
    const wh = new Webhook(webhookSecret)
    const event = wh.verify(body, svixHeaders)  // Throws if invalid
    // ...
}
```

**Rules:**
1. **ALWAYS verify the webhook signature/token BEFORE parsing or processing the body**
2. **Xendit**: Check `x-callback-token` header against `XENDIT_CALLBACK_TOKEN`
3. **Clerk**: Use `svix` library to verify the signature with `CLERK_WEBHOOK_SECRET`
4. **Return 401** for invalid signatures — do NOT process the request
5. **Log failed verification attempts** for security monitoring
6. **Webhooks are exempt from Clerk auth** (they come from external services) but have their own verification

### 23.2 Webhook Idempotency

```typescript
// ✅ CORRECT — prevent duplicate webhook processing
const { data: existing } = await supabase
    .from('payments')
    .select('id')
    .eq('xendit_invoice_id', body.id)
    .eq('status', body.status)
    .maybeSingle()

if (existing) {
    // Already processed this exact status update — return OK but skip processing
    return NextResponse.json({ received: true })
}
```

**Rules:**
1. **Always check for duplicate webhook deliveries** — webhooks can be retried
2. **Use the external ID + status** as a deduplication key
3. **Return 200 OK** for duplicates to prevent unnecessary retries

---

## 24. Data Protection & Privacy Rules

### 24.1 PII (Personally Identifiable Information) Handling

| Data Type | Storage Rule | Display Rule |
|---|---|---|
| Bank account number | Encrypt with `encrypt()` | Mask: `****1234` |
| Account holder name | Encrypt with `encrypt()` | Full name OK for owner only |
| Email address | Store plain (Clerk manages) | Mask for non-admin views |
| Phone number | Encrypt if stored | Mask: `****5678` |
| Payment amounts | Store plain (not PII) | Display in IDR format |

**Rules:**
1. **Encrypt all financial PII** before storing in Supabase
2. **Mask sensitive data** when displaying to non-owners
3. **NEVER include PII in URLs** — use POST body instead of GET query strings for sensitive data
4. **NEVER include PII in error messages** or Sentry breadcrumbs
5. **NEVER log PII** using `console.log()` or `console.error()` — log sanitized versions only

### 24.2 Data Exposure Prevention in Errors

```typescript
// ✅ CORRECT — generic error message to client, detailed log on server
console.error("/api/withdraw POST error", err.message)  // Server log
return NextResponse.json({
    error: "Failed to create withdrawal request"  // Generic message to client
}, { status: 500 })

// ❌ WRONG — leaking internal details to the client
return NextResponse.json({
    error: err.message,           // May contain SQL errors, table names, column names
    stack: err.stack,             // NEVER expose stack traces!
    query: "SELECT * FROM...",   // NEVER expose database queries!
}, { status: 500 })
```

**Rules:**
1. **NEVER return `err.stack`** or full error objects to the client
2. **NEVER return database error details** (table names, column names, constraint violations) to the client
3. **Use generic error messages** for client responses — log detailed errors server-side only
4. **NEVER return `err.message` directly** from catch blocks — it may contain sensitive info from Supabase/Xendit

### 24.3 Secure File Upload Rules

```typescript
// ✅ CORRECT — validate file type and size BEFORE uploading
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 4 * 1024 * 1024  // 4 MB

if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
}

if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 400 })
}

// ✅ CORRECT — generate unique filenames, NEVER use user-provided filenames directly
const safeFilename = `${crypto.randomUUID()}.${extension}`

// ❌ WRONG — using user-provided filename (path traversal risk!)
const filename = body.filename  // Could be "../../etc/passwd"!
```

**Rules:**
1. **ALWAYS validate MIME type** against an allowlist — never trust `Content-Type` alone
2. **ALWAYS validate file size** before processing
3. **NEVER use user-provided filenames** — generate UUIDs or hashed names
4. **NEVER allow path traversal** characters (`..`, `/`, `\`) in filenames
5. **Use presigned R2 URLs** for large file uploads — never stream through API routes on Vercel (4.5MB limit)

---

## 25. Security Audit Checklist — MANDATORY Before Every Deploy

Every code change that touches API routes, database queries, or user input MUST pass this checklist:

### Authentication & Authorization
- [ ] Every API route calls `await auth()` and checks `userId`
- [ ] Every API route checks `orgId` for multi-tenant isolation
- [ ] Admin-only operations verify `orgRole === "org:admin"` server-side
- [ ] No user can access another organization's data (IDOR check)
- [ ] Non-admin users are scoped to their own `user_id` where applicable

### Input Validation
- [ ] All request body fields are validated (Zod schema or manual checks)
- [ ] All user-provided strings are sanitized with `sanitize()` before storage
- [ ] Financial amounts are validated as positive integers with sensible maximums
- [ ] No raw user input is concatenated into SQL, URLs, or HTML
- [ ] Enum/status fields are validated against allowlists

### Data Protection
- [ ] Sensitive data (bank numbers, PII) is encrypted before storage
- [ ] API responses don't leak encrypted fields, internal IDs, or PII
- [ ] Error responses don't expose database details, stack traces, or secrets
- [ ] No `console.log()` with sensitive data
- [ ] No secrets are exposed to the client (check for `NEXT_PUBLIC_` misuse)

### Database Security
- [ ] Every query includes `.eq('organization_id', orgId)` (except admin operations)
- [ ] No string interpolation in Supabase filter methods
- [ ] Update/delete operations verify resource ownership before modifying
- [ ] No `...body` spread operator in database inserts or updates

### Webhook Security
- [ ] Webhook handlers verify signatures before processing
- [ ] Duplicate webhook deliveries are handled idempotently

### Client-Side Security
- [ ] No `dangerouslySetInnerHTML` with unsanitized content
- [ ] No `eval()`, `new Function()`, or `document.write()`
- [ ] No secrets or PII stored in `localStorage`, `sessionStorage`, or client state
- [ ] External links use `rel="noopener noreferrer"`
- [ ] User-provided URLs are validated for safe protocols (`http:`, `https:` only)
