# Summarecon Mall Bandung venue redesign — Pataka design doc (2026-11-08)

## Intent & why
Pataka is a 3D ticketing prototype for Bandung Build Challenge 2026 (finalist exhibition 12–14 Nov at Summarecon Mall Bandung, Demo Day 15 Nov). Its 3D world is currently a generic night plaza with a painted backdrop. Goal: rebuild it as a recognizable approximation of Summarecon Mall Bandung (Summaba), staging the demo concert in the real event space — Sawarga Courtyard — mirroring how the mall actually hosts events (Gedebage Jazz Festival 2026: main stage in Sawarga Courtyard, other stages in Atrium Ciunik and Downtown Walk). Purpose: stand out to judges with an instantly recognizable real venue, demoed inside the real one.

## Goals
1. The world reads as Summaba at a glance: two-storey mall ring wrapping the central outdoor courtyard; Sawarga Courtyard as a 3,600 m²-class green tropical garden (lawns, trees, fountain); three glass-roofed atrium halls with lit signage (Atrium Ciunik north, Atrium Cibadak east at Lobby Ageung, Atrium Cileutik west at Lobby Alus); Lobby Caang/Alus/Ageung marked; The Downtown Walk alfresco strip with Sagalawarna koi pond and live-music corner on the south edge; anchor massing cues (Star Department Store / Cinema XXI / Timezone).
2. Concert staged in the courtyard: stage at the north end facing south; VIP/CAT 1/Regular seats on the garden floor; Tribune seats on second-floor balcony terraces overlooking the courtyard (accurate to Summaba's upper-floor overlooking galleries).
3. Walkable multi-level world: stairs from the courtyard to the balcony promenades; walls/railings keep the character inside the venue.
4. Drag-to-look in walk mode: horizontal drag rotates the third-person camera around the character; recenters while walking; taps still select seats; works with mouse and touch alongside the joystick.
5. Seed venue string becomes "Sawarga Courtyard, Summarecon Mall Bandung" (event name unchanged); flows to splash, LED board, e-ticket, ICS.
6. Booking flow, holds, QR check-in, 446 seats / 4 categories / quotas / prices, and seat IDs unchanged.
7. Mobile-first performance: procedural geometry only, instancing, no shadow maps, adaptive DPR, fog culling, < 150 draw calls, ≤ 12 lights.

## Non-goals
Photo-exact recreation; enterable mall interiors (atrium porches glow, no shops inside); multi-venue selection; daytime scene; real tenant signage beyond anchor landmarks.

## Anti-goals
External 3D assets stalling mobile first paint; regressing booking/e-ticket/perf; changing seat counts/quotas/prices/IDs.

## Approaches considered
1. Procedural R3F primitives + canvas textures (CHOSEN — consistent with the codebase, instant load, full control; stylized, not photoreal).
2. AI-generated GLB models (rejected — asset pipeline, mobile load risk, less control).
3. Backdrop re-skin only (rejected — no courtyard-in-the-round, fails the goal).

## Decisions
Single event in Sawarga (option A over multi-venue option B); night mood; Tribune = L2 balconies; stage north facing south; layout: Ciunik N, Cibadak E, Cileutik W, Caang SE, Downtown Walk + koi pond S; drag-look yaw-only with recenter-while-moving; stairs+railing collision via a pure layout module; build "done now" with cut order: playground/waterjet details → anchor signage → koi pond detail → greenery density (never cut: courtyard structure, atrium signage, booking flow, drag-look).

## Left to the builder
World scale mapping, exact seat coordinates, facade/atrium/pond/greenery visual detail, orbit framing, walkable-region geometry, copy updates — all pinned in the implementation plan `2026-11-08-summarecon-venue.md`.

## Sources
Summarecon Agung press release & project page (Sawarga Courtyard 3,600 m² tropical garden at the mall's heart; Bandung-Pisan names), summareconmallbandung.com facility page (Downtown Walk south via Jl. Sentra Raya Selatan; koi pond in Downtown Walk; Customer Care at Atrium Cileutik/Lobby Alus and Atrium Cibadak/Lobby Ageung; valet at Lobby Caang), Anggara Architeam project page (courtyard at the heart, event venue), id.wikipedia (2 storeys, 46,000 m², Star Department Store replacing Rambla Dec 2025, Happy Harvest GF, XXI/Timezone L1), Gedebage Jazz Festival International 2026 coverage (main stage Sawarga Courtyard, stages in Atrium Ciunik and Downtown Walk).
