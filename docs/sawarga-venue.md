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
- **Scripted walks** route up the stage-side switchback, across the bridge, and
  along the curved terrace with arc waypoints.
- **The 2D seat map** projects all seats into the shell ellipse, so the curved
  TRIB bands are visible instead of being clipped by the old fixed scale.
- **Night lighting** keeps the original stage/string lights, adds a small
  procedural environment map for glass/metal reflections, and adds a warm stage
  wash plus two balcony practicals.
- The event seat proxies/overlay from the playground are **not** copied. The
  real ticketing seats, stage, board and booth are used.

## Database migration

The `seats` table stores `x, y, z` and no rotation. The migration is idempotent
and only updates the 120 TRIB rows:

```bash
npm run db:migrate-trib
```

It reads the curved layout from `src/lib/sawarga/scene/venue/layout.ts`, updates
`x/y/z` by seat ID, and refuses to run if a TRIB ID is missing. Existing holds,
orders and statuses are untouched. For a local reset, `npm run db:reset` also
seeds the new positions through `src/lib/seatLayout.ts`.

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
npm test                     # 152 tests
npm run build
npm run db:migrate-trib      # once per existing local/preview DB
npx next start -p 3010       # production check
node scripts/capture-venue.mjs      # desktop/mobile venue screenshots
node scripts/capture-venue-walk.mjs # first-person walk screenshot
node scripts/smoke-venue.mjs        # headed: pick TRIB-B10, walk, seat view
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

## Known follow-ups

- The atria access bridges are visual; the walkable route uses the two
  stage-side switchback stairs. Adding a walkable atria mezzanine is a later
  pass.
- The curved railing is frameless glass; a metal shoe/handrail can be added once
  the final balcony material direction is chosen.
- The playground’s Downtown Walk, koi pond and live-music area remain disabled.
- The event proxies from the playground were not imported; do not re-add them.

