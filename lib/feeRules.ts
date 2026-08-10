// ===== Logika Perhitungan Fee — PURE FUNCTION =====
// Dipakai baik di client (live preview) maupun server (re-validate sebelum save).
// Asumsi default (TANDAI TODO di README — perlu konfirmasi pemilik bisnis):
//   1. Harga Cust = TOTAL per-baris (bukan per-unit)
//   2. Fee >600K = MAX(25.000, 5% × harga) — pilih yang lebih besar
//   3. Profit & Total Fee dihitung ulang oleh app (tidak replikasi formula sheet)

import type { AddFeeOptions } from "@/types";

/**
 * Tabel Fee dasar (kolom L) berdasarkan Harga Barang = Harga Cust.
 * Tier terakhir (max: Infinity) dihitung dynamic: MAX(25K, 5%).
 */
export const FEE_TABLE: { max: number; fee: number | null }[] = [
  { max: 30_000, fee: 3_000 },
  { max: 70_000, fee: 5_000 },
  { max: 120_000, fee: 7_000 },
  { max: 250_000, fee: 10_000 },
  { max: 400_000, fee: 15_000 },
  { max: 600_000, fee: 20_000 },
  { max: Infinity, fee: null }, // >600K: dynamic
];

/** Konstanta untuk tier >600K — mudah diubah kalau pemilik bisnis klarifikasi. */
export const FEE_ABOVE_600K = {
  MIN_FLAT: 25_000, // pilihan flat
  PERCENT_RATE: 0.05, // pilihan persen (5%)
};

/**
 * Hitung Fee dasar dari harga barang.
 * - Tier ≤600K: pakai nilai tetap dari FEE_TABLE.
 * - Tier >600K: MAX(25.000, 5% × harga).
 */
export function calcBaseFee(harga: number): number {
  if (!Number.isFinite(harga) || harga <= 0) return 0;
  for (const tier of FEE_TABLE) {
    if (harga <= tier.max) {
      if (tier.fee !== null) return tier.fee;
      return Math.max(
        FEE_ABOVE_600K.MIN_FLAT,
        Math.round(harga * FEE_ABOVE_600K.PERCENT_RATE),
      );
    }
  }
  return Math.max(
    FEE_ABOVE_600K.MIN_FLAT,
    Math.round(harga * FEE_ABOVE_600K.PERCENT_RATE),
  );
}

/**
 * Hitung Add Fee (kolom M).
 * - Flashsale/bundling: +3.000 (nilai tetap)
 * - Barang besar/berat/fragile: +nominal manual (5.000–15.000)
 * - Bisa digabung keduanya (dijumlah).
 */
export function calcAddFee(opts: AddFeeOptions): number {
  let add = 0;
  if (opts.flashsale) add += 3_000;
  if (opts.barangBesar && opts.barangBesarNominal && opts.barangBesarNominal > 0) {
    add += opts.barangBesarNominal;
  }
  return add;
}

/**
 * Hitung Total Fee (kolom N) = Fee + Add Fee.
 */
export function calcTotalFee(fee: number, addFee: number): number {
  return fee + addFee;
}

/**
 * Hitung Profit (kolom K) = Harga Cust − Harga Asli.
 */
export function calcProfit(hargaCust: number, hargaAsli?: number | null): number | null {
  if (hargaAsli == null || !Number.isFinite(hargaAsli)) return null;
  return hargaCust - hargaAsli;
}

/** Validasi nominal barang besar (warning-only, tidak block submit). */
export const BARANG_BESAR_RANGE = { MIN: 5_000, MAX: 15_000 };
export function isBarangBesarNominalValid(nominal: number): boolean {
  return nominal >= BARANG_BESAR_RANGE.MIN && nominal <= BARANG_BESAR_RANGE.MAX;
}
