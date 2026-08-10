// ===== Sheets API client — call Apps Script Web App =====
//
// Apps Script Web App paling reliable via GET (POST sering diabaikan / 411).
// Jadi SEMUA operasi (baca/tulis/update/delete) pakai GET dengan parameter URL.
// Payload besar (data order) di-encode sebagai JSON di query string ?data=...

import type { Order, OrderOption } from "@/types";

/** Ambil base URL Apps Script dari env (tanpa trailing slash). */
function baseUrl(): string {
  const url = process.env.SHEETS_API_URL;
  if (!url) {
    throw new Error(
      "[sheets] SHEETS_API_URL belum diset. Set di .env.local atau Vercel dashboard.",
    );
  }
  return url.replace(/\/$/, "");
}

/** Token opsional (kalau di-set di Script Properties Apps Script). */
function token(): string {
  return process.env.SHEETS_API_TOKEN || "";
}

/**
 * Raw call ke Apps Script. Selalu GET.
 * Params dikirim sebagai query string.
 */
async function callApi(params: Record<string, string | number | undefined>): Promise<unknown> {
  const url = new URL(baseUrl());
  const t = token();
  if (t) url.searchParams.set("token", t);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
    // Apps Script kadang lambat di cold start.
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[sheets] HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json && typeof json === "object" && "error" in json) {
    throw new Error(`[sheets] ${json.error}`);
  }
  return json;
}

/** ===== HIGH-LEVEL METHODS ===== */

/** Ambil semua order. */
export async function getAllOrders(): Promise<Order[]> {
  const data = (await callApi({ action: "getAll" })) as Order[];
  return Array.isArray(data) ? data : [];
}

/** Ambil 1 order by sheet row index. */
export async function getOrderByRowIndex(rowIndex: number): Promise<Order | null> {
  const data = (await callApi({ action: "getOne", row: rowIndex })) as Order | null;
  return data ?? null;
}

/** Tambah order baru. Return rowIndex baru. */
export async function appendOrder(input: Partial<Order>): Promise<number> {
  const data = (await callApi({
    action: "append",
    data: JSON.stringify(input),
  })) as { rowIndex: number };
  return data.rowIndex;
}

/** Update order by rowIndex. */
export async function updateOrder(rowIndex: number, input: Partial<Order>): Promise<boolean> {
  const data = (await callApi({
    action: "update",
    row: rowIndex,
    data: JSON.stringify(input),
  })) as { ok: boolean };
  return data.ok === true;
}

/** Hapus order by rowIndex. */
export async function deleteOrder(rowIndex: number): Promise<boolean> {
  const data = (await callApi({ action: "delete", row: rowIndex })) as { ok: boolean };
  return data.ok === true;
}

/** Ambil nilai unik untuk autocomplete. */
export async function getUniqueValues(): Promise<{
  event: string[];
  brand: string[];
  artikel: string[];
  metode_pembayaran: string[];
}> {
  const data = (await callApi({ action: "unique" })) as {
    event: string[];
    brand: string[];
    artikel: string[];
    metode_pembayaran: string[];
  };
  return data ?? { event: [], brand: [], artikel: [], metode_pembayaran: [] };
}

/** Buat option label untuk dropdown pilih order. */
export function toOrderOptions(orders: Order[]): OrderOption[] {
  return orders.map((o) => ({
    id: o.sheetRowIndex,
    label: `${[o.event, o.nama, o.artikel].filter(Boolean).join(" — ")} (Rp${new Intl.NumberFormat(
      "id-ID",
    ).format(Number(o.harga_cust ?? 0))})`,
  }));
}
