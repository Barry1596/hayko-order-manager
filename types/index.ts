// ===== Type definitions untuk Hayko Order Manager =====

/** User admin (sesuai tabel `users` di Postgres). */
export interface User {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  created_at?: string;
}

/** Versi aman user (tanpa hash) untuk dikirim ke client / disimpan di session. */
export interface SafeUser {
  id: number;
  username: string;
  nama: string;
}

/** Satu baris pesanan (sesuai tabel `orders` di Postgres). */
export interface Order {
  id: number;
  event: string;
  nama: string;
  brand: string | null;
  artikel: string | null;
  warna_tipe: string | null;
  ukuran: string | null;
  jumlah: number;
  harga_cust: number;
  harga_asli: number | null;
  profit: number | null;
  fee: number;
  add_fee: number;
  total_fee: number;
  status_pesanan: string;
  status_pembayaran: string;
  metode_pembayaran: string | null;
  ditalangi_oleh: string | null;
  fee_override: boolean;
  add_fee_override: boolean;
  created_by: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Payload create/update order dari form client. */
export interface OrderInput {
  event: string;
  nama: string;
  brand?: string;
  artikel?: string;
  warna_tipe?: string;
  ukuran?: string;
  jumlah: number;
  harga_cust: number;
  harga_asli?: number;
  fee: number;
  add_fee: number;
  status_pesanan: string;
  status_pembayaran: string;
  metode_pembayaran?: string;
  ditalangi_oleh?: string;
  fee_override: boolean;
  add_fee_override: boolean;
}

/** Opsi-opsi untuk Add Fee (kolom M). */
export interface AddFeeOptions {
  flashsale: boolean;
  barangBesar: boolean;
  barangBesarNominal?: number;
}

/** Dropdown option untuk pilih order di halaman Edit/Delete. */
export interface OrderOption {
  id: number;
  label: string; // Format: "Event — Nama — Artikel (Rp85.000)"
}
