// ===== Zod schemas — validasi server-side =====

import { z } from "zod";

/** Opsi dropdown untuk Status Pesanan (kolom O). */
export const STATUS_PESANAN_OPTIONS = [
  "Fix Order",
  "Sudah Dibeli",
  "Tidak Dapat",
  "Packing",
  "Pengiriman",
  "Complete",
] as const;

/** Opsi dropdown untuk Status Pembayaran (kolom P). */
export const STATUS_PEMBAYARAN_OPTIONS = [
  "Not Yet",
  "Invoicing",
  "Complete",
] as const;

/** Schema untuk POST/PUT /api/orders. */
export const orderInputSchema = z.object({
  event: z.string().min(1, "Event wajib diisi"),
  nama: z.string().min(1, "Nama wajib diisi"),
  brand: z.string().optional().nullable(),
  artikel: z.string().optional().nullable(),
  warna_tipe: z.string().optional().nullable(),
  ukuran: z.string().optional().nullable(),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  harga_cust: z.coerce.number().min(0, "Harga Cust tidak boleh negatif"),
  harga_asli: z.coerce.number().min(0).optional().nullable(),
  fee: z.coerce.number().min(0),
  add_fee: z.coerce.number().min(0),
  status_pesanan: z.enum(STATUS_PESANAN_OPTIONS).default("Fix Order"),
  status_pembayaran: z.enum(STATUS_PEMBAYARAN_OPTIONS).default("Not Yet"),
  metode_pembayaran: z.string().optional().nullable(),
  ditalangi_oleh: z.string().optional().nullable(),
  fee_override: z.boolean().default(false),
  add_fee_override: z.boolean().default(false),
});

export type OrderInputSchema = z.infer<typeof orderInputSchema>;

/** Schema untuk login (Credentials Provider). */
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export type LoginSchema = z.infer<typeof loginSchema>;
