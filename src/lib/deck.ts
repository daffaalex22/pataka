export type DeckSlide = {
  id:
    | 'cover'
    | 'problem'
    | 'users'
    | 'solution'
    | 'product-proof'
    | 'seat-logic'
    | 'technical'
    | 'assumptions'
    | 'impact'
    | 'close'
  number: string
  kicker: string
  title: string
  subtitle: string
  notes: string
}

export const DECK_SLIDES: readonly DeckSlide[] = [
  {
    id: 'cover',
    number: '00',
    kicker: 'BANDUNG BUILD CHALLENGE 2026',
    title: 'Pataka',
    subtitle: 'Pick your concert seat inside the 3D venue.',
    notes:
      'Halo, saya Dare dari Tim Pataka. Pataka adalah pengalaman ticketing 3D untuk konser malam di Sawarga Courtyard, Summarecon Mall Bandung. Dalam empat menit, saya akan menunjukkan bagaimana pengunjung memilih kursi dengan yakin, dan bagaimana panitia menjaga satu kursi tetap satu pemilik.',
  },
  {
    id: 'problem',
    number: '01',
    kicker: 'MASALAH',
    title: 'Memilih kursi konser masih menebak-nebak.',
    subtitle: 'Picking a concert seat is still guesswork.',
    notes:
      'Mulai dari masalahnya. Hari ini, memilih kursi konser masih tebak-tebakan. Pertama, kursi bisa terjual dua kali kalau tidak ada penguncian. Kedua, denah statis tidak menunjukkan apa yang sebenarnya dilihat dari kursi. Ketiga, check-in dan rekap masih manual. Di konser malam Sawarga Courtyard, pengunjung butuh rasa yakin sebelum membayar — dan panitia butuh data yang bisa dipercaya.',
  },
  {
    id: 'users',
    number: '02',
    kicker: 'PENGGUNA',
    title: 'Dua pengguna, satu kebenaran data.',
    subtitle: 'Two users, one source of truth.',
    notes:
      'Ada dua pengguna. Pengunjung membuka link dari ponsel dan ingin yakin kursinya tidak mengecewakan. Panitia ingin mengatur kuota, harga, dan periode jual, lalu memantau kursi, transaksi, dan kehadiran. Keduanya butuh tiga hal yang sama: kejelasan status, kecepatan alur, dan kepercayaan bahwa data di layar adalah data yang sama di database.',
  },
  {
    id: 'solution',
    number: '03',
    kicker: 'ALUR SOLUSI',
    title: 'Dari memilih kursi sampai masuk venue.',
    subtitle: 'From seat selection to venue entry.',
    notes:
      'Alurnya enam langkah. Pengunjung memilih kategori, masuk ke venue 3D, mengunci kursi selama sepuluh menit, mengisi data, membayar simulasi, lalu menerima e-ticket dengan QR. Setiap langkah membaca status kursi yang sama dari server. Jadi ketika kursi dikunci, semua layar langsung tahu.',
  },
  {
    id: 'product-proof',
    number: '04',
    kicker: 'BUKTI PRODUK',
    title: 'Ini yang dilihat pengunjung — dan yang dipakai panitia.',
    subtitle: 'What visitors see — and what organizers use.',
    notes:
      'Ini produknya. Di kiri atas, venue 3D: pengunjung bisa berjalan sebagai karakter atau melihat seluruh plaza. Di kanan atas, pratinjau dari kursi: kamera turun ke ketinggian mata dan menghadap panggung. Di kiri bawah, e-ticket dengan QR bertanda tangan. Di kanan bawah, panel panitia: penjualan, kursi, pesanan, check-in, dan ekspor CSV. Semua dalam satu aplikasi.',
  },
  {
    id: 'seat-logic',
    number: '05',
    kicker: 'LOGIKA KURSI',
    title: 'Anti double-booking, bukan sekadar janji.',
    subtitle: 'Seat locking that actually locks.',
    notes:
      'Ini bagian yang paling penting untuk juri. Kursi punya tiga status: tersedia, ditahan, dan terjual. Saat pengunjung mengunci kursi, server menjalankan satu UPDATE dengan syarat status masih available. Kalau nol baris berubah, artinya kursi sudah diambil, dan server mengembalikan 409. Database yang memutuskan pemenangnya, bukan animasi di layar. Hold yang kedaluwarsa dilepas otomatis saat dibaca.',
  },
  {
    id: 'technical',
    number: '06',
    kicker: 'TEKNIS',
    title: 'Cepat di ponsel, kuat di belakang.',
    subtitle: 'Fast on a phone, solid underneath.',
    notes:
      'Secara teknis, ini satu aplikasi Next.js 16 dengan React Three Fiber. 446 kursi dirender sebagai dua instanced mesh — dua draw call, bukan 446. Di belakang, Postgres di Neon menjaga transaksi dan constraint. QR-nya bertanda tangan HMAC-SHA256 dan divalidasi di server. Untuk ponsel, kami membuang shadow map, memakai DPR adaptif, dan menyediakan peta 2D sebagai fallback.',
  },
  {
    id: 'assumptions',
    number: '07',
    kicker: 'ASUMSI',
    title: 'Asumsi yang jelas, penilaian yang adil.',
    subtitle: 'Clear assumptions, fair judging.',
    notes:
      'Supaya penilaiannya adil, ini asumsinya. Acara: konser malam penutupan Bandung Innovation Week 2026, 14 November, di Sawarga Courtyard. Kapasitas 446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150. Harga Rp 350 ribu sampai Rp 1,5 juta. Satu kursi per pesanan, ditahan sepuluh menit. Pembayaran, email, dan WhatsApp disimulasikan; kalender .ics berfungsi. Semua data adalah contoh fiktif.',
  },
  {
    id: 'impact',
    number: '08',
    kicker: 'MANFAAT',
    title: 'Yang berubah bagi pengunjung dan panitia.',
    subtitle: 'What changes for visitors and organizers.',
    notes:
      'Dampaknya ada empat. Pengunjung lebih yakin karena melihat pemandangan panggung sebelum membayar. Tidak ada kursi ganda karena penguncian terjadi di database. Check-in lebih cepat karena QR langsung memberi keputusan. Dan panitia mendapat keputusan berbasis data dari dasbor dan ekspor CSV. Langkah berikutnya: zona festival berdiri, refund mandiri, WhatsApp sungguhan, payment gateway, dan multi-acara.',
  },
  {
    id: 'close',
    number: '09',
    kicker: 'DEMO',
    title: 'Satu kursi, satu pemilik. Coba sendiri.',
    subtitle: 'One seat, one owner. Try it yourself.',
    notes:
      'Satu kursi, satu pemilik. Silakan coba sendiri: buka prototype di ponsel, pilih kategori, jelajahi venue 3D, kunci kursi, bayar simulasi, dan lihat e-ticket QR. Lalu masuk panel panitia dan pindai tiket. Kalau waktu memungkinkan, saya akan menunjukkan dua browser berebut kursi yang sama — dan hanya satu yang menang. Terima kasih.',
  },
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
