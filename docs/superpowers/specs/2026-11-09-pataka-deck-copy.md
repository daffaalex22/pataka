# Pataka `/deck` slide copy (2026-11-09)

Companion to `2026-11-09-pataka-deck-upgrade-design.md`. Bahasa Indonesia headlines and body; English subtitles. This is the exact copy for the 10-slide deck and the printable notes.

For `DECK_SLIDES`, the `subtitle` field holds the English line. The cover’s Indonesian one-liner is rendered in the cover body, not in `subtitle`.

## Slide 00 — Cover

- Kicker: `BANDUNG BUILD CHALLENGE 2026`
- Title: `Pataka`
- Subtitle: `Pilih kursi konser dari dalam venue 3D.`
- English: `Pick your concert seat inside the 3D venue.`
- Meta: `Dare · Demo Day, 15 November 2026 · Summarecon Mall Bandung`
- Small line: `Prototype finalis Bandung Innovation Week 2026`

**Notes:** Halo, saya Dare dari Tim Pataka. Pataka adalah pengalaman ticketing 3D untuk konser malam di Sawarga Courtyard, Summarecon Mall Bandung. Dalam empat menit, saya akan menunjukkan bagaimana pengunjung memilih kursi dengan yakin, dan bagaimana panitia menjaga satu kursi tetap satu pemilik.

## Slide 01 — Masalah

- Kicker: `01 — MASALAH`
- Title: `Memilih kursi konser masih menebak-nebak.`
- Subtitle: `Picking a concert seat is still guesswork.`
- Card 1: `Kursi bisa terjual dua kali` — `Pemesanan tanpa penguncian membuat dua pengunjung bisa membayar kursi yang sama.`
- Card 2: `Denah statis tidak menunjukkan pandangan` — `Pengunjung tidak tahu apa yang mereka lihat: tertutup tribun, terlalu jauh, atau di sudut.`
- Card 3: `Check-in dan rekap manual` — `Panitia mencatat kehadiran dengan daftar cetak; rawan salah dan lambat saat antrean masuk.`
- Bottom line: `Peluangnya: konser malam terbuka di Sawarga Courtyard — pengunjung butuh rasa yakin, panitia butuh data yang bisa dipercaya.`

**Notes:** Mulai dari masalahnya. Hari ini, memilih kursi konser masih tebak-tebakan. Pertama, kursi bisa terjual dua kali kalau tidak ada penguncian. Kedua, denah statis tidak menunjukkan apa yang sebenarnya dilihat dari kursi. Ketiga, check-in dan rekap masih manual. Di konser malam Sawarga Courtyard, pengunjung butuh rasa yakin sebelum membayar — dan panitia butuh data yang bisa dipercaya.

## Slide 02 — Pengguna

- Kicker: `02 — PENGGUNA`
- Title: `Dua pengguna, satu kebenaran data.`
- Subtitle: `Two users, one source of truth.`
- Left: `Pengunjung acara` — `Membuka link dari ponsel, membandingkan kategori, memilih kursi, dan berharap tidak ada kejutan saat tiba.`
- Right: `Panitia` — `Mengatur kuota, harga, dan periode jual; memantau kursi dan transaksi; memindai QR; mengunduh laporan.`
- Need 1: `Kejelasan` — `Status kursi sama di semua layar: denah, ringkasan, dan dashboard.`
- Need 2: `Kecepatan` — `Pemesanan selesai dalam hitungan menit, check-in dalam hitungan detik.`
- Need 3: `Kepercayaan` — `Tidak ada kursi ganda; QR tidak bisa dipakai dua kali.`

**Notes:** Ada dua pengguna. Pengunjung membuka link dari ponsel dan ingin yakin kursinya tidak mengecewakan. Panitia ingin mengatur kuota, harga, dan periode jual, lalu memantau kursi, transaksi, dan kehadiran. Keduanya butuh tiga hal yang sama: kejelasan status, kecepatan alur, dan kepercayaan bahwa data di layar adalah data yang sama di database.

## Slide 03 — Alur solusi

- Kicker: `03 — ALUR SOLUSI`
- Title: `Dari memilih kursi sampai masuk venue.`
- Subtitle: `From seat selection to venue entry.`
- Step 01: `Pilih kategori` — `VIP Depan, CAT 1, Tribun, atau Reguler — harga dan sisa kursi tampil langsung.`
- Step 02: `Masuk venue 3D` — `Jelajahi plaza sebagai karakter, atau putar kamera untuk melihat seluruh denah.`
- Step 03: `Kunci kursi 10 menit` — `Ketuk kursi; server menahan kursi hanya untukmu dengan hitungan mundur.`
- Step 04: `Isi data peserta` — `Formulir singkat dengan data contoh; kursi tetap terkunci.`
- Step 05: `Bayar (simulasi)` — `E-wallet, VA, atau QRIS — tanpa transaksi nyata.`
- Step 06: `E-ticket QR` — `QR bertanda tangan untuk check-in, plus kalender dan pengingat simulasi.`

**Notes:** Alurnya enam langkah. Pengunjung memilih kategori, masuk ke venue 3D, mengunci kursi selama sepuluh menit, mengisi data, membayar simulasi, lalu menerima e-ticket dengan QR. Setiap langkah membaca status kursi yang sama dari server. Jadi ketika kursi dikunci, semua layar langsung tahu.

## Slide 04 — Bukti produk

- Kicker: `04 — BUKTI PRODUK`
- Title: `Ini yang dilihat pengunjung — dan yang dipakai panitia.`
- Subtitle: `What visitors see — and what organizers use.`
- Image 1: `Venue 3D + karakter` — `Plaza malam Sawarga Courtyard; joystick di ponsel, WASD di desktop.`
- Image 2: `Pratinjau dari kursi` — `Kamera ke ketinggian mata, menghadap panggung — tahu persis yang akan dilihat.`
- Image 3: `E-ticket + check-in` — `QR bertanda tangan HMAC; VALID / SUDAH DIGUNAKAN / TIDAK VALID dalam sekali pindai.`
- Image 4: `Panel panitia` — `Penjualan, kursi, pesanan, check-in, ekspor CSV peserta dan transaksi.`
- Chip: `Dua bahasa: Indonesia / English`

**Notes:** Ini produknya. Di kiri atas, venue 3D: pengunjung bisa berjalan sebagai karakter atau melihat seluruh plaza. Di kanan atas, pratinjau dari kursi: kamera turun ke ketinggian mata dan menghadap panggung. Di kiri bawah, e-ticket dengan QR bertanda tangan. Di kanan bawah, panel panitia: penjualan, kursi, pesanan, check-in, dan ekspor CSV. Semua dalam satu aplikasi.

## Slide 05 — Logika kursi

- Kicker: `05 — LOGIKA KURSI`
- Title: `Anti double-booking, bukan sekadar janji.`
- Subtitle: `Seat locking that actually locks.`
- Status 1: `Tersedia` — `bisa dikunci siapa pun.`
- Status 2: `Ditahan` — `terkunci 10 menit milik satu pemesanan.`
- Status 3: `Terjual` — `hanya setelah pembayaran dikonfirmasi.`
- Code:

```sql
UPDATE seats SET status = 'held', hold_token = $1
WHERE id = $2 AND status = 'available'
RETURNING id;
```

- Proof 1: `0 baris → kursi sudah diambil → 409`
- Proof 2: `Hold kedaluwarsa → dilepas otomatis saat dibaca`
- Bottom: `Demonstrasi di depan juri: dua browser, kursi yang sama, kunci bersamaan. Satu menang; yang lain menerima 409. Database yang memutuskan pemenangnya — bukan animasi di layar.`

**Notes:** Ini bagian yang paling penting untuk juri. Kursi punya tiga status: tersedia, ditahan, dan terjual. Saat pengunjung mengunci kursi, server menjalankan satu UPDATE dengan syarat status masih available. Kalau nol baris berubah, artinya kursi sudah diambil, dan server mengembalikan 409. Database yang memutuskan pemenangnya, bukan animasi di layar. Hold yang kedaluwarsa dilepas otomatis saat dibaca.

## Slide 06 — Teknis

- Kicker: `06 — TEKNIS`
- Title: `Cepat di ponsel, kuat di belakang.`
- Subtitle: `Fast on a phone, solid underneath.`
- Card 1: `Next.js 16 + React Three Fiber` — `446 kursi sebagai dua instanced mesh — dua draw call, bukan 446.`
- Card 2: `Postgres (Neon) + Vercel` — `Transaksi dan constraint menjaga kursi; deploy serverless tanpa infrastruktur tambahan.`
- Card 3: `QR bertanda tangan` — `Payload PTK|order|HMAC-SHA256; validasi offline di server.`
- Card 4: `Anggaran performa ponsel` — `Tanpa shadow map, DPR adaptif, geometri rendah poligon; peta 2D sebagai fallback.`
- Chips: `Next.js 16`, `React 19`, `Three.js / R3F`, `Tailwind`, `Neon Postgres`, `Vercel`, `Vitest`, `HMAC QR`, `ID / EN`

**Notes:** Secara teknis, ini satu aplikasi Next.js 16 dengan React Three Fiber. 446 kursi dirender sebagai dua instanced mesh — dua draw call, bukan 446. Di belakang, Postgres di Neon menjaga transaksi dan constraint. QR-nya bertanda tangan HMAC-SHA256 dan divalidasi di server. Untuk ponsel, kami membuang shadow map, memakai DPR adaptif, dan menyediakan peta 2D sebagai fallback.

## Slide 07 — Asumsi

- Kicker: `07 — ASUMSI`
- Title: `Asumsi yang jelas, penilaian yang adil.`
- Subtitle: `Clear assumptions, fair judging.`
- Acara: `Konser malam penutupan Bandung Innovation Week 2026, 14 November, Sawarga Courtyard, Summarecon Mall Bandung.`
- Kapasitas: `446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150.`
- Harga: `Rp 1.500.000 / 900.000 / 600.000 / 350.000 per kursi.`
- Pemesanan: `Satu kursi per pesanan; kursi ditahan 10 menit sebelum dibayar.`
- Pembayaran: `Simulasi (e-wallet, VA, QRIS); tidak ada transaksi atau data kartu nyata.`
- Notifikasi: `Email/WhatsApp dan pengingat disimulasikan; kalender .ics berfungsi.`
- Data: `Seluruh peserta dan transaksi adalah data contoh fiktif.`
- Denah: `Tata letak kursi ditetapkan per acara; panitia mengatur harga, kuota, dan periode jual.`

**Notes:** Supaya penilaiannya adil, ini asumsinya. Acara: konser malam penutupan Bandung Innovation Week 2026, 14 November, di Sawarga Courtyard. Kapasitas 446 kursi bernomor: VIP Depan 48, CAT 1 128, Tribun 120, Reguler 150. Harga Rp 350 ribu sampai Rp 1,5 juta. Satu kursi per pesanan, ditahan sepuluh menit. Pembayaran, email, dan WhatsApp disimulasikan; kalender .ics berfungsi. Semua data adalah contoh fiktif.

## Slide 08 — Manfaat

- Kicker: `08 — MANFAAT`
- Title: `Yang berubah bagi pengunjung dan panitia.`
- Subtitle: `What changes for visitors and organizers.`
- Card 1: `Pengunjung lebih yakin` — `Melihat pemandangan panggung sebelum membayar mengurangi keraguan dan keluhan setelah tiba.`
- Card 2: `Nol kursi ganda` — `Penguncian di database membuat janji "satu kursi, satu pemilik" bisa diuji, bukan sekadar diklaim.`
- Card 3: `Check-in lebih cepat` — `Pemindaian QR langsung memberi keputusan valid/tidak dan mencatat kehadiran tanpa rekap manual.`
- Card 4: `Keputusan berbasis data` — `Dasbor dan ekspor CSV memberi panitia angka pendaftar, penjualan, dan kehadiran saat itu juga.`
- Next: `Langkah berikutnya: zona festival berdiri, pembatalan mandiri dan refund, pengingat WhatsApp sungguhan, integrasi payment gateway, serta multi-acara untuk pengelola venue.`

**Notes:** Dampaknya ada empat. Pengunjung lebih yakin karena melihat pemandangan panggung sebelum membayar. Tidak ada kursi ganda karena penguncian terjadi di database. Check-in lebih cepat karena QR langsung memberi keputusan. Dan panitia mendapat keputusan berbasis data dari dasbor dan ekspor CSV. Langkah berikutnya: zona festival berdiri, refund mandiri, WhatsApp sungguhan, payment gateway, dan multi-acara.

## Slide 09 — Demo / penutup

- Kicker: `09 — DEMO`
- Title: `Satu kursi, satu pemilik. Coba sendiri.`
- Subtitle: `One seat, one owner. Try it yourself.`
- Body: `Buka prototype di ponsel: pilih kategori → jelajahi venue 3D → kunci kursi → bayar simulasi → e-ticket QR. Lalu masuk panel panitia dan pindai tiket.`
- Live cue: `Live demo: dua browser, satu kursi. Satu menang; yang lain menerima 409.`
- Fallback: `Jika demo gagal, gunakan screenshot di slide 04.`
- QR target: `https://pataka-ruby.vercel.app`

**Notes:** Satu kursi, satu pemilik. Silakan coba sendiri: buka prototype di ponsel, pilih kategori, jelajahi venue 3D, kunci kursi, bayar simulasi, dan lihat e-ticket QR. Lalu masuk panel panitia dan pindai tiket. Kalau waktu memungkinkan, saya akan menunjukkan dua browser berebut kursi yang sama — dan hanya satu yang menang. Terima kasih.
