import { DECK_SLIDES } from '@/lib/deck'
import './notes.css'

export default function DeckNotesPage() {
  return (
    <main className="notes-page min-h-screen bg-white px-6 py-10 text-zinc-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
            Pataka · Bandung Build Challenge 2026
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pataka — Catatan Pitching</h1>
          <p className="mt-1 text-sm text-zinc-600">Demo Day, 15 November 2026 · Summarecon Mall Bandung</p>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900">Panduan waktu</p>
          <ul className="mt-2 space-y-1">
            <li><strong>3 menit:</strong> lewati slide Pengguna; ringkas Problem dan Asumsi.</li>
            <li><strong>4 menit:</strong> 10 slide, sekitar 20–25 detik per slide.</li>
            <li><strong>5 menit:</strong> tambah waktu di Bukti Produk dan Logika Kursi.</li>
          </ul>
        </section>

        <div className="mt-8 space-y-8">
          {DECK_SLIDES.map((slide) => (
            <section key={slide.id} className="notes-block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                {slide.number} — {slide.kicker}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{slide.title}</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-700">{slide.notes}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 border-t border-zinc-200 pt-4 text-sm font-medium text-zinc-900">
          Jika demo gagal: gunakan screenshot di slide 04.
        </p>
      </div>
    </main>
  )
}
