// ===== Format helpers =====

/** Format angka ke Rupiah, contoh: 85000 → "Rp85.000". */
export function formatRupiah(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Rp0";
  return "Rp" + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

/** Format label untuk dropdown pilih order: "Event — Nama — Artikel (Rp85.000)". */
export function formatOrderLabel(opts: {
  event: string;
  nama: string;
  artikel?: string | null;
  harga_cust: number;
}): string {
  const parts = [opts.event, opts.nama];
  if (opts.artikel) parts.push(opts.artikel);
  return `${parts.join(" — ")} (${formatRupiah(opts.harga_cust)})`;
}

/** Parse string angka dari input form (handle koma/pemisah ribuan). */
export function parseNumber(input: string | number): number {
  if (typeof input === "number") return input;
  const cleaned = String(input).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
