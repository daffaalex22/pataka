# Pataka `/deck` pitch upgrade — design doc (2026-11-09)

## Intent & why

Pataka is a finalist in **Bandung Build Challenge 2026 · Bandung Innovation Week 2026**. The app already has a `/deck` route: a nine-slide vertical scroll deck in Bahasa Indonesia with English subtitles. It covers every section the official brief asks for (problem, users, solution flow, key features, seat-selection logic, technical approach, assumptions, benefits).

The gap is presentation, not completeness. The page reads like a submission document, not a 3–5 minute stage deck: it opens without a cover, has no product visuals, no presenter controls, and no closing moment. Demo Day is **15 November 2026**; the finalist exhibition is **12–14 November 2026**.

Goal: upgrade `/deck` in place into a **pitch-ready deck** that still works as a scrollable submission page. No separate artifact, no route change.

## Goals

1. **Add a cover and a closing.** Open with Pataka, the one-liner, the event/date, and the team. Close with the single line the jury should remember, the prototype link/QR, and a live-demo cue.
2. **Show the product.** Add real screenshots of the 3D venue, seat-view POV, e-ticket QR, and organizer dashboard/check-in. The current deck is all text cards; a 3D ticketing product must be seen.
3. **Tighten the story.** Keep the brief’s required sections, but make one claim per slide, larger headlines, and shorter card copy. Keep Bahasa Indonesia headlines with English subtitles.
4. **Make it presentable on stage.** Arrow/space/PageUp/PageDown navigation, active-slide tracking, slide counter, progress bar, fullscreen, and hash deep links (`#/5`). Scrolling remains available for reading and mobile.
5. **Add printable speaker notes.** A print-friendly notes sheet with informal cues per slide, for a phone or printed copy. No presenter window or on-screen notes drawer.
6. **Make a PDF backup.** Print styles that produce one slide per page with the dark theme intact, plus a generated `public/deck/pataka-pitch.pdf` and a printable `public/deck/pataka-notes.pdf`.

## Non-goals

- A standalone HTML deck outside the Next.js app.
- A `.pptx` file or PowerPoint export.
- Changing booking, payment, QR, check-in, or admin behavior.
- New real transactions, personal data, or production integrations.
- New dependencies. Use what the repo already has (Next.js 16, React 19, Tailwind 4, existing tokens).

## Anti-goals

- Burying the anti-double-booking proof below decorative slides.
- Replacing real screenshots with mockups or invented features.
- Text walls that cannot be read from the back of the room.
- Regressing the mobile reading experience or the existing `/deck` content accuracy.
- Adding motion that distracts from the pitch or ignores `prefers-reduced-motion`.

## Approaches considered

1. **Content-only polish** — tighten copy, add a cover/closing, keep the current cards. Fast and low-risk, but the product still cannot be seen. Rejected as the primary approach.
2. **Visual-first upgrade** — real screenshots and full-bleed product moments, keep the current scroll and copy. High impact, but still awkward to drive on stage. Rejected as sufficient.
3. **Presenter-first upgrade** — keyboard navigation, progress, fullscreen, speaker notes, print/PDF. Solves the stage mechanics, but leaves the deck text-heavy. Rejected as sufficient.
4. **All three (CHOSEN)** — content, visuals, and presenter mechanics in the same `/deck` route. The work is larger, but it is the only option that makes the existing deck genuinely pitch-ready.

## Decisions

### Slide sequence (10 slides, ~4 minutes)

| # | Slide | Claim / job | Visual |
|---|---|---|---|
| 0 | Cover | “Pataka — pilih kursi konser dari dalam venue 3D.” Credit: **Dare** · Bandung Build Challenge 2026 · Demo Day, 15 Nov 2026. | Night-concert gradient, product wordmark |
| 1 | Problem | “Memilih kursi konser masih menebak-nebak.” Three failures: double-booked seats, static maps, manual check-in. | Three compact cards |
| 2 | Users | “Dua pengguna, satu kebenaran data.” Visitor needs certainty; organizer needs control. | Two-column split |
| 3 | Solution flow | “Dari memilih kursi sampai masuk venue.” Six steps, one line each. | Horizontal/vertical flow |
| 4 | Product proof | “Ini yang dilihat pengunjung — dan yang dipakai panitia.” | 2×2 screenshot grid: venue, seat POV, e-ticket, admin |
| 5 | Seat logic | “Anti double-booking, bukan sekadar janji.” Available → held (10 min) → sold; atomic `UPDATE … WHERE status='available'`; loser gets 409. | Status diagram + small code proof |
| 6 | Technical | “Cepat di ponsel, kuat di belakang.” Next.js 16 + R3F, Postgres/Neon, HMAC QR, mobile performance budget. | Four cards + stack chips |
| 7 | Assumptions | “Asumsi yang jelas, penilaian yang adil.” The brief-required assumptions table. | Compact two-column table |
| 8 | Impact | “Yang berubah bagi pengunjung dan panitia.” Four outcomes + next steps. | Four cards + roadmap line |
| 9 | Close / demo | “Satu kursi, satu pemilik. Coba sendiri.” Prototype QR, live-demo cue, fallback screenshot. | Large QR + one-line close |

### Timing

The default build targets **4 minutes / 10 slides** (about 20–25 seconds per slide). The notes sheet also carries a trim guide:

- **3 minutes:** drop the Users slide (fold one line into Problem); spend 30 seconds on Product proof and Seat logic; keep Assumptions to one sentence.
- **4 minutes:** all 10 slides as tabled above.
- **5 minutes:** add 20–30 seconds to Product proof (walk through the four screenshots) and Seat logic (narrate the two-browser race), plus 15 seconds for the live-demo cue.

### Required-feature mapping

The brief asks for “fitur utama.” The 10-slide sequence covers all six current features without a separate feature slide:

| Current feature | Where it lives |
|---|---|
| Venue 3D + karakter | Product proof, venue screenshot caption |
| Pratinjau dari kursi | Product proof, seat-view screenshot caption |
| Status kursi langsung | Seat logic slide |
| E-ticket + check-in | Product proof, e-ticket screenshot caption; Close/demo |
| Panel panitia | Product proof, admin screenshot caption |
| Dua bahasa | Small chip on the Technical slide or cover |


### Visual system

- Reuse the app’s night-concert palette: `#07060d` background, gold `#f5c542`, violet `#7c5cff`, muted `#9a96ad`, panel `rgba(255,255,255,.04)`.
- Geist Sans / Geist Mono, already loaded in `layout.tsx`.
- One idea per slide; headline at `text-4xl`–`text-6xl` on desktop, body at `text-sm`–`text-base`.
- Full-bleed images where possible; `object-fit: cover` with a scrim for text. Screenshots use `object-fit: contain` inside a framed panel so UI is never cropped.
- Subtle slide-entry motion only; respect `prefers-reduced-motion`.

### Screenshots

Capture from the running app with Playwright, store under `public/deck/`:

- `venue.png` — 3D plaza / Sawarga Courtyard at night (desktop, 1440×900).
- `seat-view.png` — seat-view camera facing the stage (desktop or mobile).
- `eticket.png` — e-ticket with signed QR (900×900 so the QR and seat details stay readable in the 2×2 grid).
- `admin.png` — organizer dashboard and/or check-in result (desktop).

If a flow needs seeded data, run `npm run db:demo` first. Screenshots must come from the real app; no mockups.

### Interaction

- The existing `<main>` remains the scroll container with snap points.
- Track the active slide with `IntersectionObserver`.
- Keyboard: `ArrowRight`/`ArrowDown`/`Space`/`PageDown` next; `ArrowLeft`/`ArrowUp`/`PageUp` previous; `Home`/`End` first/last; `F` fullscreen.
- Progress bar + `03 / 10` counter fixed at the bottom or top.
- Hash sync: `#/N` opens slide N; navigation updates the hash without jumping the page.
- Scroll still works on touch and for submission reading.
- A visible “Print notes” link opens the notes print view; no on-screen notes drawer.

### Speaker notes

- Each slide gets 50–75 words of spoken cues for the 4-minute default, written as a print-friendly notes sheet.
- Notes never appear on the projected slide or in the deck PDF.
- Informal Bahasa Indonesia, bold key phrases, transition sentences on their own line.
- The notes sheet includes the 3/4/5-minute trim guide and the live-demo fallback line.

### Demo URL and QR

- Canonical production URL: `https://pataka-ruby.vercel.app`.
- Read the URL from `NEXT_PUBLIC_DECK_URL` with `window.location.origin` as the fallback, so local previews still work.
- The production build must be updated to the Sawarga Courtyard branch before the exhibition and before generating the final PDF. The QR must not encode `localhost`.

### Print / PDF

- `@media print`: hide navigation chrome, force each slide to `break-after: page`, preserve the dark background via `print-color-adjust: exact`.
- Page size: 16:9 (13.333in × 7.5in), one slide per page.
- Generate and store `public/deck/pataka-pitch.pdf` for Demo Day, plus `public/deck/pataka-notes.pdf` from the notes print view.

## Constraints

- Next.js 16 App Router, React 19, Tailwind CSS 4, existing `globals.css` tokens.
- Keep the `/deck` route and all factual claims consistent with the app and README.
- No new npm dependencies.
- Mobile-first: the deck must remain readable on a phone; stage controls are progressive enhancement.
- Use real screenshots and real data only; sample/fictional data is already labelled in the deck.

## Left to the builder

- Exact screenshot selection and capture steps.
- Final copy trimming and English subtitle wording.
- Layout composition per slide (which existing card/table/flow patterns to reuse).
- Notes-sheet styling and print page size.
- Generating the PDFs and verifying the QR resolves to production.
- Implementation plan and verification (desktop, mobile, keyboard, print).
