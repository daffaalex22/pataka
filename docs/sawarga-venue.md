# Sawarga Courtyard venue layer

This branch migrates the Sawarga Courtyard environment from the playground into
the Pataka ticketing system. The booking flow, database, API, seats, stage,
board, booth, character, camera, collision and UI stay in this project; only the
old venue shell is replaced.

## What changed

- The **70 × 50 m Sawarga shell** (paving, facades, three atria, roof/context,
  landscape, branding) replaces `CourtyardFloor`, `MallRing`, `Atriums`,
  `Sawarga` and `DowntownWalk` in `PlazaScene`.
- **Curved shell-attached balconies** (6 m deep, three stepped terraces) replace
  the straight balconies. Two stage-side switchback stairs, each with two
  flights, a mid-landing and a short bridge, are part of the environment.
- **TRIB seats keep 120 IDs** but move from `x ±15.5…19.5` to the curved band
  (`x ≈ ±25…34`, `y 5.2/5.75/6.3`). VIP/CAT1/REG are unchanged.
- **Walkability** now uses the Sawarga ellipse, curved terrace heights, the
  switchback flights/landing/bridge, the atria drums, stage, board and booth.
  Elevated movement is access-aware: leaving a stair edge clamps back to that
  stair, and a true fall drops to the courtyard instead of snapping to a
  distant balcony end.
- **Scripted walks** route up the stage-side switchback, across the bridge, and
  along the curved terrace with arc waypoints.
- **The 2D seat map** projects all seats into the shell ellipse, so the curved
  TRIB bands are visible instead of being clipped by the old fixed scale. The
  booking overview uses the same shell and curved balcony geometry, and the
  full seat sheet draws the three stepped terraces.
- **Walk-mode touch** uses `touch-action: none` on the 3D canvas container, a
  separate touch drag threshold, and a forgiving seat hit target, so one-finger
  look drags and seat taps both work on phones.
- **Night lighting** keeps the original stage/string lights, adds a small
  procedural environment map for glass/metal reflections, and adds a warm stage
  wash plus two balcony practicals.
- The event seat proxies/overlay from the playground are **not** copied. The
  real ticketing seats, stage, board and booth are used.

## Render quality

The 3D view has a persisted **Auto / Low / Medium / High** graphics menu
(`Grafik` in Indonesian). Auto adapts to the device and keeps the
`PerformanceMonitor` DPR fallback. Low/Medium/High pin the DPR cap and adjust
the night practicals and environment intensity. Asset resolution is chosen once
per mount so toggling a preset never rebuilds the venue.

- Auto: mobile → Low assets/render, desktop → Medium assets/render.
- Low: DPR 1, no balcony practicals, reduced night intensity.
- Medium: DPR 1.25 desktop / 1.15 mobile.
- High: DPR up to 2, stronger reflections and practicals.

The preference is stored under `pataka.scene-quality` in `localStorage`.

## Database migration

The `seats` table stores `x, y, z` and no rotation. `npm run db:migrate` (also
run by the production build) syncs every seat's `x/y/z` to the current layout
and updates the event venue:

```bash
npm run db:migrate
```

It reads the full layout from `src/lib/seatLayout.ts`, updates `x/y/z` by seat
ID, and refuses to run if the database seat set differs from the layout.
Existing holds, orders and statuses are untouched, and a second run reports
zero changes. The older `npm run db:migrate-trib` remains available as a
TRIB-only migration. For a local reset, `npm run db:reset` also seeds the new
positions through `src/lib/seatLayout.ts`.

## Key files

- `src/lib/sawarga/environment.ts` — environment builder (`createSawargaEnvironment`).
- `src/components/scene/SawargaEnvironment.tsx` — React Three Fiber bridge; canvas fades in when ready.
- `src/lib/sawarga/scene/venue/layout.ts` — curved TRIB source of truth.
- `src/lib/sawarga/scene/venue/balconies.ts` — decks, railings, access.
- `src/lib/seatLayout.ts` — consumes the curved TRIB generator.
- `src/components/scene/summaba/layout.ts` — shell walkability, routes, camera keep-out.
- `src/components/visitor/SeatMap2D.tsx` — dynamic shell projection.
- `src/components/scene/PlazaScene.tsx` — composition, seat rotation, night environment.
- `scripts/migrate-trib-seats.ts` — existing-database TRIB position migration.

## Verification

```bash
npm test                     # 214 tests
npm run build
npm run db:migrate-trib      # once per existing local/preview DB
npx next start -p 3010       # production check
node scripts/capture-venue.mjs      # desktop/mobile venue screenshots
node scripts/capture-venue-walk.mjs # first-person walk screenshot
node scripts/smoke-venue.mjs        # headed: pick TRIB-B10, walk, seat view
node scripts/smoke-quality.mjs      # Auto/Low/Medium/High persistence
```

Screenshots are written to `artifacts/venue-pass/`. Run the interactive smoke
test **headed**; software WebGL is too slow for the scripted walk.

## Evidence pass

- [Desktop orbit](../artifacts/venue-pass/desktop-orbit.png)
- [Desktop walk mode](../artifacts/venue-pass/desktop-walk.png)
- [Desktop 2D map](../artifacts/venue-pass/desktop-seat-map.png)
- [Desktop seat preview](../artifacts/venue-pass/desktop-seat-preview.png)
- [Walk to TRIB-B10](../artifacts/venue-pass/desktop-walk-to-trib.png)
- [Mobile orbit](../artifacts/venue-pass/mobile-orbit.png)
- [Mobile 2D map](../artifacts/venue-pass/mobile-seat-map.png)
- [Graphics menu — desktop](../artifacts/venue-pass/quality-menu.png)
- [Graphics menu — world HUD](../artifacts/venue-pass/quality-menu-world.png)
- [Graphics menu — mobile](../artifacts/venue-pass/quality-menu-mobile.png)

## Marketing assets

The home hero (`public/home/venue-night-sawarga.png`), deck screenshots, and
pitch PDFs are generated from the live app. Run `npm run deck:shots` while the
server is on `localhost:3000`, then `npm run deck:pdf` and `npm run deck:notes`.
Local deck links fall back to the public prototype URL rather than a
`localhost` address so exported PDFs stay usable.

## Main branch sync

The branch was rebased onto `main` at `eeb89af`, which includes the plaza HUD and
admin-console rebuild. The only overlap was `SeatMap2D`; the shell projection is
kept alongside main's larger touch targets. Main's `WorldHud`, `SeatBar`,
`SeatViewPanel`, `WorldView` and admin components are untouched. Rebase again
before merging if `main` moves further.

## Known follow-ups

- The atria access bridges are visual; the walkable route uses the two
  stage-side switchback stairs. Adding a walkable atria mezzanine is a later
  pass.
- The curved railing is frameless glass; a metal shoe/handrail can be added once
  the final balcony material direction is chosen.
- The playground’s Downtown Walk, koi pond and live-music area remain disabled.
- The event proxies from the playground were not imported; do not re-add them.




