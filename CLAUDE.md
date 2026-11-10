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
- **Permissions (RBAC)** — design: `../ledger-api/docs/RBAC.md` §10, progress: `../ledger-api/docs/RBAC-PROGRESS.md`. **The API enforces every permission; the UI only decides what to show.**
  - `src/lib/permissions.ts` — the 33 permission keys (**must equal the API catalog**; adding one there means adding it here), `Rule` (`'key' | {all:[…]} | {any:[…]}`), `can()`, `allows()`. Pure — usable on server and client.
  - `/auth/me` returns `roles[]`, `isOwner`, `permissions[]` (`AuthUser` in `src/lib/auth.ts`). `getCurrentUser()` is wrapped in React **`cache`**, so the protected layout and every nested gate share **one** `/auth/me` per request (never cache it longer — access changes must show on the next request).
  - **Server gate:** `<RequireAccess rule=…>` (`src/lib/access.tsx`) in a segment's `layout.tsx` renders `<NoAccess>` (names the missing permission) instead of the page. Layouts don't re-render while navigating *within* them, so every segment with a different rule needs its own layout (`invoices/` view, `invoices/new/` manage, …).
  - **Client checks:** `AccessProvider` (mounted in the protected layout with the server-fetched access — no extra request, no flicker) → `useCan()` (`can('invoices.void')`, `can.rule({any:[…]})`) or `<Can rule=…>`.
  - **403s:** `ApiError` carries `permission`/`anyOf`, and its message reads "You don't have permission to do this (needs invoices.void)." Admin guardrail 403s pass their own message through.
  - ⚠️ We do **not** use Next's `forbidden()` / `forbidden.tsx`: it is experimental and needs `experimental.authInterrupts` in Next 16.2.
- **Theming** = semantic CSS-var tokens in `globals.css` (see below), `.dark` class toggled on `<html>`, saved to localStorage; no-flash script in root layout `<body>`.

## Routing map (src/app/)
**Public:** `/login`, `/register` (client forms → BFF); `/` redirects to `/dashboard`.
**BFF routes:** `/api/auth/{login,register,logout}`, `/api/proxy/[...path]`.
**(protected)/** (server-gated; header has Nav + email + ThemeToggle + Sign out):
- `dashboard` — receivable/payable/net cards, overdue/draft badges, recent invoices (computed from invoices+bills)
- `parties` (list + tabs) · `parties/new` · `parties/[id]` (edit) · `parties/[id]/statement` (net statement) · `parties/[id]/statement/print` (A4, branded)
- `items` (list) · `items/new` · `items/[id]` (edit)
- `inventory` (list + Adjust modal) · `inventory/[id]` (movement history)
- `quotations` (list + status tabs + search/filters) · `quotations/new` · `quotations/[id]` (detail: issue/accept/decline/convert/void/delete) · `quotations/[id]/edit` · `quotations/[id]/print` (A4, branded)
- `invoices` (list + status tabs + search/filters) · `invoices/new` · `invoices/[id]` (detail: finalize/void/delete/record-payment/credit-note) · `invoices/[id]/edit` · `invoices/[id]/print` (A4, branded)
- `bills` (mirror of invoices) · `bills/new` · `bills/[id]` (+ pay-supplier/debit-note) · `bills/[id]/edit` · `bills/[id]/print` (A4, branded)
- `payments` (list, direction) · `payments/new` (`?partyId=&direction=IN|OUT`) · `payments/[id]` (clear/bounce/void) · `payments/[id]/print` (receipt/voucher)
- `notes/new` (`?kind=CREDIT|DEBIT&partyId=&invoiceId=|billId=`) · `notes/[id]` (finalize/void/delete)
- `settings` — business profile form

## Components & lib
- `src/components/ui.tsx` — `Button` (primary/secondary/danger), `Input`, `Textarea`, `Select`, `Field`, `Card`, `LinkButton`, `PageHeader`, `ErrorText`. **All use theme tokens.**
- `src/components/dialog.tsx` — `Modal` shell + `DialogProvider`/`useDialog()` (`confirm`/`prompt`). **Replaces all native alert/prompt/confirm.** Mounted in `(protected)/layout.tsx`.
- `src/components/documents.tsx` — `PrintBar` (window.print), `BusinessHeaderBlock`, `Sheet` (A4 doc shell) for print pages.
- `src/components/brand.tsx` — `NewDiamondLogo` / `NewDiamondMark`: inline-SVG rebuilds of the New Diamond brand kit (sharp at print DPI, no image asset to load). `src/lib/brand.ts` — `BRAND` palette + tagline, `paymentTerms`, `longDate`, `amountInWords` (South-Asian crore/lakh grouping for PKR).
- `src/lib/use-document-title.ts` — `useDocumentTitle`. Chrome names "Save as PDF" files after `document.title`, so every printed doc sets its own; without it everything saved as `Ledger.pdf`.
- `src/lib/api.ts` — server-side fetch + `getCurrentUser`. `src/lib/client.ts` — client `api` + `ApiError`. `src/lib/auth.ts` — cookie name/options + `AuthUser`. `src/lib/format.ts` — `money`, `formatDate`, `STATUS_BADGE`. `src/lib/types.ts` — all shared types (money fields are **strings**).
- `src/app/(protected)/{nav,theme-toggle,logout-button}.tsx`.

## Theming tokens (USE THESE, never bg-white / text-gray-*)
> ⚠️ **Native `<select>` popups need explicit `background-color` AND `color` on both `select` and `option`** (set in `globals.css`). The option list is painted by the browser and does not reliably follow `color-scheme` (notably Linux/GTK): because the select carries `text-fg`, options inherited the dark theme's near-white text onto a white popup and every unselected option was invisible.

Defined in `globals.css`, swap under `.dark` (navy): `bg-app` (page), `bg-surface` (cards/tables/header), `text-fg` (primary), `text-muted` (secondary), `border-line` / `ring-line`, `bg-hover` (hover/light chips), `bg-accent` + `text-white`/`text-accent-fg` + `hover:bg-accent-hover` (primary buttons / active nav). Colored status/type badges (green/red/amber/blue/purple-50) are intentionally literal. Print forces light (tokens reset in `@media print`; `.no-print` hides chrome).
> ⚠️ The print block must reset **`color-scheme: light`** and paint **`html`** white, not just `body`. `.dark` sets `color-scheme: dark`, which makes the browser paint the page *canvas* dark; with a transparent `<html>` that canvas printed as **black bands around every page** whenever the user ticked "Background graphics". Resetting the colour tokens alone does not fix it.

## Printed documents
All five print routes share `src/components/brand-doc.tsx` (`BrandDoc`, `DocTitle`, `PartyBlock`, `DetailsGrid`, `HeadSpacer`, `TotalRow`, `GrandTotalBar`, `BrandFooter`, `Filler`, plus the `TH`/`TD`/`TD_DENSE`/`ROW`/`PAGE_TOP_GAP`/`MIN_ROWS` constants). Change page geometry **there**, not per document.

| Route | Document | Tag |
|---|---|---|
| `quotations/[id]/print` | QUOTATION (pre-ledger; Valid until, TOTAL not TOTAL DUE, `ACCEPTED BY` signature, pending-rate section) | ORIGINAL FOR RECIPIENT |
| `invoices/[id]/print` | INVOICE | ORIGINAL FOR RECIPIENT |
| `bills/[id]/print` | PURCHASE BILL (payable; supplier ref, TOTAL PAYABLE, check/approve signatures) | OFFICE COPY |
| `payments/[id]/print` | RECEIPT (IN) / PAYMENT VOUCHER (OUT) | direction-dependent |
| `parties/[id]/statement/print` | STATEMENT OF ACCOUNT | ORIGINAL FOR RECIPIENT |

### Company stamp (opt-in per print)
`PrintBar` becomes a **split button** whenever the page passes `onStampChange`: the main half prints as-is, the `▾` half opens a menu with *Print with stamp* / *Print without stamp*. The page holds `const [stamp, setStamp] = useState(false)` and forwards it to `BrandFooter stamp={stamp}`, which stamps the **right-hand** signature line — the `FOR NEW DIAMOND CORPORATION` one.
- Wired on **quotation, invoice, receipt/voucher and statement**. Deliberately **not** on the purchase bill: it is an OFFICE COPY whose right-hand line is `APPROVED FOR PAYMENT`, an internal approval that must not carry the company stamp.
- **`flushSync` is required** before `window.print()`. The print dialog snapshots the DOM synchronously, so a plain `setState` would still be pending and the stamp would appear only on the *next* print.
- The stamp is **`position: absolute`**, so a stamped document paginates identically to an unstamped one. Anything that added flow height here would cost line capacity on page 1. Tune `STAMP_SIZE`/`STAMP_RIGHT`/`STAMP_BOTTOM` in `brand-doc.tsx`.
- It is an **`<img>`, never a CSS `background-image`** — Chrome omits background images when the print dialog's "Background graphics" is unticked, but always prints inline images.
- `public/ndc-stamp.png` is derived from the brand kit's `carton-stamp.png`, which is **fully opaque** (white paper, alpha 255 everywhere). The shipped copy re-inks it to `BRAND.navy` with alpha taken from ink darkness and crops to the mark, so it overlays the signature rule instead of painting a white square over it. Regenerate the same way if the source art changes.

⚠️ **JSX decodes HTML entities in attribute *string literals* but not inside JS expressions.** `left="A &amp; B"` renders `&`; `left={cond ? 'A &amp; B' : ...}` renders the literal `&amp;`. Use a plain `&`.

`/invoices/[id]/print` renders the **New Diamond branded invoice** (built from `New Diamond Invoice.dc.html`): full-bleed navy rule, vector logo, navy table header with zebra rows padded to `MIN_ROWS = 8`, navy TOTAL DUE bar, amount-in-words, dual signature block.
- It uses **fixed brand hex values via inline styles, NOT theme tokens** — a printed document must never follow the app's light/dark theme.
- Archivo (brand typeface) is loaded in the root layout as `--font-archivo`.
- Brand chrome (mark, tagline, "FOR NEW DIAMOND CORPORATION") is fixed; **address / phone / tax no. / bank details / footer come from `BusinessProfile`** — keep `/settings` accurate or the letterhead is wrong.
- `.brand-doc` opts into the named `@page brand-doc { margin: 0 }` in `globals.css` so the navy rule reaches the paper edge; other print pages keep the default 14mm margin.
- **Totals arithmetic (easy to get wrong):** `subtotal` is already net of line discounts (`lineTotal = qty*price - discount`) and `grandTotal = subtotal - invoiceDiscount`. The totals column therefore shows **`invoiceDiscount`**, never `discountTotal` — the latter is line + invoice discounts combined (a reporting figure) and double-counts here.
- Template fields with no model backing (`Size`, `Material`, `Unit`, `PO / Ref.`, `Freight`) are deliberately omitted; `Terms` is derived from `issueDate -> dueDate`.
- **Never rely on `@page` margins for layout.** Chrome's print dialog has a *Margins* dropdown that **overrides CSS `@page` margins entirely** — a user on "None" silently loses them. Clearance above the repeated table header therefore comes from a **transparent spacer row inside `<thead>`** (Chrome repeats the whole thead on every page), which survives any dialog setting. `@page brand-doc { margin: 0 0 12mm }` is belt-and-braces only.
- **`PAGE_TOP_GAP` (30px) is shared by every block that can *begin* a continuation page** — the `<thead>` spacer row, the notes/totals grid, and the signature block. Give them different values and pages start at different heights (the totals grid at 18px made page 3 start 5mm from the top against page 2's 10mm).
- **Running header:** a `position: fixed` element repeats on *every* printed page in Chrome — page 1 included, so it cannot simply be "pages 2+". `.doc-running-header` prints the faded invoice number top-right, and the letterhead is given an opaque background + `z-index: 1` to paint over it on page 1. The text still exists in page 1's text layer (invisible, harmless); CSS alone cannot drop it.
- **`DENSE_ABOVE` must stay low enough that the last roomy row count still fits one page.** At `> 10`, a 10-line invoice took two pages while an 11-line one took one — capacity was not monotonic in line count. Re-check this boundary by rendering whenever the vertical rhythm changes.
- **Signing space:** `SignatureLine` renders a fixed 42px blank area *above* its rule, and the footer block carries `marginTop` — otherwise on multi-page invoices the signature rules butt straight up against the totals with nowhere to actually sign.
- **Pagination:** rows / totals+notes grid / signature block all carry `break-inside: avoid` so nothing is sliced. Row padding tightens past 10 lines (`TD_DENSE`), and the flex spacer above the signatures has **no min-height** — a floor there only applies when space is scarce, which is exactly when it must not add any (it pushed a 15-line invoice 7.8px onto a second page).
- **Capacity (measured by rendering, this content):** page 1 fits **13 line items** end-to-end, monotonically (1-13 -> one page, 14+ -> two); the table alone fits ~26 rows on page 1 and ~40 on a continuation page. The binding constraint is the ~77mm footer block (notes+totals grid 46mm + signatures 31mm) that must sit below the table. Longer invoices legitimately orphan that block onto a final page — no page tail that far down is ever 77mm, so this is arithmetic, not a CSS bug. Do **not** try to fix it by letting the notes/totals grid fragment: a CSS grid row will not split that way, and splitting prose mid-sentence across pages is worse.
- Vertical rhythm is tight (letterhead `34px` top pad, table container `2px` + 26px thead spacer, totals `18px`, dense rows `4.5px`). Adding vertical space anywhere costs line capacity — measure with a real render, not arithmetic; a height model disagreed with Chrome by two rows.
- Chrome's own header/footer (date, page title, source URL) is a print-dialog setting, not CSS — it must be unticked manually or the localhost URL and invoice id print on the document.

### Quotation sheet — the pending-rate section
The quotation adds a **second table** below the totals for lines quoted without a rate, then the usual signature block. It carries **no Rate/Discount/Amount columns** — blank money columns read as zeros, the opposite of what the block means — and a disclaimer that the items are not in the total. The totals column repeats that in brass: *"Excludes N items pending rate — see below."*
- It takes the shared **`PAGE_TOP_GAP`** like every other block that can *begin* a continuation page, and `breakInside: avoid` on its rows.
- **`cellStyle` is keyed off the COMBINED line count** (`q.lines.length`), not the priced count. Keyed off priced alone, 9 priced + 12 pending would render at roomy padding and overflow.
- **`MIN_ROWS` padding is suppressed whenever a pending block exists.** Padding exists so a lone short table does not float in white space; with a second table below it is just blank rows between real data, and it costs capacity on a sheet already carrying an extra table. Leaving it in cost a whole page: 3 priced + 3 pending printed on **two** pages.
- **An all-pending quotation prints no `GrandTotalBar` and no amount-in-words** — a navy `TOTAL PKR 0.00` bar on a "rates to follow" quote reads as a quote for nothing. Its section label drops the "— NOT INCLUDED IN THE TOTAL" suffix too, since there is no total to be excluded from.

**Capacity (measured by rendering this content in headless Chrome, not by arithmetic):**
| Sheet | Page-1 capacity |
|---|---|
| priced lines only | **14** — monotonic (1-14 one page, 15+ two) |
| with a 3-row pending block | **4 priced** (1-4 one page, 5+ two), monotonic |
| all-pending, no priced table | 8+ comfortably |

The pending block costs about **seven rows of chrome** (its gap + brass label + header + disclaimer) on top of one row per pending line — so it is arithmetic, not a CSS bug. Re-measure by rendering whenever the vertical rhythm changes; a height model disagreed with Chrome by two rows last time.

## List search & filters
Seven list pages (`quotations`, `invoices`, `bills`, `payments`, `parties`, `items`, `inventory`) share the same machinery:
- `src/lib/use-list-query.ts` — **filter state lives in the URL**, not component state, so back/forward works, a filtered view is shareable, and a refresh does not reset it. Uses `router.replace` so typing does not push a history entry per keystroke.
- `src/lib/use-fetch-list.ts` — re-fetches when the path changes. Guards against **out-of-order responses** (a debounced search fires often; a slow earlier request must not overwrite a newer one) via a request-id check, and never calls setState synchronously in the effect body. Exposes `loading` (first load), `refreshing` (subsequent), and `reload()` for after a mutation.
- `src/components/filters.tsx` — `FilterBar` renders a compact toolbar: a `SearchInput` (300ms debounce) plus a single **Filters** button opening an anchored popover that holds every other filter. Building blocks: `PanelField`, `FilterSelect` (`full` variant fills a panel row), `ToggleChip`, `DateRange`, `AmountRange`, `Pagination`.
  - `children` is a **render prop** `(draft, setDraft) => ...`. Panel choices are **draft state, committed to the URL only on Apply**, so a half-built combination never triggers a fetch and Cancel/Escape/click-outside discards it. Apply sends *every* key in `fields` so cleared ones are actively removed.
  - The draft is seeded in the open handler (an event), not an effect — avoiding a cascading render.
  - The panel is `right-0` anchored: the search box is `flex-1`, so the button sits at the toolbar's right and a left-anchored panel overflows the viewport.
  - Search stays outside the panel (it's the primary action), as do the status/type **tabs** — status is therefore *not* duplicated inside the panel.

- **Pagination** — pages pass a module-level `PAGE_DEFAULTS` (`page: '1', pageSize: '25'`) to `useListQuery`; those keys are merged into the API query but excluded from "Clear (n)", since paging is machinery, not a filter. `useFetchList` detects the paged envelope vs a plain array and exposes `meta`. **Changing any filter drops `page`** (handled in `useListQuery.set`) — otherwise you sit on page 7 of a result set that just shrank to two pages. `pageSize` survives, being a preference.

⚠️ `defaults` passed to `useListQuery` must be a **stable reference** (module-level const), or the query recomputes every render.
⚠️ Each page's `KEYS` list **must match the API's DTO** — the backend rejects unknown query params with a 400 rather than ignoring them.
⚠️ `ui.tsx`'s `inputCls` hardcodes `w-full` and `mt-1`. Tailwind resolves conflicting utilities by **stylesheet order, not class order**, so passing `className="w-auto"` does not work — size a wrapper `<div>` instead (that is why the filter controls are wrapped).
⚠️ These pages use `useSearchParams`, so each exports a thin default component wrapping the real one in `<Suspense>`.

## Quotations
A quotation is a **pre-ledger** document — it owes nothing, moves no stock and never reaches a statement (see the backend CLAUDE.md). The UI mirrors invoices with three differences worth knowing:
- **Rate-pending lines.** A line can be ticked *"Rate not entered yet"*, which sends `ratePending: true` + `rateNote` and **omits `unitPrice`/`discount` entirely**. The API stores price/total as NULL and keeps the line out of every total. The editor, the detail page and the printed sheet all split the lines into **priced** and **pending rate**, because showing an unpriced line in the money table with blank columns reads as zeros. Both places state "Excludes N item(s) pending rate" under the total.
- **Catalog price hint.** Picking an item fills the rate from `defaultSalePrice` (as invoices do) and then keeps showing `List <price>` under the input, marked `· changed` when you quote off-list. Informational only — the server still snapshots whatever you send.
- **Lapsing is derived, never stored.** Nothing sweeps a quote into `EXPIRED`, so `isLapsed()` in `format.ts` computes it from `validUntil` the same way the API's `?expired` filter does. The badge always shows the real stored status with a muted "lapsed" hint beside it.
- **CSV import** (`quotation-editor.tsx` + `src/lib/csv.ts` + `public/quotation-template.csv`). Upload → spinner over the lines area → rows appear in the normal line boxes for review → the ordinary *Create draft* button saves them. There is no separate preview screen: review happens where you would fix things anyway.
  - `src/lib/csv.ts` is a hand-rolled RFC-4180 reader (BOM, CRLF, quoted commas, doubled quotes, blank rows; column order free, unknown columns ignored). It only **splits** text — every coercion, item match and rate decision is server-side, so the import obeys the same "server decides" rule as every other write. It also means **no multipart upload**, which matters: the generic `/api/proxy` forwards `req.text()` and is not safe for binary bodies.
  - Rows the server marks `error` are **listed, not inserted** — a line with no usable qty or rate must not be smuggled into the table to be hunted down later. Rows with a `message` (e.g. an item name that matched nothing) are inserted with an amber note under the description.
  - Importing replaces *blank* lines (the one the editor starts with) and appends after anything already typed.
  - ⚠️ The sample CSV must import cleanly on a first run with an **empty catalog** — an early draft opened with a blank-rate row that depended on a catalog match, so the sample itself errored. Column rules live in the panel's help list, not in the file's cells, because cells become data.
- `convert` navigates to the new **draft** invoice, so the count of dropped unpriced lines is stated in the confirm dialog *before* converting rather than reported afterwards.

## Conventions
- List & detail/edit pages are **client components**; get the id via `useParams()`, fetch via `api`. Pages reading query params wrap in `<Suspense>` + `useSearchParams`.
- Money values are strings from the API — wrap in `Number()`/`money()` for display; send numbers in payloads.
- New interactive UI: use `useDialog()` for confirms/prompts and the `ui.tsx` primitives so theming + dialogs stay consistent.

## Testing RBAC in the browser
Run against the **disposable** test stack only: API on :3200 (`ledger_rbac_test`), web via `next build && API_URL=http://localhost:3200 npx next start -p 3201`. Browser scripts use `playwright-core` (installed outside the project, driving `/usr/bin/google-chrome`) — see the progress tracker for the exact checks per chunk.

## Status
✅ Full UI for every backend feature, BFF proxy, navy dark theme + toggle (saved), in-app dialogs, A4 PDFs, dashboard. ⏭️ Deployment only (see backend CLAUDE.md).
