# Pataka — 3D Event Ticketing

Prototype for **Bandung Build Challenge 2026 · Bandung Innovation Week 2026**.

A mobile-first ticketing experience for a night open-air concert at Summarecon Mall Bandung:
explore the venue as a walking character, pick a seat on the 3D plaza, preview the stage view
from that seat, pay (simulated) and receive a signed QR e-ticket. Panitia get a dashboard for
ticket settings, sales, seat inventory, CSV exports and camera QR check-in.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS 4
- React Three Fiber + drei (Three.js) — instanced seats, walk mode, seat-view camera
- Postgres — Neon in production, PGlite (in-process Postgres) for local dev and tests
- Thin SQL adapter (`src/lib/db.ts`), no ORM
- HMAC-signed QR payloads, `html5-qrcode` camera scanning on the check-in page
- Vitest (19 tests) for the business-critical services

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

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | local dev server |
| `npm run build` | production build |
| `npm test` | Vitest suite |
| `npm run db:migrate` | apply schema |
| `npm run db:seed` | seed event + categories + 446 seats |
| `npm run db:reset` | drop, recreate and reseed |
| `npm run db:demo` | add demo orders/holds/check-in |

## Demo access

- Visitor: `/`
- Organizer panel: `/admin` — demo key `panitia2026`
- Submission deck: `/deck`

## Prototype assumptions (also on the deck)

- Closing Night Concert, Central Plaza (open-air), Summarecon Mall Bandung, 14 Nov 2026, 19:00 WIB.
- 446 numbered seats: VIP Front 48, CAT 1 128, Tribune 120, Regular 150; Rp 350k–1.5M.
- One seat per order; 10-minute server-side hold before payment.
- Payments, email/WhatsApp notifications and reminders are simulated; calendar `.ics` works.
- Sample fictional data only — no real transactions or personal data.
- Seat layout is fixed per event; organizers manage price, quota and sales period.

## Key flows to try

1. Open `/book`, pick a category, orbit or walk the 3D plaza, tap a seat, hit
   **Preview from seat**, then hold it, fill sample details and pay.
2. The e-ticket shows a signed QR. Open `/admin` → **Check-in** and scan it
   (or paste the payload) — the first scan is VALID, the second is ALREADY USED.
3. Double-booking: open two browsers, hold the same seat in both — exactly one wins.
