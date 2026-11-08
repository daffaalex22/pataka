import Link from 'next/link'
import { DemoLinks } from '@/components/deck/DemoLinks'
import { DeckChrome } from '@/components/deck/DeckChrome'
import { DeckSlide } from '@/components/deck/DeckSlide'
import { DECK_SLIDES } from '@/lib/deck'

function Card({ label, body }: { label: string; body: string }) {
  return (
    <div className="panel rounded-2xl p-5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  )
}

export default function DeckPage() {
  return (
    <>
      <main className="deck-scroll h-[100dvh] snap-y snap-mandatory overflow-y-auto scroll-smooth pb-16">
        <DeckSlide slide={DECK_SLIDES[1]}>
          <div className="grid gap-3 sm:grid-cols-3">
          <Card
            label="Kursi bisa terjual dua kali"
            body="Pemesanan tanpa penguncian kursi membuat dua pengunjung bisa membayar kursi yang sama. Panitia harus membereskan manual."
          />
          <Card
            label="Denah statis tidak menunjukkan pandangan"
            body="Pengunjung tidak tahu apa yang mereka lihat dari kursi — tertutup tribun, terlalu jauh, atau di sudut. Keputusan jadi ragu."
          />
          <Card
            label="Check-in dan rekap manual"
            body="Panitia mencatat kehadiran dengan daftar cetak; rawan salah dan lambat saat antrean masuk."
          />
        </div>
        <p className="mt-6 text-sm text-muted">
          Peluangnya: acara malam terbuka di Sawarga Courtyard, Summarecon Mall Bandung — pengunjung butuh rasa yakin sebelum membeli,
          panitia butuh data yang bisa dipercaya.
        </p>
      </DeckSlide>

      <DeckSlide slide={DECK_SLIDES[2]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            label="Pengunjung acara"
            body="Membuka link dari ponsel, membandingkan kategori, memilih kursi, dan berharap tidak ada kejutan saat sampai di venue. Butuh alur singkat dan yakin."
          />
          <Card
            label="Panitia"
            body="Mengatur kuota, harga, dan periode jual; memantau kursi dan transaksi; memindai QR di pintu masuk; mengunduh laporan peserta."
          />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Card label="Butuh: kejelasan" body="Status kursi terlihat sama di semua layar — denah, ringkasan, dan dashboard panitia." />
          <Card label="Butuh: kecepatan" body="Pemesanan selesai dalam hitungan menit, check-in dalam hitungan detik." />
          <Card label="Butuh: kepercayaan" body="Tidak ada kursi ganda, QR tidak bisa dipakai dua kali." />
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
            ['06', 'E-ticket QR', 'QR bertanda tangan untuk check-in panitia, plus kalender dan pengingat simulasi.'],
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label="Venue 3D + karakter" body="Plaza malam dengan panggung, tribun, dan lampu gantung. Pengunjung berjalan dengan joystick (ponsel) atau WASD (desktop)." />
          <Card label="Pratinjau dari kursi" body="Satu ketukan membawa kamera ke ketinggian mata di kursi terpilih, menghadap panggung — tahu persis yang akan dilihat." />
          <Card label="Status kursi langsung" body="Hijau tersedia, kuning ditahan dengan hitungan mundur, abu-abu terjual. Semua berbagi satu sumber data di server." />
          <Card label="E-ticket + check-in" body="QR bertanda tangan HMAC; pemindai kamera menampilkan VALID / SUDAH DIGUNAKAN / TIDAK VALID dalam sekali pindai." />
          <Card label="Panel panitia" body="Dasbor penjualan, pesanan dengan konfirmasi/pembatalan, pengaturan harga-kuota-periode, ekspor CSV peserta dan transaksi." />
          <Card label="Dua bahasa" body="Antarmuka Indonesia dan Inggris, dapat diganti kapan saja dari setiap layar." />
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
              Semua tampilan (3D, peta 2D, ringkasan, dashboard) membaca status yang sama dari Postgres. Klien tidak pernah menulis status.
            </p>
          </div>
          <div className="panel rounded-2xl p-5">
            <p className="text-sm font-semibold">Bagaimana kursi dikunci</p>
            <div className="mt-4 space-y-2 font-mono text-[11px] leading-relaxed text-muted">
              <p className="rounded-lg bg-black/40 p-3">UPDATE seats SET status = &apos;held&apos;, hold_token = $1<br />WHERE id = $2 AND status = &apos;available&apos;<br />RETURNING id;</p>
              <p className="rounded-lg bg-black/40 p-3">Jika 0 baris → kursi sudah diambil → 409</p>
              <p className="rounded-lg bg-black/40 p-3">Hold kedaluwarsa → dilepas otomatis saat dibaca</p>
            </div>
          </div>
        </div>
        <div className="panel mt-3 rounded-2xl p-5">
          <p className="text-sm font-semibold">Demonstrasi di depan juri</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Buka prototype di dua browser, pilih kursi yang sama, tekan kunci bersamaan. Satu mendapat kursi; yang lain menerima
            &ldquo;Kursi baru saja diambil orang lain&rdquo; dan denah langsung diperbarui. Database yang memutuskan pemenangnya —
            bukan animasi di layar.
          </p>
        </div>
      </DeckSlide>

      <DeckSlide slide={DECK_SLIDES[6]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label="Next.js 16 + React Three Fiber" body="Satu aplikasi untuk pengunjung, panitia, dan deck. Venue dirender WebGL dengan 446 kursi sebagai dua instanced mesh — dua draw call, bukan 446." />
          <Card label="Postgres (Neon) + Vercel" body="Transaksi dan constraint menjaga kursi; serverless deploy dengan pembaruan berkala. Tanpa infrastruktur tambahan." />
          <Card label="QR bertanda tangan" body="Payload PTK|order|HMAC-SHA256. Validasi offline di server; pemindaian kedua tercatat sebagai sudah digunakan tanpa mengubah waktu kehadiran." />
          <Card label="Anggaran performa ponsel" body="Tanpa shadow map, DPR adaptif, geometri rendah poligon, fog untuk kedalaman. Tampilan peta 2D tetap tersedia sebagai fallback." />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
          {['Next.js 16', 'React 19', 'Three.js / R3F', 'Tailwind', 'Neon Postgres', 'Vercel', 'Vitest 19 tes', 'HMAC QR'].map((chip) => (
            <span key={chip} className="rounded-full border border-line px-3 py-1">{chip}</span>
          ))}
        </div>
      </DeckSlide>

      <DeckSlide slide={DECK_SLIDES[7]}>
        <div className="panel overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[34rem] text-sm">
            <tbody>
              {[
                ['Acara', 'Konser malam penutupan Bandung Innovation Week 2026, 14 November, Sawarga Courtyard, Summarecon Mall Bandung (ruang terbuka).'],
                ['Kapasitas', '446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150.'],
                ['Harga', 'Rp 1.500.000 / 900.000 / 600.000 / 350.000 per kursi.'],
                ['Pemesanan', 'Satu kursi per pesanan; kursi ditahan 10 menit sebelum dibayar.'],
                ['Pembayaran', 'Simulasi (e-wallet, VA, QRIS). Tidak ada transaksi atau data kartu nyata.'],
                ['Notifikasi', 'Email/WhatsApp dan pengingat disimulasikan; kalender .ics berfungsi.'],
                ['Data', 'Seluruh peserta dan transaksi adalah data contoh fiktif.'],
                ['Denah', 'Tata letak kursi ditetapkan per acara; panitia mengatur harga, kuota, dan periode jual.'],
              ].map(([key, value]) => (
                <tr key={key} className="border-b border-line/60 last:border-0">
                  <td className="w-36 px-4 py-3 align-top text-[11px] uppercase tracking-[0.12em] text-muted">{key}</td>
                  <td className="px-4 py-3 leading-relaxed">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DeckSlide>

      <DeckSlide slide={DECK_SLIDES[8]}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card label="Pengunjung lebih yakin" body="Melihat pemandangan panggung sebelum membayar mengurangi keraguan dan keluhan setelah tiba." />
          <Card label="Nol kursi ganda" body="Penguncian di database membuat janji &ldquo;satu kursi, satu pemilik&rdquo; bisa diuji, bukan sekadar diklaim." />
          <Card label="Check-in lebih cepat" body="Pemindaian QR langsung memberi keputusan valid/tidak dan mencatat kehadiran tanpa rekap manual." />
          <Card label="Keputusan berbasis data" body="Dasbor dan ekspor CSV memberi panitia angka pendaftar, penjualan, dan kehadiran saat itu juga." />
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold">Langkah berikutnya</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Zona festival berdiri, pembatalan mandiri dan refund, pengingat WhatsApp sungguhan, integrasi payment gateway,
            serta multi-acara untuk pengelola venue.
          </p>
        </div>
      </DeckSlide>

      <DeckSlide slide={DECK_SLIDES[9]}>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Alur lengkap pengunjung: pilih kategori → jelajahi venue 3D → kunci kursi → bayar simulasi → e-ticket QR.
          Lalu masuk ke panel panitia: konfirmasi pembayaran, pantau kursi, dan pindai tiket.
        </p>
        <DemoLinks />
        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/" className="text-accent hover:underline">← Prototype</Link>
          <Link href="/admin" className="text-muted hover:text-foreground">Panel Panitia</Link>
        </div>
      </DeckSlide>
      </main>
      <DeckChrome count={DECK_SLIDES.length - 1} />
    </>
  )
}
