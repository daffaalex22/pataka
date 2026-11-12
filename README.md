# Pataka — 3D Event Ticketing

Prototype for **Bandung Build Challenge 2026 · Bandung Innovation Week 2026**.

A mobile-first ticketing experience for a night open-air concert at Summarecon Mall Bandung:
explore the venue as a walking character, pick a seat on the 3D plaza, preview the stage view
from that seat, pay (simulated) and receive a signed QR e-ticket. Panitia get a dashboard for
ticket settings, sales, seat inventory, CSV exports and camera QR check-in. A Mall operations
tab adds the venue operator's portfolio view: events across Sawarga, the atriums and Downtown
Walk, with occupancy, revenue, check-ins, lifecycle and settlement.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS 4
- React Three Fiber + drei (Three.js) — instanced seats, walk mode, seat-view camera
- Postgres — Neon in production, PGlite (in-process Postgres) for local dev and tests
- Thin SQL adapter (`src/lib/db.ts`), no ORM
- HMAC-signed QR payloads, `html5-qrcode` camera scanning on the check-in page
- Vitest (161 tests) for the business-critical services, curved venue walkability, walk path, ticket store, portfolio builder and email delivery

## Local development

```bash
npm install
# .env.local
# DATABASE_URL=pglite://.local-db
# ADMIN_KEY=panitia2026
# CHECKIN_SECRET=pataka-demo-secret-2026
npm run db:reset      # schema + 446 seats
npm run db:demo       # sample orders, a live hold, one check-in
npm run dev           # http://localhost:3000
```

`DATABASE_URL` can also point at a real Postgres (`postgresql://…`), e.g. Neon.

The 3D venue now uses the 70 × 50 m Sawarga shell with curved shell-attached
tribune balconies. See [`docs/sawarga-venue.md`](docs/sawarga-venue.md) for the
migration notes, walkability contract and verification commands.

## Main branch sync

The venue branch is rebased onto `main` at `eeb89af` (the admin-console and
plaza-HUD rebuild). The only overlapping file was `SeatMap2D`: the shell
projection keeps main's larger touch targets. Main's new `WorldHud`, `SeatBar`,
`SeatViewPanel`, `WorldView` and admin components are retained unchanged, and
the headed walk-to-seat smoke test still passes. Rebase again before merging if
`main` moves further.

Optional ticket email: set `RESEND_API_KEY` and `EMAIL_FROM` to send e-ticket links through a Resend-compatible API after payment (and via the “Email ticket” button). Without them the app reports “email not configured” and the ticket link is still saved in the browser (`/tickets`).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | local dev server |
| `npm run build` | production build |
| `npm test` | Vitest suite |
| `npm run db:migrate` | apply schema |
| `npm run db:migrate:deploy` | production-only migration gate (runs automatically from `npm run build` on Vercel) |
| `npm run db:seed` | seed event + categories + 446 seats |
| `npm run db:reset` | drop, recreate and reseed |
| `npm run db:demo` | add demo orders/holds/check-in |
| `npm run db:migrate-trib` | move the 120 TRIB rows onto the curved balconies (idempotent) |
| `node scripts/capture-venue.mjs` | desktop/mobile venue screenshots |
| `node scripts/smoke-venue.mjs` | headed: pick a TRIB seat, walk to it, verify the seat view |
| `node scripts/smoke-quality.mjs` | verify graphics presets persist |
| `npm run deck:shots` | regenerate home/deck marketing images from the current 3D app |
| `npm run deck:pdf` | regenerate the pitch PDF |
| `npm run deck:notes` | regenerate the speaker-notes PDF |

## Deployment

Production builds apply the schema before `next build`: Vercel sets
`VERCEL_ENV=production`, so `scripts/migrate-deploy.mjs` runs
`npm run db:migrate` against `DATABASE_URL_UNPOOLED` (preferred) or
`DATABASE_URL`. Preview builds skip migrations; point a preview at a Neon
branch if it needs a live database. The migration statements are additive and
idempotent, so repeated production builds are safe.

- `GET /api/health` returns `200` only when the database is reachable and the
  discount schema exists; otherwise it returns `503`.
- To migrate production manually:
  `VERCEL_ENV=production npm run db:migrate:deploy`
  (PowerShell: `$env:VERCEL_ENV='production'; npm run db:migrate:deploy`).
- CI (`.github/workflows/ci.yml`) applies the schema to a fresh PGlite
  database, then runs the tests and a production build.

## Demo access

- Visitor: `/`
- Organizer + mall operations: `/admin` — demo key `panitia2026` (open the **Operasi Mall** tab)
- Submission deck: `/deck`
- Pitch deck: `/deck` — arrow/space navigation, `F` fullscreen, print to 16:9 PDF
- Speaker notes: `/deck/notes`
- Pilot one-pager: `/pilot`
- PDF backup: `/deck/pataka-pitch.pdf` · notes PDF: `/deck/pataka-notes.pdf`

## Demo discounts

- The admin **Diskon** tab creates automatic phases and promo codes.
- Demo promo codes: `PATKA10` (10% off), `HEMAT50` (Rp 50.000 off, min Rp 500.000), `VIP100` (Rp 100.000 off, VIP only).
- Demo phases: Early Bird 20% (until 13 Nov 2026) and Final Call 10% (14–15 Nov 2026).
- `npm run db:demo` seeds them idempotently; promo usage is counted at payment.

## Prototype assumptions (also on the deck)

- Closing Night Concert, Sawarga Courtyard (open-air), Summarecon Mall Bandung, 14 Nov 2026, 19:00 WIB.
- 446 numbered seats: VIP Front 48, CAT 1 128, Tribune 120, Regular 150; Rp 350k–1.5M.
- One seat per order; 10-minute server-side hold before payment.
- Payments and WhatsApp reminders are simulated; calendar `.ics` works. E-ticket email uses a Resend-compatible API when configured, otherwise it reports “not configured”.
- Sample fictional data only — no real transactions or personal data.
- Mall operations: the live concert row is real database data; other portfolio rows are labelled sample data. Portfolio KPI totals include those sample rows; settlement is live-event only and illustrative.
- Seat layout is fixed per event; organizers manage price, quota and sales period.

## Key flows to try

1. Open `/` (splash → 3D plaza), visit the ticket booth for the in-world tier
   and seat picker, or tap a seat directly, hit **Walk to seat** to see the
   stage from your seat, then hold it, fill sample details and pay. No WebGL?
   Direct booking (`/book`) still works, and purchased tickets stay recoverable
   at `/tickets` on the same device.
2. The e-ticket shows a signed QR. Open `/admin` → **Check-in** and scan it
   (or paste the payload) — the first scan is VALID, the second is ALREADY USED.
3. Double-booking: open two browsers, hold the same seat in both — exactly one wins.




