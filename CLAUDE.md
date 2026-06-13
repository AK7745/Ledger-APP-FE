@AGENTS.md

# CLAUDE.md — ledger-web (frontend)

Authoritative reference for the Ledger frontend. **Keep this current with every change.**
Backend + system-wide design: `../ledger-api/CLAUDE.md` and `../ledger-api/docs/ARCHITECTURE.md`.

> ⚠️ **Next.js 16 gotchas** (newer than training data — verify against the installed package, not memory):
> - `cookies()` is **async** → `await cookies()`.
> - **Do NOT put a manual `<head>` in the root layout** — it breaks hydration (left client components, e.g. the theme toggle, inert). Put pre-paint scripts at the top of `<body>`.
> - `middleware.ts` was renamed `proxy.ts` in v16 — we use **neither** (auth gating is server-side in the layout).
> - `suppressHydrationWarning` on `<html>` (theme class) and `<body>` (browser-extension attrs like `bis_register`).

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · **Tailwind v4**. Talks only to the Next server, which proxies to `ledger-api`. Run web on **:3001** (API owns :3000): `npx next dev -p 3001`. `API_URL` (server-only env) in `.env.local`.

## Architecture
- **Auth = BFF + httpOnly cookie.** Browser → Next route handler `/api/auth/{login,register,logout}` → `ledger-api`; on success the JWT is stored in an **httpOnly** cookie (`access_token`, SameSite=lax, Secure in prod). JS can't read it; no CORS.
- **Data access, two paths:**
  - **Server Components** → `src/lib/api.ts` (`apiFetch`, `getCurrentUser`) — reads cookie directly.
  - **Client Components** → `src/lib/client.ts` (`api.get/post/put/patch/del`) → calls the **generic proxy** `src/app/api/proxy/[...path]/route.ts`, which forwards any method to `${API_URL}/<path>` with the cookie's Bearer token. So client screens do CRUD with the token never touching JS.
- **Route protection** = server-side in `(protected)/layout.tsx`: `getCurrentUser()` → `redirect('/login')` if null. No middleware.
- **Theming** = semantic CSS-var tokens in `globals.css` (see below), `.dark` class toggled on `<html>`, saved to localStorage; no-flash script in root layout `<body>`.

## Routing map (src/app/)
**Public:** `/login`, `/register` (client forms → BFF); `/` redirects to `/dashboard`.
**BFF routes:** `/api/auth/{login,register,logout}`, `/api/proxy/[...path]`.
**(protected)/** (server-gated; header has Nav + email + ThemeToggle + Sign out):
- `dashboard` — receivable/payable/net cards, overdue/draft badges, recent invoices (computed from invoices+bills)
- `parties` (list + tabs) · `parties/new` · `parties/[id]` (edit) · `parties/[id]/statement` (net statement + Print)
- `items` (list) · `items/new` · `items/[id]` (edit)
- `inventory` (list + Adjust modal) · `inventory/[id]` (movement history)
- `invoices` (list + status tabs) · `invoices/new` · `invoices/[id]` (detail: finalize/void/delete/record-payment/credit-note) · `invoices/[id]/edit` · `invoices/[id]/print` (A4)
- `bills` (mirror of invoices) · `bills/new` · `bills/[id]` (+ pay-supplier/debit-note) · `bills/[id]/edit`
- `payments` (list, direction) · `payments/new` (`?partyId=&direction=IN|OUT`) · `payments/[id]` (clear/bounce/void) · `payments/[id]/print` (receipt/voucher)
- `notes/new` (`?kind=CREDIT|DEBIT&partyId=&invoiceId=|billId=`) · `notes/[id]` (finalize/void/delete)
- `settings` — business profile form

## Components & lib
- `src/components/ui.tsx` — `Button` (primary/secondary/danger), `Input`, `Textarea`, `Select`, `Field`, `Card`, `LinkButton`, `PageHeader`, `ErrorText`. **All use theme tokens.**
- `src/components/dialog.tsx` — `Modal` shell + `DialogProvider`/`useDialog()` (`confirm`/`prompt`). **Replaces all native alert/prompt/confirm.** Mounted in `(protected)/layout.tsx`.
- `src/components/documents.tsx` — `PrintBar` (window.print), `BusinessHeaderBlock`, `Sheet` (A4 doc shell) for print pages.
- `src/lib/api.ts` — server-side fetch + `getCurrentUser`. `src/lib/client.ts` — client `api` + `ApiError`. `src/lib/auth.ts` — cookie name/options + `AuthUser`. `src/lib/format.ts` — `money`, `formatDate`, `STATUS_BADGE`. `src/lib/types.ts` — all shared types (money fields are **strings**).
- `src/app/(protected)/{nav,theme-toggle,logout-button}.tsx`.

## Theming tokens (USE THESE, never bg-white / text-gray-*)
Defined in `globals.css`, swap under `.dark` (navy): `bg-app` (page), `bg-surface` (cards/tables/header), `text-fg` (primary), `text-muted` (secondary), `border-line` / `ring-line`, `bg-hover` (hover/light chips), `bg-accent` + `text-white`/`text-accent-fg` + `hover:bg-accent-hover` (primary buttons / active nav). Colored status/type badges (green/red/amber/blue/purple-50) are intentionally literal. Print forces light (tokens reset in `@media print`; `.no-print` hides chrome).

## Conventions
- List & detail/edit pages are **client components**; get the id via `useParams()`, fetch via `api`. Pages reading query params wrap in `<Suspense>` + `useSearchParams`.
- Money values are strings from the API — wrap in `Number()`/`money()` for display; send numbers in payloads.
- New interactive UI: use `useDialog()` for confirms/prompts and the `ui.tsx` primitives so theming + dialogs stay consistent.

## Status
✅ Full UI for every backend feature, BFF proxy, navy dark theme + toggle (saved), in-app dialogs, A4 PDFs, dashboard. ⏭️ Deployment only (see backend CLAUDE.md).
