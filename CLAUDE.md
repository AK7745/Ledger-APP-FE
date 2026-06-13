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

## Key files
- `src/lib/auth.ts` — cookie name + options + `AuthUser` type.
- `src/lib/api.ts` — `apiFetch()` (server-side, cookie→Bearer) + `getCurrentUser()`.
- `src/app/api/auth/*` — BFF route handlers (login/register set cookie, logout clears it).
- `src/app/login`, `src/app/register` — client form pages → post to the BFF.
- `src/app/(protected)/layout.tsx` — server-side auth gate + app shell (header, logout).
- `src/app/(protected)/dashboard/page.tsx` — placeholder home for signed-in users.
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
- ✅ Auth UI: login, register, logout, server-gated dashboard. Verified end-to-end against the live API.
- ⏭️ Next: Parties + Invoices UI once those backend modules exist.
