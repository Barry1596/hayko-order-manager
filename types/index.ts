// ===== Type definitions untuk Hayko Order Manager =====
// Arsitektur: data tersimpan di Google Sheets via Apps Script.
// Identifikasi baris pakai `sheetRowIndex` (nomor baris asli di sheet, 1-based).

/** Order (1 baris di tab "Rekap Pesanan"). */
export interface Order {
  sheetRowIndex: number; // nomor baris asli di sheet (1-based, dipakai sebagai id)
  no?: number | string;  // kolom A — internal, TIDAK ditampilkan ke user
  event: string;         // B
  nama: string;          // C
  brand?: string;        // D
  artikel?: string;      // E
  warna_tipe?: string;   // F
  ukuran?: string;       // G
  jumlah: number;        // H
  harga_cust: number;    // I
  harga_asli?: number;   // J
  profit?: number;       // K
  fee: number;           // L
  add_fee: number;       // M
  total_fee: number;     // N
  status_pesanan: string;     // O
  status_pembayaran: string;  // P
  metode_pembayaran?: string; // Q
  ditalangi_oleh?: string;    // R
  fee_override?: boolean;
  add_fee_override?: boolean;
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
  id: number; // = sheetRowIndex
  label: string; // Format: "Event — Nama — Artikel (Rp85.000)"
}

/** User admin (dari env var). */
export interface SafeUser {
  username: string;
  nama: string;
}
