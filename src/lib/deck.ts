export type DeckSlide = {
  id:
    | 'cover'
    | 'problem'
    | 'users'
    | 'solution'
    | 'product-proof'
    | 'venue-proof'
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
    subtitle: 'Ticketing for mall events — from one concert to a venue calendar.',
    notes:
      'Halo, saya Dare dari Tim Pataka. Pataka adalah pengalaman ticketing untuk acara mall — mulai dari konser malam di Sawarga Courtyard, sampai portofolio acara di seluruh venue. Dalam empat menit, saya akan menunjukkan bagaimana pengunjung memilih kursi dengan yakin, bagaimana panitia menjaga satu kursi tetap satu pemilik, dan bagaimana mall melihat seluruh acara dalam satu dasbor.',
  },
  {
    id: 'problem',
    number: '01',
    kicker: 'MASALAH',
    title: 'Acara mall masih jalan di atas spreadsheet dan denah statis.',
    subtitle: 'Mall events still run on spreadsheets and static maps.',
    notes:
      'Mulai dari masalahnya. Acara mall masih jalan di atas spreadsheet dan denah statis. Pertama, kursi bisa terjual dua kali kalau tidak ada penguncian. Kedua, check-in dan rekap masih manual. Ketiga, setiap acara punya spreadsheet sendiri, jadi mall tidak bisa melihat okupansi, pendapatan, dan kehadiran dalam satu tempat. Di Sawarga, atrium, dan Downtown Walk, pengunjung butuh rasa yakin — dan mall butuh data yang bisa dipercaya.',
  },
  {
    id: 'users',
    number: '02',
    kicker: 'PENGGUNA',
    title: 'Tiga pengguna, satu kebenaran data.',
    subtitle: 'Three users, one source of truth.',
    notes:
      'Ada tiga pengguna. Pengunjung membuka link dari ponsel dan ingin yakin kursinya tidak mengecewakan. Panitia mengatur kuota, harga, dan periode jual, lalu memantau kursi, transaksi, dan kehadiran. Pengelola mall melihat okupansi, pendapatan, dan check-in lintas acara — dan memastikan satu proses untuk semua ruang. Ketiganya butuh kejelasan status, kecepatan alur, dan kepercayaan bahwa angka mall sama dengan angka panitia.',
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
      'Ini produknya. Di kiri atas, venue 3D: pengunjung bisa berjalan sebagai karakter atau melihat seluruh plaza. Di kanan atas, pratinjau dari kursi: kamera turun ke ketinggian mata dan menghadap panggung. Di kiri bawah, e-ticket dengan QR bertanda tangan. Di kanan bawah, Operasi Mall: portofolio acara, okupansi, pendapatan, check-in, dan settlement; panel panitia tetap di tab yang sama. Semua dalam satu aplikasi.',
  },
  {
    id: 'venue-proof',
    number: '05',
    kicker: 'DENAH ASLI',
    title: 'Dari denah asli ke venue 3D.',
    subtitle: 'From the real floor plan to the 3D venue.',
    notes:
      'Kami tidak mengarang venue. Denah Summarecon Lantai Dasar menjadi acuan: Sawarga Courtyard ditandai, tiga atrium menjadi akses utama, dan pengunjung dari luar kota bisa berorientasi sebelum berangkat. Venue 3D adalah cara kami membuat lokasi nyata itu terasa sebelum tiket dibeli.',
  },
  {
    id: 'seat-logic',
    number: '06',
    kicker: 'LOGIKA KURSI',
    title: 'Anti double-booking, bukan sekadar janji.',
    subtitle: 'Seat locking that actually locks.',
    notes:
      'Ini bagian yang paling penting untuk juri. Kursi punya tiga status: tersedia, ditahan, dan terjual. Saat pengunjung mengunci kursi, server menjalankan satu UPDATE dengan syarat status masih available. Kalau nol baris berubah, artinya kursi sudah diambil, dan server mengembalikan 409. Database yang memutuskan pemenangnya, bukan animasi di layar. Hold yang kedaluwarsa dilepas otomatis saat dibaca.',
  },
  {
    id: 'technical',
    number: '07',
    kicker: 'TEKNIS',
    title: 'Cepat di ponsel, kuat di belakang.',
    subtitle: 'Fast on a phone, solid underneath.',
    notes:
      'Secara teknis, ini satu aplikasi Next.js 16 dengan React Three Fiber. 446 kursi dirender sebagai dua instanced mesh — dua draw call, bukan 446. Di belakang, Postgres di Neon menjaga transaksi dan constraint. QR-nya bertanda tangan HMAC-SHA256 dan divalidasi di server. Untuk ponsel, kami membuang shadow map, memakai DPR adaptif, dan menyediakan peta 2D sebagai fallback.',
  },
  {
    id: 'assumptions',
    number: '08',
    kicker: 'ASUMSI',
    title: 'Asumsi yang jelas, penilaian yang adil.',
    subtitle: 'Clear assumptions, fair judging.',
    notes:
      'Supaya penilaiannya adil, ini asumsinya. Acara: konser malam penutupan Bandung Innovation Week 2026, 14 November, di Sawarga Courtyard. Kapasitas 446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150. Harga Rp 350 ribu sampai Rp 1,5 juta. Satu kursi per pesanan, ditahan sepuluh menit. Pembayaran, email, dan WhatsApp disimulasikan; kalender .ics berfungsi. Semua data adalah contoh fiktif. Baris acara lain di Operasi Mall juga data contoh; angka acara live dihitung dari database. Peran dan settlement adalah model operasi pada demo, bukan fitur produksi.',
  },
  {
    id: 'impact',
    number: '09',
    kicker: 'MANFAAT',
    title: 'Yang berubah bagi pengunjung, panitia, dan mall.',
    subtitle: 'What changes for visitors, organizers, and the mall.',
    notes:
      'Dampaknya ada empat. Pengunjung lebih yakin karena melihat pemandangan panggung sebelum membayar. Tidak ada kursi ganda karena penguncian terjadi di database. Check-in lebih cepat karena QR langsung memberi keputusan. Dan mall melihat seluruh portofolio: okupansi, pendapatan, dan kehadiran per acara dan per ruang. Modelnya: pilot satu acara di Sawarga, lalu kalender mall — platform fee plus per-ticket fee atau revenue share. KPI pilot: sell-through, check-in time, nol double-booking, rekonsiliasi 100 persen. Roadmap: multi-acara, peran, refund, settlement.',
  },
  {
    id: 'close',
    number: '10',
    kicker: 'DEMO',
    title: 'Mulai dari satu acara. Jalankan kalender mall.',
    subtitle: "Start with one event. Run the mall's calendar.",
    notes:
      'Mulai dari satu acara. Jalankan kalender mall. Silakan coba sendiri: buka prototype di ponsel, pilih kategori, jelajahi venue 3D, kunci kursi, bayar simulasi, dan lihat e-ticket QR. Lalu masuk panel panitia dan tab Operasi Mall untuk melihat portofolio. Kalau waktu memungkinkan, saya akan menunjukkan dua browser berebut kursi yang sama — dan hanya satu yang menang. Terima kasih.',
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
