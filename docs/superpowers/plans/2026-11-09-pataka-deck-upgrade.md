# Pataka `/deck` Pitch Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing `/deck` scroll page into a 10-slide, pitch-ready hackathon deck with real product screenshots, keyboard navigation, printable notes, and a PDF backup.

**Architecture:** Keep the `/deck` route and its server-rendered content. Move slide metadata and small pure helpers into `src/lib/deck.ts`. Add a reusable `DeckSlide` shell and a client-side `DeckChrome` for keyboard navigation, progress, counter, fullscreen, and hash links. Keep the page scrollable for reading; print CSS turns it into a 16:9 PDF. Notes live in a separate print-friendly `/deck/notes` route.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, TypeScript, Vitest, Playwright (already installed), existing `globals.css` tokens.

**Spec:** `docs/superpowers/specs/2026-11-09-pataka-deck-upgrade-design.md`
**Copy:** `docs/superpowers/specs/2026-11-09-pataka-deck-copy.md`

## Global Constraints

- Keep the existing `/deck` route; no standalone deck, no `.pptx`.
- Bahasa Indonesia headlines and body; English subtitles. Use the exact copy in `2026-11-09-pataka-deck-copy.md`.
- No new npm dependencies. Playwright and Vitest are already installed.
- Reuse the app palette: `#07060d`, `#f5c542`, `#7c5cff`, `#9a96ad`, `--panel`, `--line`.
- Real screenshots only; never mockups or invented features.
- Mobile-first: the deck must read cleanly at 390px wide; stage controls are progressive enhancement.
- Canonical QR URL: `https://pataka-ruby.vercel.app`, overridable with `NEXT_PUBLIC_DECK_URL`.
- The final PDF must not contain a `localhost` QR. Generate it only after the production URL is set and the Sawarga build is deployed.
- Print: 16:9 pages (`13.333in × 7.5in`), one slide per page, dark background preserved.
- Every slide must keep its `data-deck-slide` attribute; `DeckChrome` and print CSS depend on it.
- No entry animations in this pass. If any motion is added later, gate it behind `motion-safe` and respect `prefers-reduced-motion`.
- Follow the repo’s existing style: single quotes, no semicolons, Tailwind utility classes, `@/` imports.

## Review Focus

These are the failure modes most likely to reach a person using the deck; each has a test in the owning task.

1. **Indonesian copy overflows on mobile or the projector.** Long card text must wrap without horizontal scroll at 390px and 1440px. Test: mobile viewport `scrollWidth <= clientWidth`; screenshot review.
2. **A screenshot is missing, cropped, or the wrong flow.** All four product images must load with `naturalWidth > 0` and show the real app. Test: Playwright image check; visual review.
3. **Keyboard navigation steals keys or scrolls the wrong container.** Arrow/space handling must ignore inputs, buttons, links, and contenteditable, and must move the `.deck-scroll` container. Test: `nextSlideIndex` unit tests plus a Playwright keyboard check.
4. **A slide spills onto a second PDF page or loses its background.** Print CSS must force exactly one page per slide and `print-color-adjust: exact`. Test: PDF page count and visual check.
5. **The PDF QR points at localhost or production is not the Sawarga build.** The closing slide must render `https://pataka-ruby.vercel.app`; the PDF script must fail if it sees `localhost`. Test: assert the closing link href before generating the PDF.

---

### Task 1: Slide metadata and pure helpers

**Files:**
- Create: `tests/deck.test.ts`
- Create: `src/lib/deck.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type DeckSlide = { id: string; number: string; kicker: string; title: string; subtitle: string; notes: string }`
  - `DECK_SLIDES: readonly DeckSlide[]` — 10 entries, ids `cover`, `problem`, `users`, `solution`, `product-proof`, `seat-logic`, `technical`, `assumptions`, `impact`, `close`
  - `DECK_SLIDE_COUNT: number`
  - `DEFAULT_DECK_URL: 'https://pataka-ruby.vercel.app'`
  - `resolveDeckUrl(configured: string | undefined, origin: string): string`
  - `parseDeckHash(hash: string, count: number): number | null`
  - `nextSlideIndex(current: number, delta: number, count: number): number`

- [ ] **Step 1: Write the failing tests**

Create `tests/deck.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  DECK_SLIDES,
  DECK_SLIDE_COUNT,
  nextSlideIndex,
  parseDeckHash,
  resolveDeckUrl,
} from '@/lib/deck'

describe('DECK_SLIDES', () => {
  it('has 10 slides with unique ids', () => {
    expect(DECK_SLIDE_COUNT).toBe(10)
    expect(DECK_SLIDES).toHaveLength(10)
    expect(new Set(DECK_SLIDES.map((slide) => slide.id)).size).toBe(10)
  })

  it('starts at the cover and ends at the close', () => {
    expect(DECK_SLIDES[0].id).toBe('cover')
    expect(DECK_SLIDES[9].id).toBe('close')
  })

  it('has a title, subtitle, and notes for every slide', () => {
    for (const slide of DECK_SLIDES) {
      expect(slide.title.trim().length).toBeGreaterThan(0)
      expect(slide.subtitle.trim().length).toBeGreaterThan(0)
      expect(slide.notes.trim().length).toBeGreaterThan(30)
    }
  })
})

describe('resolveDeckUrl', () => {
  it('uses a configured production URL and trims trailing slashes', () => {
    expect(resolveDeckUrl('https://pataka-ruby.vercel.app/', 'http://localhost:3000')).toBe(
      'https://pataka-ruby.vercel.app',
    )
  })

  it('falls back to the current origin when unset', () => {
    expect(resolveDeckUrl(undefined, 'http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('falls back to the current origin when blank', () => {
    expect(resolveDeckUrl('   ', 'http://localhost:3000')).toBe('http://localhost:3000')
  })
})

describe('parseDeckHash', () => {
  it('parses 1-based hashes into 0-based indexes', () => {
    expect(parseDeckHash('#/1', 10)).toBe(0)
    expect(parseDeckHash('#/10', 10)).toBe(9)
  })

  it('rejects out-of-range and malformed hashes', () => {
    expect(parseDeckHash('#/0', 10)).toBeNull()
    expect(parseDeckHash('#/11', 10)).toBeNull()
    expect(parseDeckHash('#cover', 10)).toBeNull()
    expect(parseDeckHash('', 10)).toBeNull()
  })
})

describe('nextSlideIndex', () => {
  it('moves within bounds', () => {
    expect(nextSlideIndex(0, 1, 10)).toBe(1)
    expect(nextSlideIndex(9, -1, 10)).toBe(8)
  })

  it('clamps at both ends', () => {
    expect(nextSlideIndex(0, -1, 10)).toBe(0)
    expect(nextSlideIndex(9, 1, 10)).toBe(9)
  })

  it('returns 0 for an empty deck', () => {
    expect(nextSlideIndex(0, 1, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- tests/deck.test.ts`
Expected: FAIL with a module-resolution error for `@/lib/deck`.

- [ ] **Step 3: Implement `src/lib/deck.ts`**

Create the type, the 10-entry `DECK_SLIDES` array, and the helpers. Fill every `number`, `kicker`, `title`, `subtitle`, and `notes` from `docs/superpowers/specs/2026-11-09-pataka-deck-copy.md`. The `subtitle` field holds the English line; the cover’s Indonesian one-liner is part of the cover body. The array order and ids are fixed:

```typescript
export type DeckSlide = {
  id: 'cover' | 'problem' | 'users' | 'solution' | 'product-proof' | 'seat-logic' | 'technical' | 'assumptions' | 'impact' | 'close'
  number: string
  kicker: string
  title: string
  subtitle: string
  notes: string
}

export const DECK_SLIDES: readonly DeckSlide[] = [
  // Fill from the copy file. Example shape:
  // { id: 'cover', number: '00', kicker: 'BANDUNG BUILD CHALLENGE 2026', title: 'Pataka', subtitle: 'Pick your concert seat inside the 3D venue.', notes: '...' },
]

export const DECK_SLIDE_COUNT = DECK_SLIDES.length

export const DEFAULT_DECK_URL = 'https://pataka-ruby.vercel.app'

export function resolveDeckUrl(configured: string | undefined, origin: string): string {
  const value = configured?.trim()
  return (value || origin).replace(/\/+$/, '')
}

export function parseDeckHash(hash: string, count: number): number | null {
  const match = /^#\/(\d+)$/.exec(hash)
  if (!match) return null
  const index = Number(match[1]) - 1
  return index >= 0 && index < count ? index : null
}

export function nextSlideIndex(current: number, delta: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(Math.max(current + delta, 0), count - 1)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- tests/deck.test.ts`
Expected: PASS (10 tests or more).

- [ ] **Step 5: Commit**

```bash
git add tests/deck.test.ts src/lib/deck.ts
git commit -m "feat(deck): add slide metadata and navigation helpers"
```

---

### Task 2: Slide shell, keyboard chrome, and print scaffolding

**Files:**
- Create: `src/components/deck/DeckSlide.tsx`
- Create: `src/components/deck/DeckChrome.tsx`
- Create: `src/app/deck/layout.tsx`
- Create: `src/app/deck/deck.css`
- Modify: `src/app/deck/page.tsx`

**Interfaces:**
- Consumes: `DECK_SLIDES`, `nextSlideIndex`, `parseDeckHash` from `@/lib/deck`.
- Produces:
  - `DeckSlide({ slide, children, variant = 'default', background }: { slide: DeckSlideMeta; children: React.ReactNode; variant?: 'default' | 'cover' | 'closing'; background?: React.ReactNode })`
  - `DeckChrome(): React.JSX.Element`

Use `import type { DeckSlide as DeckSlideMeta } from '@/lib/deck'` inside `DeckSlide.tsx` so the component name and the metadata type do not collide.

- [ ] **Step 1: Create `src/components/deck/DeckSlide.tsx`**

Render a `<section>` with `id={slide.id}`, `data-deck-slide={slide.id}`, and `className="deck-slide relative flex min-h-[100dvh] snap-start flex-col justify-center overflow-hidden px-5 py-14 sm:px-8"`. Render `background` inside a `pointer-events-none absolute inset-0` layer before the content. Render `{slide.number} — {slide.kicker}` in mono gold, the title at `text-3xl sm:text-5xl` (`text-5xl sm:text-7xl` for `cover`, `text-4xl sm:text-6xl` for `closing`), the subtitle in muted text, and `children` under a `relative z-10 mt-8` wrapper. Center the content in `relative z-10 mx-auto w-full max-w-5xl`.

- [ ] **Step 2: Create `src/components/deck/DeckChrome.tsx`**

A `'use client'` component:

- On mount, query `document.querySelectorAll<HTMLElement>('[data-deck-slide]')` and the `.deck-scroll` container.
- Track the active slide with `IntersectionObserver` (`root: scrollContainer`, `threshold: 0.55`). When a slide intersects, set its index.
- `goTo(index)` uses `nextSlideIndex` and calls `slide.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- Keyboard listener: `ArrowRight`, `ArrowDown`, `Space`, `PageDown` -> next; `ArrowLeft`, `ArrowUp`, `PageUp` -> previous; `Home` -> 0; `End` -> last; `f`/`F` -> toggle fullscreen. Ignore events whose target is `input`, `textarea`, `select`, `button`, `a`, or `[contenteditable="true"]`, and ignore events with `metaKey`, `ctrlKey`, or `altKey`. `preventDefault()` only when handled.
- On mount, read `parseDeckHash(window.location.hash, count)` and `goTo` that index.
- On active change, `history.replaceState(null, '', \`#/\${active + 1}\`)`.
- Fullscreen button: `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`; track `fullscreenchange`.
- Render a fixed bottom bar with `className="deck-chrome print:hidden"`: a thin progress bar, `03 / 10` counter (pad both sides), a `Fullscreen` button, and an `<a href="/deck/notes" target="_blank" rel="noreferrer">Notes</a>` link.
- Clean up the observer and keyboard listener on unmount.
- Do not render speaker notes on the slide.

- [ ] **Step 3: Create the deck layout and print CSS**

`src/app/deck/layout.tsx`:

```tsx
import './deck.css'

export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

`src/app/deck/deck.css`:

```css
@media print {
  @page deck {
    size: 13.333in 7.5in;
    margin: 0;
  }

  html,
  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .deck-scroll,
  .deck-slide {
    background: #07060d !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .deck-scroll {
    height: auto !important;
    overflow: visible !important;
  }

  .deck-slide {
    page: deck;
    height: 7.5in !important;
    min-height: 7.5in !important;
    break-after: page;
    page-break-after: always;
    overflow: hidden;
  }

  .deck-slide:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .deck-chrome {
    display: none !important;
  }
}
```

- [ ] **Step 4: Refactor `src/app/deck/page.tsx` to use the shell and chrome**

- Keep the existing 9 slides' content for now.
- Add `className="deck-scroll h-[100dvh] snap-y snap-mandatory overflow-y-auto scroll-smooth pb-16"` to `<main>`.
- Replace the local `Slide` function with `DeckSlide`, mapping the existing nine sections to `DECK_SLIDES[1]` through `DECK_SLIDES[9]` (the cover is added in Task 4). Keep the existing `Card` helper. The old “Fitur Utama” content will temporarily use the new product-proof metadata; Task 4 replaces the content.
- Wrap the return in a fragment: `<><main ...>…</main><DeckChrome /></>`.
- Keep `DemoLinks` on the last slide.

- [ ] **Step 5: Verify the shell**

Run: `npm run lint`
Expected: no errors.

Run: `npm test`
Expected: all tests pass.

With the dev server running, run a Playwright check:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:3000/deck',{waitUntil:'networkidle'});console.log('slides',await p.locator('[data-deck-slide]').count());await p.keyboard.press('ArrowRight');await p.waitForTimeout(600);console.log('hash',await p.evaluate(()=>location.hash));await b.close()})()"
```

Expected: `slides 9`, `hash #/2`.

- [ ] **Step 6: Commit**

```bash
git add src/components/deck/DeckSlide.tsx src/components/deck/DeckChrome.tsx src/app/deck/layout.tsx src/app/deck/deck.css src/app/deck/page.tsx
git commit -m "feat(deck): add slide shell, keyboard chrome, and print scaffolding"
```

---

### Task 3: Capture real product screenshots

**Files:**
- Modify: `src/components/visitor/SeatMap2D.tsx`
- Create: `scripts/capture-deck-shots.mjs`
- Modify: `package.json`
- Create: `public/deck/venue.png`, `public/deck/seat-view.png`, `public/deck/eticket.png`, `public/deck/admin.png`

**Interfaces:**
- Consumes: the running app at `DECK_BASE_URL` (default `http://localhost:3000`), `ADMIN_KEY` (default `panitia2026`).
- Produces: four PNGs under `public/deck/` with the exact names above.

- [ ] **Step 1: Make seat circles addressable**

In `src/components/visitor/SeatMap2D.tsx`, add `data-seat-id={seat.id}` to each `<circle>`. This is for reliable Playwright selection; it does not change the UI.

- [ ] **Step 2: Write `scripts/capture-deck-shots.mjs`**

Use `playwright` and `dotenv` (both already installed). The script must:

1. Load `.env.local` with `config({ path: '.env.local' })`.
2. Create `public/deck` with `fs.mkdir('public/deck', { recursive: true })`.
3. Launch Chromium once.
4. Create a desktop page at `1440×900`:
   - `venue.png`: goto `/`, click the button matching `/Masuk ke Plaza|Enter the Plaza/`, wait for `canvas`, wait 3 seconds, screenshot to `public/deck/venue.png`.
   - `seat-view.png`: goto `/book`, click the first enabled button matching `/Pilih|Choose/` (`.first()`), wait for the seat step, click the button matching `/Peta|Map/`, fetch `/api/seats`, pick the first `status === 'available'` seat, click `[data-seat-id="<id>"]`, click the button matching `/Lihat dari kursi|Preview from seat/`, wait for `canvas`, wait 3 seconds, screenshot to `public/deck/seat-view.png`.
   - `admin.png`: goto `/admin`, fill `input[type="password"]` with `process.env.ADMIN_KEY ?? 'panitia2026'`, click the button matching `/Masuk|Sign in/`, wait for the dashboard text, screenshot to `public/deck/admin.png`.
5. Create a second page at `900×900`:
   - `eticket.png`: goto `/admin`, sign in, then `page.evaluate` fetch `/api/admin/orders` with `headers: { 'x-admin-key': key }`, pick the first order with `status === 'paid'`, goto `/eticket/<code>`, wait for the QR SVG, screenshot to `public/deck/eticket.png`.
6. Close the browser and `console.log` each output path.
7. On failure, `console.error(error)` and `process.exit(1)`.

Add to `package.json` scripts:

```json
"deck:shots": "node scripts/capture-deck-shots.mjs"
```

- [ ] **Step 3: Generate the screenshots**

Run the demo seed first (before starting the dev server, so PGlite is not opened twice). Stop any running dev server first:

```bash
npm run db:demo
npm run dev
```

In another shell:

```bash
npm run deck:shots
```

Expected: four files under `public/deck/`, each non-zero. Open them and confirm they show the real venue, seat view, e-ticket QR, and admin dashboard. If headless Chromium cannot render the 3D scene, run that capture with `headless: false` or take the seat-view screenshot manually from the same flow; do not replace it with a mockup.

- [ ] **Step 4: Verify the images**

Run:

```bash
node -e "const fs=require('fs'); for (const f of ['venue','seat-view','eticket','admin']) { const p='public/deck/'+f+'.png'; console.log(f, fs.statSync(p).size) }"
```

Expected: all sizes are greater than 20 KB.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture-deck-shots.mjs package.json src/components/visitor/SeatMap2D.tsx public/deck/*.png
git commit -m "feat(deck): capture real product screenshots"
```

---

### Task 4: Rewrite the deck to 10 slides with the product proof

**Files:**
- Modify: `src/app/deck/page.tsx`
- Create: `src/components/deck/ProductProof.tsx`
- Modify: `src/app/deck/deck.css` only if the print layout needs a slide-specific tweak

**Interfaces:**
- Consumes: `DECK_SLIDES`, `DeckSlide`, `ProductProof`, the four PNGs from Task 3, `DemoLinks`.
- Produces: a `/deck` page with 10 `[data-deck-slide]` sections.

- [ ] **Step 1: Create `src/components/deck/ProductProof.tsx`**

A server component that accepts:

```typescript
type ProductProofItem = {
  src: string
  alt: string
  label: string
  caption: string
}

export function ProductProof({ items }: { items: ProductProofItem[] })
```

Render a `grid gap-4 sm:grid-cols-2`. Each item is a `figure` with a `relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-black/40` frame, a `next/image` with `fill`, `sizes="(min-width: 640px) 40vw, 90vw"`, and `className="object-contain"`, plus a caption with the label in semibold and the caption in muted text. Use the real images and exact captions from the copy file.

- [ ] **Step 2: Add the cover**

At the top of `<main>`, render `DeckSlide` with `slide={DECK_SLIDES[0]}`, `variant="cover"`, and a `background` containing:

- `next/image` `src="/deck/venue.png"` `alt=""` `fill` `priority` `className="object-cover opacity-30"`
- an absolutely positioned gradient overlay from `#07060d` to transparent

Inside the cover children, render the Indonesian one-liner `Pilih kursi konser dari dalam venue 3D.` in a large muted line, the meta line `Dare · Demo Day, 15 November 2026 · Summarecon Mall Bandung`, and the small line `Prototype finalis Bandung Innovation Week 2026`.

- [ ] **Step 3: Replace the features slide with the product proof**

Use `DeckSlide` with `slide={DECK_SLIDES[4]}`. Render `<ProductProof items={[...]}/>` with the four images:

```typescript
[
  { src: '/deck/venue.png', alt: 'Pataka 3D venue at Sawarga Courtyard', label: 'Venue 3D + karakter', caption: 'Plaza malam Sawarga Courtyard; joystick di ponsel, WASD di desktop.' },
  { src: '/deck/seat-view.png', alt: 'Seat preview facing the stage', label: 'Pratinjau dari kursi', caption: 'Kamera ke ketinggian mata, menghadap panggung — tahu persis yang akan dilihat.' },
  { src: '/deck/eticket.png', alt: 'E-ticket with a signed QR code', label: 'E-ticket + check-in', caption: 'QR bertanda tangan HMAC; VALID / SUDAH DIGUNAKAN / TIDAK VALID dalam sekali pindai.' },
  { src: '/deck/admin.png', alt: 'Pataka organizer dashboard', label: 'Panel panitia', caption: 'Penjualan, kursi, pesanan, check-in, ekspor CSV peserta dan transaksi.' },
]
```

Add the chip `Dua bahasa: Indonesia / English` below the grid.

- [ ] **Step 4: Keep the remaining slides aligned with the copy**

Use `DeckSlide` with `DECK_SLIDES[1]`, `[2]`, `[3]`, `[5]`, `[6]`, `[7]`, `[8]`, `[9]`. Reuse the existing card/table/code patterns. Replace the old “Fitur Utama” and “Manfaat” copy with the copy file’s copy. On the last slide, render `DemoLinks` and the live-demo cue plus the fallback line.

- [ ] **Step 5: Verify the 10-slide deck**

Run: `npm run lint` and `npm test` — both pass.

With the dev server running:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto('http://localhost:3000/deck',{waitUntil:'networkidle'});console.log('slides',await p.locator('[data-deck-slide]').count());console.log('imgs',await p.locator('img').evaluateAll(xs=>xs.map(x=>({src:x.currentSrc,w:x.naturalWidth}))));console.log('overflow',await p.evaluate(()=>{const m=document.querySelector('.deck-scroll');return m?m.scrollWidth>m.clientWidth:document.documentElement.scrollWidth>document.documentElement.clientWidth}));await b.close()})()"
```

Expected: `slides 10`, every image has `w > 0`, `overflow false`.

Repeat at `390×844` and confirm no horizontal overflow. Press `ArrowRight` and confirm the hash moves from `#/1` to `#/2`.

- [ ] **Step 6: Commit**

```bash
git add src/app/deck/page.tsx src/components/deck/ProductProof.tsx src/app/deck/deck.css public/deck/*.png
git commit -m "feat(deck): expand to ten pitch slides with product proof"
```

---

### Task 5: Printable notes route

**Files:**
- Create: `src/app/deck/notes/page.tsx`
- Create: `src/app/deck/notes/notes.css`

The Notes link in `DeckChrome` already points to `/deck/notes`; no change is needed there.

**Interfaces:**
- Consumes: `DECK_SLIDES`.
- Produces: `/deck/notes` with 10 note blocks and a printable page.

- [ ] **Step 1: Create the notes page**

Render a light, print-first sheet (`bg-white text-zinc-900`):

- Header: `Pataka — Catatan Pitching`
- Subheader: `Bandung Build Challenge 2026 · Demo Day, 15 November 2026`
- A timing guide with three lines: `3 menit: lewati slide Pengguna`, `4 menit: 10 slide`, `5 menit: tambah waktu di Bukti Produk dan Logika Kursi`.
- For each `DECK_SLIDES` entry, render a block with `className="notes-block"`, `{slide.number} — {slide.kicker}`, the title, and the `slide.notes` paragraph.
- End the sheet with the fallback line: `Jika demo gagal: gunakan screenshot di slide 04.`
- Wrap the whole sheet in `className="notes-page"`.

- [ ] **Step 2: Add `notes.css`**

```css
@media print {
  @page notes {
    size: A4;
    margin: 16mm;
  }

  html,
  body {
    background: #ffffff !important;
    color: #111111 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .notes-page {
    page: notes;
  }

  .notes-block {
    break-after: page;
    page-break-after: always;
  }

  .notes-block:last-child {
    break-after: auto;
    page-break-after: auto;
  }
}
```

Import `./notes.css` in the notes page.

- [ ] **Step 3: Verify the notes page**

Run: `npm run lint`.

Open `http://localhost:3000/deck/notes` and confirm 10 blocks. Use Playwright to print:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://localhost:3000/deck/notes',{waitUntil:'networkidle'});await p.pdf({path:'public/deck/pataka-notes.pdf',format:'A4',printBackground:true});await b.close()})()"
```

Expected: `public/deck/pataka-notes.pdf` exists and contains 10 note blocks.

- [ ] **Step 4: Commit**

```bash
git add src/app/deck/notes/page.tsx src/app/deck/notes/notes.css public/deck/pataka-notes.pdf
git commit -m "feat(deck): add printable speaker notes"
```

---

### Task 6: Production QR URL and deck PDF

**Files:**
- Modify: `src/components/deck/DemoLinks.tsx`
- Create: `scripts/render-deck-pdf.mjs`
- Modify: `package.json`
- Create: `public/deck/pataka-pitch.pdf`

**Interfaces:**
- Consumes: `resolveDeckUrl` from `@/lib/deck`; `NEXT_PUBLIC_DECK_URL`; `DECK_BASE_URL`.
- Produces: `DemoLinks` with a production-safe QR and a visible URL; `public/deck/pataka-pitch.pdf`.

- [ ] **Step 1: Update `DemoLinks`**

Replace the origin-only state with:

```tsx
const [url, setUrl] = useState('')

useEffect(() => {
  setUrl(resolveDeckUrl(process.env.NEXT_PUBLIC_DECK_URL, window.location.origin))
}, [])
```

Use `url` for the `QRCodeSVG` value and render a visible link:

```tsx
<a href={url} target="_blank" rel="noreferrer" className="text-[11px] text-muted underline-offset-4 hover:underline">
  {url.replace(/^https?:\/\//, '')}
</a>
```

Keep the `Buka Prototype` button pointing at `/` and the admin button at `/admin`.

- [ ] **Step 2: Write `scripts/render-deck-pdf.mjs`**

The script must:

1. Read `DECK_BASE_URL` (default `http://localhost:3000`).
2. Launch Chromium, open `/deck`, wait for `networkidle`.
3. Wait for the closing production link: `await page.locator('a[href^="https://"]').last().waitFor()`, then read its href with `getAttribute('href')`.
4. If the href includes `localhost`, throw an error: `PDF would contain a localhost QR`.
5. `page.pdf({ path: 'public/deck/pataka-pitch.pdf', width: '13.333in', height: '7.5in', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })`.
6. Log the path and the URL used.

Add to `package.json` scripts:

```json
"deck:pdf": "node scripts/render-deck-pdf.mjs"
```

- [ ] **Step 3: Generate and verify the PDF**

Start the dev server with the production URL inlined:

```powershell
$env:NEXT_PUBLIC_DECK_URL='https://pataka-ruby.vercel.app'; npm run dev
```

In another shell:

```bash
npm run deck:pdf
```

Expected: `public/deck/pataka-pitch.pdf` exists, has 10 pages, each page is 16:9 with the dark background, and the closing QR/url is `pataka-ruby.vercel.app`.

- [ ] **Step 4: Verify the QR href and page count**

Open the PDF and confirm 10 pages. Use `pdftotext` to confirm the closing URL appears:

```bash
pdftotext public/deck/pataka-pitch.pdf - | findstr /C:"pataka-ruby.vercel.app"
```

Expected: the production URL is present. Confirm the string `localhost` is absent.

- [ ] **Step 5: Commit**

```bash
git add src/components/deck/DemoLinks.tsx scripts/render-deck-pdf.mjs package.json public/deck/pataka-pitch.pdf
git commit -m "feat(deck): generate production QR and PDF backup"
```

---

### Task 7: Final verification and README

**Files:**
- Modify: `README.md`
- Possibly adjust `src/app/deck/page.tsx` only for overflow fixes found during verification

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a verified deck and updated docs.

- [ ] **Step 1: Update the README**

Add to the demo access section:

```markdown
- Pitch deck: `/deck` — arrow/space navigation, `F` fullscreen, print to 16:9 PDF
- Speaker notes: `/deck/notes`
- PDF backup: `/deck/pataka-pitch.pdf` · notes PDF: `/deck/pataka-notes.pdf`
```

- [ ] **Step 2: Run the full checks**

```bash
npm test
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 3: Run the final browser checks**

Desktop `1440×900` and mobile `390×844`:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{for (const vp of [{width:1440,height:900},{width:390,height:844}]) { const b=await chromium.launch();const p=await b.newPage({viewport:vp});await p.goto('http://localhost:3000/deck',{waitUntil:'networkidle'});const n=await p.locator('[data-deck-slide]').count();const overflow=await p.evaluate(()=>{const m=document.querySelector('.deck-scroll');return m?m.scrollWidth>m.clientWidth:document.documentElement.scrollWidth>document.documentElement.clientWidth});console.log(vp.width,n,overflow);await b.close() }})()"
```

Expected: `1440 10 false`, `390 10 false`.

Keyboard check: open `/deck`, press `ArrowRight` three times, then `Home`, then `End`; confirm the hash ends at `#/10` and the counter shows `10 / 10`. Press `F` and confirm the browser enters fullscreen (manual).

- [ ] **Step 4: Review the PDF and notes**

Open `public/deck/pataka-pitch.pdf`: 10 pages, no clipped captions, dark background intact, QR points to `pataka-ruby.vercel.app`.
Open `public/deck/pataka-notes.pdf`: all 10 notes, readable, no cut-off text.
Open `https://pataka-ruby.vercel.app` and confirm it serves the Sawarga Courtyard build (the venue string says `Sawarga Courtyard`). If it still serves the old Central Plaza build, deploy before relying on the QR.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(deck): document pitch deck, notes, and PDF backups"
```
