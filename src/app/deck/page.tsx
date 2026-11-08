import Image from 'next/image'
import { DemoLinks } from '@/components/deck/DemoLinks'
import { DeckChrome } from '@/components/deck/DeckChrome'
import { DeckSlide } from '@/components/deck/DeckSlide'
import { ProductProof } from '@/components/deck/ProductProof'
import { DECK_SLIDES } from '@/lib/deck'

function Card({ label, body }: { label: string; body: string }) {
  return (
    <div className="panel rounded-2xl p-5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  )
}

const PRODUCT_PROOF = [
  {
    src: '/deck/venue.png',
    alt: 'Pataka 3D venue at Sawarga Courtyard',
    label: 'Venue 3D + karakter',
    caption: 'Plaza malam Sawarga Courtyard; joystick di ponsel, WASD di desktop.',
  },
  {
    src: '/deck/seat-view.png',
    alt: 'Seat preview facing the stage',
    label: 'Pratinjau dari kursi',
    caption: 'Kamera ke ketinggian mata, menghadap panggung — tahu persis yang akan dilihat.',
  },
  {
    src: '/deck/eticket.png',
    alt: 'E-ticket with a signed QR code',
    label: 'E-ticket + check-in',
    caption: 'QR bertanda tangan HMAC; VALID / SUDAH DIGUNAKAN / TIDAK VALID dalam sekali pindai.',
  },
  {
    src: '/deck/admin.png',
    alt: 'Pataka organizer dashboard',
    label: 'Panel panitia',
    caption: 'Penjualan, kursi, pesanan, check-in, ekspor CSV peserta dan transaksi.',
  },
]

export default function DeckPage() {
  return (
    <>
      <main className="deck-scroll h-[100dvh] snap-y snap-mandatory overflow-y-auto scroll-smooth pb-16">
        <DeckSlide
          slide={DECK_SLIDES[0]}
          variant="cover"
          background={
            <>
              <Image
                src="/deck/venue.png"
                alt=""
                fill
                priority
                unoptimized
                sizes="100vw"
                className="object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#07060d] via-[#07060d]/70 to-[#07060d]" />
            </>
          }
        >
          <p className="max-w-2xl text-2xl leading-snug text-foreground/90 sm:text-3xl">
            Pilih kursi konser dari dalam venue 3D.
          </p>
          <div className="mt-8 space-y-1 text-sm text-muted">
            <p>Dare · Demo Day, 15 November 2026 · Summarecon Mall Bandung</p>
            <p className="text-xs text-muted/80">Prototype finalis Bandung Innovation Week 2026</p>
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[1]}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card
              label="Kursi bisa terjual dua kali"
              body="Pemesanan tanpa penguncian membuat dua pengunjung bisa membayar kursi yang sama."
            />
            <Card
              label="Denah statis tidak menunjukkan pandangan"
              body="Pengunjung tidak tahu apa yang mereka lihat: tertutup tribun, terlalu jauh, atau di sudut."
            />
            <Card
              label="Check-in dan rekap manual"
              body="Panitia mencatat kehadiran dengan daftar cetak; rawan salah dan lambat saat antrean masuk."
            />
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted">
            Peluangnya: konser malam terbuka di Sawarga Courtyard — pengunjung butuh rasa yakin sebelum membeli,
            panitia butuh data yang bisa dipercaya.
          </p>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[2]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              label="Pengunjung acara"
              body="Membuka link dari ponsel, membandingkan kategori, memilih kursi, dan berharap tidak ada kejutan saat tiba."
            />
            <Card
              label="Panitia"
              body="Mengatur kuota, harga, dan periode jual; memantau kursi dan transaksi; memindai QR; mengunduh laporan."
            />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Card label="Kejelasan" body="Status kursi sama di semua layar: denah, ringkasan, dan dashboard." />
            <Card label="Kecepatan" body="Pemesanan selesai dalam hitungan menit, check-in dalam hitungan detik." />
            <Card label="Kepercayaan" body="Tidak ada kursi ganda; QR tidak bisa dipakai dua kali." />
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[3]}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ['01', 'Pilih kategori', 'VIP Depan, CAT 1, Tribun, atau Reguler — harga dan sisa kursi tampil langsung.'],
              ['02', 'Masuk venue 3D', 'Jelajahi plaza sebagai karakter, atau putar kamera untuk melihat seluruh denah.'],
              ['03', 'Kunci kursi 10 menit', 'Ketuk kursi; server menahan kursi hanya untukmu dengan hitungan mundur.'],
              ['04', 'Isi data peserta', 'Formulir singkat dengan data contoh; kursi tetap terkunci.'],
              ['05', 'Bayar (simulasi)', 'E-wallet, VA, atau QRIS — tanpa transaksi nyata.'],
              ['06', 'E-ticket QR', 'QR bertanda tangan untuk check-in, plus kalender dan pengingat simulasi.'],
            ].map(([n, title, body]) => (
              <li key={n} className="panel rounded-2xl p-5">
                <span className="font-mono text-xs text-accent">{n}</span>
                <p className="mt-1.5 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[4]}>
          <ProductProof items={PRODUCT_PROOF} />
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-muted">
            <span className="rounded-full border border-line px-3 py-1">Dua bahasa: Indonesia / English</span>
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[5]}>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="panel rounded-2xl p-5">
              <p className="text-sm font-semibold">Tiga status, satu sumber kebenaran</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li><span className="text-emerald-300">Tersedia</span> — bisa dikunci siapa pun.</li>
                <li><span className="text-amber-300">Ditahan</span> — terkunci 10 menit milik satu pemesanan.</li>
                <li><span className="text-zinc-400">Terjual</span> — hanya setelah pembayaran dikonfirmasi.</li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                Semua tampilan (3D, peta 2D, ringkasan, dashboard) membaca status yang sama dari Postgres. Klien tidak
                pernah menulis status.
              </p>
            </div>
            <div className="panel rounded-2xl p-5">
              <p className="text-sm font-semibold">Bagaimana kursi dikunci</p>
              <div className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-muted">
                <p className="rounded-lg bg-black/40 p-3">
                  UPDATE seats SET status = &apos;held&apos;, hold_token = $1
                  <br />
                  WHERE id = $2 AND status = &apos;available&apos;
                  <br />
                  RETURNING id;
                </p>
                <p className="rounded-lg bg-black/40 p-3">0 baris → kursi sudah diambil → 409</p>
                <p className="rounded-lg bg-black/40 p-3">Hold kedaluwarsa → dilepas otomatis saat dibaca</p>
              </div>
            </div>
          </div>
          <div className="panel mt-3 rounded-2xl p-5">
            <p className="text-sm font-semibold">Demonstrasi di depan juri</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Dua browser, kursi yang sama, kunci bersamaan. Satu menang; yang lain menerima 409. Database yang
              memutuskan pemenangnya — bukan animasi di layar.
            </p>
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[6]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              label="Next.js 16 + React Three Fiber"
              body="446 kursi sebagai dua instanced mesh — dua draw call, bukan 446."
            />
            <Card
              label="Postgres (Neon) + Vercel"
              body="Transaksi dan constraint menjaga kursi; deploy serverless tanpa infrastruktur tambahan."
            />
            <Card
              label="QR bertanda tangan"
              body="Payload PTK|order|HMAC-SHA256; validasi offline di server."
            />
            <Card
              label="Anggaran performa ponsel"
              body="Tanpa shadow map, DPR adaptif, geometri rendah poligon; peta 2D sebagai fallback."
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
            {['Next.js 16', 'React 19', 'Three.js / R3F', 'Tailwind', 'Neon Postgres', 'Vercel', 'Vitest', 'HMAC QR', 'ID / EN'].map((chip) => (
              <span key={chip} className="rounded-full border border-line px-3 py-1">{chip}</span>
            ))}
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[7]}>
          <div className="panel overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Acara', 'Konser malam penutupan Bandung Innovation Week 2026, 14 November, Sawarga Courtyard, Summarecon Mall Bandung.'],
                  ['Kapasitas', '446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150.'],
                  ['Harga', 'Rp 1.500.000 / 900.000 / 600.000 / 350.000 per kursi.'],
                  ['Pemesanan', 'Satu kursi per pesanan; kursi ditahan 10 menit sebelum dibayar.'],
                  ['Pembayaran', 'Simulasi (e-wallet, VA, QRIS); tidak ada transaksi atau data kartu nyata.'],
                  ['Notifikasi', 'Email/WhatsApp dan pengingat disimulasikan; kalender .ics berfungsi.'],
                  ['Data', 'Seluruh peserta dan transaksi adalah data contoh fiktif.'],
                  ['Denah', 'Tata letak kursi ditetapkan per acara; panitia mengatur harga, kuota, dan periode jual.'],
                ].map(([key, value]) => (
                  <tr key={key} className="border-b border-line/60 last:border-0">
                    <td className="w-24 px-4 py-3 align-top text-[11px] uppercase tracking-[0.12em] text-muted sm:w-36">{key}</td>
                    <td className="px-4 py-3 leading-relaxed">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[8]}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card
              label="Pengunjung lebih yakin"
              body="Melihat pemandangan panggung sebelum membayar mengurangi keraguan dan keluhan setelah tiba."
            />
            <Card
              label="Nol kursi ganda"
              body="Penguncian di database membuat janji &ldquo;satu kursi, satu pemilik&rdquo; bisa diuji, bukan sekadar diklaim."
            />
            <Card
              label="Check-in lebih cepat"
              body="Pemindaian QR langsung memberi keputusan valid/tidak dan mencatat kehadiran tanpa rekap manual."
            />
            <Card
              label="Keputusan berbasis data"
              body="Dasbor dan ekspor CSV memberi panitia angka pendaftar, penjualan, dan kehadiran saat itu juga."
            />
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold">Langkah berikutnya</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Zona festival berdiri, pembatalan mandiri dan refund, pengingat WhatsApp sungguhan, integrasi payment
              gateway, serta multi-acara untuk pengelola venue.
            </p>
          </div>
        </DeckSlide>

        <DeckSlide slide={DECK_SLIDES[9]} variant="closing">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Buka prototype di ponsel: pilih kategori → jelajahi venue 3D → kunci kursi → bayar simulasi → e-ticket QR.
            Lalu masuk panel panitia dan pindai tiket.
          </p>
          <div className="mt-4 max-w-2xl rounded-2xl border border-line bg-white/[0.03] p-4">
            <p className="text-sm font-semibold">Live demo: dua browser, satu kursi.</p>
            <p className="mt-1 text-sm text-muted">Satu menang; yang lain menerima 409.</p>
          </div>
          <p className="mt-3 text-xs text-muted">Jika demo gagal, gunakan screenshot di slide 04.</p>
          <DemoLinks />
        </DeckSlide>
      </main>
      <DeckChrome count={DECK_SLIDES.length} />
    </>
  )
}
