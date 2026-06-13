@AGENTS.md

# CLAUDE.md — ledger-web

Frontend for **Ledger**. Keep current as the UI grows.

> ⚠️ **Next.js 16** (see AGENTS.md above) — newer than training data. `cookies()` is **async** (`await cookies()`). Middleware was renamed: `proxy.ts` replaces `middleware.ts` in v16 — but we deliberately use **neither** (see auth below). Verify APIs against the installed package, not memory.

## Stack
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript** + **Tailwind v4**.
- Talks to `ledger-api` (NestJS) — base URL in `API_URL` (server-side only env, in `.env.local`).

## Auth — BFF (backend-for-frontend) with httpOnly cookie
The JWT is **never exposed to browser JS**. Flow:
1. Browser posts credentials to a Next **Route Handler** (`/api/auth/{login,register,logout}`).
2. The handler calls `ledger-api`, and on success sets the JWT in an **httpOnly, SameSite=lax** cookie (`access_token`), `Secure` in production. Returns only the safe user object.
3. Server Components call the API via `apiFetch()` (`src/lib/api.ts`), which reads the cookie and attaches `Authorization: Bearer`.
4. **Route protection is server-side, no middleware:** the `(protected)/layout.tsx` calls `getCurrentUser()`; if it's null it `redirect('/login')`. Immune to the middleware→proxy rename.

Benefits: token unstealable by XSS; browser never hits the API directly, so **no CORS**.

## Data access (two paths)
- **Server Components** → `apiFetch()` / `getCurrentUser()` in `src/lib/api.ts` (reads cookie directly). Used by the auth gate.
- **Client Components** → `api` in `src/lib/client.ts` (`api.get/post/patch/del`) which calls the **generic proxy** `src/app/api/proxy/[...path]/route.ts`. The proxy forwards any method to `${API_URL}/<path>` with the cookie's Bearer token attached. So client screens do CRUD without the token ever touching JS, and there's no CORS.

## Key files
- `src/lib/auth.ts` — cookie name + options + `AuthUser` type.
- `src/lib/api.ts` — server-side `apiFetch()` + `getCurrentUser()`.
- `src/lib/client.ts` — client-side `api` helper (→ `/api/proxy/*`). `ApiError` carries status + flattened validation message.
- `src/lib/types.ts` — `Party`, `Item`, enums (money fields are strings — Prisma Decimal).
- `src/components/ui.tsx` — shared `Button/Input/Select/Field/Card/PageHeader/LinkButton`.
- `src/app/api/auth/*` — BFF auth route handlers; `src/app/api/proxy/[...path]` — generic authed proxy.
- `src/app/(protected)/layout.tsx` — server-side auth gate + shell + `nav.tsx`.
- `src/app/(protected)/parties` + `items` — list / `new` / `[id]` edit pages + shared `*-form.tsx`. List/edit pages are client components (`useParams` for the id). Archive = soft delete.
- `src/app/(protected)/invoices/page.tsx` — placeholder (editor is next).
- `src/app/page.tsx` — redirects to `/dashboard`.

## Local development
```bash
cp .env.example .env.local       # API_URL=http://localhost:3000
npm install
npm run dev                       # default :3000 — but the API also uses :3000,
                                  # so run the web on another port:
npx next dev -p 3001              # http://localhost:3001
```
The `ledger-api` backend must be running (`docker compose up -d db` + `npm run start:dev` in that repo).

## Status / next
- ✅ Auth UI: login, register, logout, server-gated dashboard.
- ✅ Generic authed proxy + client `api` helper + shared UI kit + nav.
- ✅ Parties management (list, type tabs, new/edit, archive). Items management (list, new/edit, archive).
- ✅ **Invoices UI** — list (status tabs), invoice **editor** (`invoice-editor.tsx`: customer picker, dynamic line rows with item prefill, live totals; shared by `new` + `[id]/edit`), detail view (`[id]`) with finalize / void / delete / record-payment.
- ✅ **Payments UI** — `payment-form.tsx` (customer, amount, method, reference, date, cleared/pending; per-invoice allocation auto oldest-first + editable, remaining tracker), payments list, payment detail `[id]` (clear/bounce/void). `new/page.tsx` reads `?partyId` via `useSearchParams` (wrapped in `<Suspense>`).
- ✅ **Statement view** — `/parties/[id]/statement`: summary cards (invoiced/paid/pending/outstanding) + timeline with running balance. Entry points: Statement link on parties list, Record-payment on invoice detail + statement.
- Full money loop verified end-to-end through the proxy (invoice → payment → PARTIAL/balance → statement).
- ✅ **Bills / payables UI** — `/bills` list (status tabs), `bill-editor.tsx` (supplier picker, supplierRef, billDiscount; shared by `new` + `[id]/edit`), bill detail `[id]` (finalize/void/delete + "Pay supplier"). Payment form is **direction-aware** (prop `direction`; OUT → suppliers + bills, allocations use `billId`). `/payments/new?direction=OUT`. Payments list shows direction; payment detail/print say "Payment voucher" for OUT and link bills.
- ✅ **Statement is net** — net balance banner (+ they owe you / − you owe them), receivable + payable cards, debit/credit/running-balance timeline (handles INVOICE/BILL/PAYMENT_IN/PAYMENT_OUT). Verified end-to-end.
- ✅ **Business Profile** settings page (`/settings`) — GET/PUT `business-profile`; feeds documents.
- ✅ **PDF / print** — native browser print-to-PDF (no headless browser). Print pages `/invoices/[id]/print` + `/payments/[id]/print` render A4 documents; statement page has a Print button. `src/components/documents.tsx` = `PrintBar` (window.print), `BusinessHeaderBlock`, `Sheet`. Print CSS in `globals.css` (`@page A4`, `.no-print`); app header + action bars carry `no-print`/`print:hidden`. Print pages are client components (data via api.get, populates in browser before user prints).
- ⏭️ Next: credit notes UI, inventory, dashboard totals. Before deploy: lock down public `/auth/register`.
