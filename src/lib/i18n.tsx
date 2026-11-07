'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Lang } from './types'

const id = {
  'common.back': 'Kembali',
  'common.continue': 'Lanjutkan',
  'common.loading': 'Memuat…',
  'common.admin': 'Panitia',
  'common.deck': 'Deck',
  'common.home': 'Beranda',

  'hero.badge': 'Bandung Innovation Week 2026',
  'hero.cta': 'Pilih Kursi Sekarang',
  'hero.secondary': 'Lihat kategori tiket',
  'hero.venueLabel': 'Lokasi',
  'hero.dateLabel': 'Jadwal',

  'home.ticketsTitle': 'Pilih kelas tiketmu',
  'home.ticketsSub': 'Harga jelas, sisa kursi diperbarui langsung dari sistem.',
  'home.assumption': 'Prototype — pembayaran, pengingat, dan data peserta disimulasikan.',
  'home.howTitle': 'Cara kerjanya',
  'home.how1Title': 'Pilih kursi dari denah',
  'home.how1Body': 'Lihat kursi tersedia, sedang ditahan, dan terjual secara langsung.',
  'home.how2Title': 'Tahan kursi 10 menit',
  'home.how2Body': 'Kursimu dikunci untukmu — tidak mungkin dipesan dua orang.',
  'home.how3Title': 'Terima e-ticket',
  'home.how3Body': 'QR code siap dipindai panitia saat check-in.',

  'cat.available': 'tersedia',
  'cat.of': 'dari',
  'cat.soldOut': 'Habis terjual',
  'cat.salesClosed': 'Penjualan ditutup',
  'cat.choose': 'Pilih kategori',

  'flow.step1': 'Kategori',
  'flow.step2': 'Kursi',
  'flow.step3': 'Data',
  'flow.step4': 'Pembayaran',

  'seat.title': 'Pilih kursimu',
  'seat.subtitle': 'Ketuk kursi untuk melihat detail dan menguncinya.',
  'seat.legendAvailable': 'Tersedia',
  'seat.legendHeld': 'Ditahan',
  'seat.legendSold': 'Terjual',
  'seat.stage': 'PANGGUNG',
  'seat.price': 'Harga',
  'seat.choose': 'Kunci kursi ini',
  'seat.heldUntil': 'Ditahan hingga',
  'seat.yourSeat': 'Kursimu',
  'seat.resume': 'Lanjutkan pesanan',
  'seat.categoryLabel': 'Kategori',
  'seat.selectFirst': 'Ketuk salah satu kursi untuk melanjutkan',

  'form.title': 'Data peserta',
  'form.subtitle': 'Gunakan data contoh — tidak ada data pribadi sungguhan.',
  'form.name': 'Nama lengkap',
  'form.email': 'Email',
  'form.phone': 'Nomor HP',
  'form.submit': 'Simpan & lihat ringkasan',

  'summary.title': 'Ringkasan pesanan',
  'summary.orderCode': 'Kode pesanan',
  'summary.seat': 'Kursi',
  'summary.status': 'Status',
  'summary.statusPending': 'Menunggu pembayaran',
  'summary.total': 'Total',
  'summary.hold': 'Kursi ditahan hingga',
  'summary.pay': 'Lanjut ke pembayaran',
  'summary.note': 'Kursi otomatis dilepas bila pembayaran tidak diselesaikan sebelum batas waktu.',

  'pay.title': 'Pembayaran (simulasi)',
  'pay.subtitle': 'Tidak ada transaksi nyata. Pilih metode apa pun — hasilnya selalu berhasil.',
  'pay.ewallet': 'E-Wallet',
  'pay.va': 'Virtual Account',
  'pay.qrpay': 'QRIS',
  'pay.payNow': 'Bayar sekarang',
  'pay.processing': 'Memproses…',
  'pay.simulation': 'Simulasi — tidak ada uang yang berpindah.',

  'eticket.success': 'Pembayaran berhasil',
  'eticket.title': 'E-Ticket kamu',
  'eticket.name': 'Nama',
  'eticket.seat': 'Kursi',
  'eticket.code': 'Kode',
  'eticket.method': 'Metode',
  'eticket.calendar': 'Tambah ke Kalender',
  'eticket.reminderTitle': 'Pengingat terkirim (simulasi)',
  'eticket.reminderBody': 'Pengingat H-1 akan dikirim ke email dan WhatsApp kamu.',
  'eticket.scanNote': 'Tunjukkan QR ini ke panitia saat check-in.',
  'eticket.backHome': 'Kembali ke beranda',
  'eticket.notFound': 'Tiket tidak ditemukan.',

  'error.seatTaken': 'Kursi ini baru saja diambil orang lain. Pilih kursi lain, ya.',
  'error.holdExpired': 'Waktu penahanan kursi habis. Silakan pilih kursi lagi.',
  'error.validation': 'Periksa kembali data yang kamu isi.',
  'error.generic': 'Terjadi kesalahan. Coba lagi.',

  'admin.loginTitle': 'Masuk Panitia',
  'admin.loginSub': 'Panel panitia untuk mengelola tiket, pesanan, dan check-in.',
  'admin.key': 'Kunci akses',
  'admin.enter': 'Masuk',
  'admin.wrongKey': 'Kunci akses salah.',
  'admin.demoHint': 'Demo: panitia2026',
  'admin.logout': 'Keluar',
  'admin.tabDashboard': 'Dasbor',
  'admin.tabOrders': 'Pesanan',
  'admin.tabInventory': 'Inventaris Kursi',
  'admin.tabSettings': 'Pengaturan',
  'admin.tabCheckin': 'Check-in',
  'admin.stats.registrants': 'Pendaftar',
  'admin.stats.sold': 'Tiket terjual',
  'admin.stats.held': 'Sedang ditahan',
  'admin.stats.checkedIn': 'Kehadiran',
  'admin.stats.revenue': 'Pendapatan (lunas)',
  'admin.inventory.title': 'Status kursi',
  'admin.orders.title': 'Pesanan',
  'admin.orders.search': 'Cari nama, email, kode…',
  'admin.orders.confirm': 'Konfirmasi bayar',
  'admin.orders.cancel': 'Batalkan',
  'admin.orders.edit': 'Ubah data',
  'admin.orders.save': 'Simpan',
  'admin.orders.cancelEdit': 'Batal',
  'admin.orders.empty': 'Belum ada pesanan.',
  'admin.orders.exportParticipants': 'Unduh peserta',
  'admin.orders.exportTransactions': 'Unduh transaksi',
  'admin.settings.title': 'Pengaturan tiket',
  'admin.settings.price': 'Harga (Rp)',
  'admin.settings.quota': 'Kuota',
  'admin.settings.salesOpen': 'Penjualan dibuka',
  'admin.settings.save': 'Simpan',
  'admin.settings.saved': 'Tersimpan',
  'admin.statusPaid': 'Lunas',
  'admin.statusCancelled': 'Dibatalkan',
  'admin.checkin.title': 'Check-in',
  'admin.checkin.sub': 'Pindai QR e-ticket peserta.',
  'admin.checkin.start': 'Mulai kamera',
  'admin.checkin.stop': 'Hentikan kamera',
  'admin.checkin.manual': 'Kode manual (QR payload)',
  'admin.checkin.check': 'Periksa',
  'admin.checkin.valid': 'VALID — silakan masuk',
  'admin.checkin.already': 'SUDAH DIGUNAKAN',
  'admin.checkin.invalid': 'TIDAK VALID',
  'admin.checkin.recent': 'Scan terakhir',
  'admin.checkin.seat': 'Kursi',

  'status.available': 'Tersedia',
  'status.held': 'Ditahan',
  'status.sold': 'Terjual',
} as const

type DictKey = keyof typeof id

const en: Record<DictKey, string> = {
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.loading': 'Loading…',
  'common.admin': 'Organizer',
  'common.deck': 'Deck',
  'common.home': 'Home',

  'hero.badge': 'Bandung Innovation Week 2026',
  'hero.cta': 'Pick Your Seat',
  'hero.secondary': 'Browse ticket tiers',
  'hero.venueLabel': 'Venue',
  'hero.dateLabel': 'Schedule',

  'home.ticketsTitle': 'Choose your ticket tier',
  'home.ticketsSub': 'Clear pricing, live remaining seats from the system.',
  'home.assumption': 'Prototype — payments, reminders, and participant data are simulated.',
  'home.howTitle': 'How it works',
  'home.how1Title': 'Pick a seat on the map',
  'home.how1Body': 'See available, held, and sold seats in real time.',
  'home.how2Title': '10-minute seat hold',
  'home.how2Body': 'Your seat is locked for you — no two people can book it.',
  'home.how3Title': 'Get your e-ticket',
  'home.how3Body': 'A QR code ready for organizer check-in.',

  'cat.available': 'available',
  'cat.of': 'of',
  'cat.soldOut': 'Sold out',
  'cat.salesClosed': 'Sales closed',
  'cat.choose': 'Choose tier',

  'flow.step1': 'Tier',
  'flow.step2': 'Seat',
  'flow.step3': 'Details',
  'flow.step4': 'Payment',

  'seat.title': 'Pick your seat',
  'seat.subtitle': 'Tap a seat to see details and hold it.',
  'seat.legendAvailable': 'Available',
  'seat.legendHeld': 'Held',
  'seat.legendSold': 'Sold',
  'seat.stage': 'STAGE',
  'seat.price': 'Price',
  'seat.choose': 'Hold this seat',
  'seat.heldUntil': 'Held until',
  'seat.yourSeat': 'Your seat',
  'seat.resume': 'Resume order',
  'seat.categoryLabel': 'Tier',
  'seat.selectFirst': 'Tap a seat to continue',

  'form.title': 'Participant details',
  'form.subtitle': 'Use sample data — no real personal data.',
  'form.name': 'Full name',
  'form.email': 'Email',
  'form.phone': 'Phone number',
  'form.submit': 'Save & review order',

  'summary.title': 'Order summary',
  'summary.orderCode': 'Order code',
  'summary.seat': 'Seat',
  'summary.status': 'Status',
  'summary.statusPending': 'Awaiting payment',
  'summary.total': 'Total',
  'summary.hold': 'Seat held until',
  'summary.pay': 'Continue to payment',
  'summary.note': 'The seat is released automatically if payment is not completed before the deadline.',

  'pay.title': 'Payment (simulated)',
  'pay.subtitle': 'No real transactions. Pick any method — it always succeeds.',
  'pay.ewallet': 'E-Wallet',
  'pay.va': 'Virtual Account',
  'pay.qrpay': 'QRIS',
  'pay.payNow': 'Pay now',
  'pay.processing': 'Processing…',
  'pay.simulation': 'Simulation — no money moves.',

  'eticket.success': 'Payment successful',
  'eticket.title': 'Your e-ticket',
  'eticket.name': 'Name',
  'eticket.seat': 'Seat',
  'eticket.code': 'Code',
  'eticket.method': 'Method',
  'eticket.calendar': 'Add to Calendar',
  'eticket.reminderTitle': 'Reminder scheduled (simulated)',
  'eticket.reminderBody': 'A D-1 reminder will be sent to your email and WhatsApp.',
  'eticket.scanNote': 'Show this QR to the organizer at check-in.',
  'eticket.backHome': 'Back to home',
  'eticket.notFound': 'Ticket not found.',

  'error.seatTaken': 'That seat was just taken. Please pick another one.',
  'error.holdExpired': 'Your seat hold expired. Please pick a seat again.',
  'error.validation': 'Please check the details you entered.',
  'error.generic': 'Something went wrong. Please try again.',

  'admin.loginTitle': 'Organizer Login',
  'admin.loginSub': 'Organizer panel to manage tickets, orders, and check-in.',
  'admin.key': 'Access key',
  'admin.enter': 'Sign in',
  'admin.wrongKey': 'Wrong access key.',
  'admin.demoHint': 'Demo: panitia2026',
  'admin.logout': 'Sign out',
  'admin.tabDashboard': 'Dashboard',
  'admin.tabOrders': 'Orders',
  'admin.tabInventory': 'Seat Inventory',
  'admin.tabSettings': 'Settings',
  'admin.tabCheckin': 'Check-in',
  'admin.stats.registrants': 'Registrants',
  'admin.stats.sold': 'Tickets sold',
  'admin.stats.held': 'Currently held',
  'admin.stats.checkedIn': 'Checked in',
  'admin.stats.revenue': 'Revenue (paid)',
  'admin.inventory.title': 'Seat status',
  'admin.orders.title': 'Orders',
  'admin.orders.search': 'Search name, email, code…',
  'admin.orders.confirm': 'Confirm payment',
  'admin.orders.cancel': 'Cancel',
  'admin.orders.edit': 'Edit details',
  'admin.orders.save': 'Save',
  'admin.orders.cancelEdit': 'Discard',
  'admin.orders.empty': 'No orders yet.',
  'admin.orders.exportParticipants': 'Export participants',
  'admin.orders.exportTransactions': 'Export transactions',
  'admin.settings.title': 'Ticket settings',
  'admin.settings.price': 'Price (IDR)',
  'admin.settings.quota': 'Quota',
  'admin.settings.salesOpen': 'Sales open',
  'admin.settings.save': 'Save',
  'admin.settings.saved': 'Saved',
  'admin.statusPaid': 'Paid',
  'admin.statusCancelled': 'Cancelled',
  'admin.checkin.title': 'Check-in',
  'admin.checkin.sub': 'Scan a participant e-ticket QR.',
  'admin.checkin.start': 'Start camera',
  'admin.checkin.stop': 'Stop camera',
  'admin.checkin.manual': 'Manual code (QR payload)',
  'admin.checkin.check': 'Validate',
  'admin.checkin.valid': 'VALID — welcome in',
  'admin.checkin.already': 'ALREADY USED',
  'admin.checkin.invalid': 'INVALID',
  'admin.checkin.recent': 'Recent scans',
  'admin.checkin.seat': 'Seat',

  'status.available': 'Available',
  'status.held': 'Held',
  'status.sold': 'Sold',
}

const dictionaries: Record<Lang, Record<DictKey, string>> = { id, en }

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({ lang: 'id', setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id')

  useEffect(() => {
    const stored = window.localStorage.getItem('pataka-lang')
    if (stored === 'id' || stored === 'en') setLangState(stored)
  }, [])

  const setLang = (next: Lang) => {
    setLangState(next)
    window.localStorage.setItem('pataka-lang', next)
    document.documentElement.lang = next
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  const { lang } = useLang()
  return (key: DictKey) => dictionaries[lang][key] ?? dictionaries.id[key] ?? key
}
