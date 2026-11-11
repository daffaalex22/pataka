import Link from 'next/link'
import './pilot.css'

const SCOPE = [
  ['446 kursi bernomor', 'Empat kategori: VIP Depan, CAT 1, Tribun, dan Reguler.'],
  ['E-ticket QR', 'QR bertanda tangan; valid, sudah digunakan, atau tidak valid.'],
  ['Check-in kamera', 'Pindai di gerbang; status kehadiran langsung tercatat.'],
  ['Dasbor + CSV', 'Penjualan, kursi, pesanan, kehadiran, dan ekspor.'],
]

const TIMELINE = [
  ['Minggu 1', 'Setup', 'Ruang, denah, kategori, kuota, harga, dan periode jual.'],
  ['Minggu 2', 'Penjualan', 'Monitoring penjualan, hold 10 menit, dan support panitia.'],
  ['Hari-H', 'Check-in', 'Gerbang, pemindaian QR, dan dasbor kehadiran langsung.'],
  ['Minggu 3', 'Laporan', 'Penjualan, kehadiran, rekonsiliasi, dan review pilot.'],
]

const METRICS = [
  ['Sell-through', 'Persentase kursi terjual dari kapasitas pilot.'],
  ['Check-in time', 'Rata-rata detik per tiket di gerbang.'],
  ['Double-booking', 'Target 0; diuji dengan dua browser berebut kursi yang sama.'],
  ['Rekonsiliasi', 'Target 100% pesanan lunas cocok dengan kursi dan check-in.'],
]

export default function PilotPage() {
  return (
    <main className="pilot-page min-h-screen bg-white px-6 py-10 text-zinc-900 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between print:hidden">
          <Link href="/deck" className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900">
            ← Deck
          </Link>
          <p className="text-xs text-zinc-400">Bandung Build Challenge 2026</p>
        </div>

        <header className="mt-6 border-b border-zinc-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
            PATAKA × SUMMARECON MALL BANDUNG
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Pilot ticketing untuk acara mall.
          </h1>
          <p className="mt-1 text-sm text-zinc-500">A ticketing pilot for mall events.</p>
          <p className="mt-4 max-w-2xl text-lg font-medium text-zinc-800">
            Satu acara. Satu ruang. Tiga minggu. Empat angka.
          </p>
          <p className="text-sm text-zinc-500">One event. One space. Three weeks. Four numbers.</p>
        </header>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Yang kami usulkan</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-700">
            Jalankan satu acara di Sawarga Courtyard dari penjualan sampai check-in dan laporan, di atas sistem yang
            sama dengan demo. Tujuannya bukan menambah tools baru, tapi membuktikan satu proses ticketing yang bisa
            diulang untuk kalender acara mall.
          </p>
        </section>

        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Ruang lingkup</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SCOPE.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Timeline</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {TIMELINE.map(([week, title, body]) => (
              <div key={week} className="rounded-xl border border-zinc-200 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">{week}</p>
                <p className="mt-1 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Empat angka</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-4">
            {METRICS.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-zinc-200 p-3">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Model komersial</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              <strong>Pilot:</strong> setup fee ilustratif; angka final setelah scope disepakati.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              <strong>Setelah pilot:</strong> platform fee per acara + per-ticket fee atau revenue share. Model dan
              angka dipilih bersama.
            </p>
            <p className="mt-2 text-xs text-zinc-500">Angka pada halaman ini ilustratif, bukan penawaran final.</p>
          </div>
          <div className="grid gap-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                Yang kami butuhkan dari mall
              </h2>
              <ul className="mt-1 space-y-1 text-sm leading-relaxed text-zinc-700">
                <li>Detail acara dan target penjualan.</li>
                <li>Akses ruang dan jadwal setup.</li>
                <li>Petugas gerbang untuk check-in.</li>
                <li>Payment gateway atau simulasi.</li>
                <li>Persetujuan scope pilot.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                Yang Pataka sediakan
              </h2>
              <ul className="mt-1 space-y-1 text-sm leading-relaxed text-zinc-700">
                <li>Setup acara, denah, kategori, dan kuota.</li>
                <li>Halaman penjualan dan QR e-ticket.</li>
                <li>Check-in, dasbor, dan laporan CSV.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-zinc-900 bg-zinc-900 p-4 text-white">
          <p className="text-sm font-semibold">Langkah berikutnya: 30 menit working session.</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            Kita sepakati satu acara, satu ruang, dan empat angka yang ingin dibuktikan. Setelah itu Pataka menyiapkan
            setup dan membuka penjualan.
          </p>
          <p className="mt-2 text-xs text-zinc-400">Tim Pataka · pataka-ruby.vercel.app</p>
        </section>

        <footer className="mt-6 border-t border-zinc-200 pt-3 text-xs text-zinc-500">
          Pataka · Bandung Build Challenge 2026 · Demo Day, 15 November 2026 · Summarecon Mall Bandung
        </footer>
      </div>
    </main>
  )
}
