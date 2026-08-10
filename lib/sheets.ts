// ===== Sheets API client — call Apps Script Web App =====
//
// Apps Script Web App punya keterbatasan HTTP method:
//   - GET  bisa via URL params
//   - POST bisa via body
//   - PUT/DELETE di-redirect ke GET oleh Google (302) → tidak reliable.
//
// Solusi: kita pakai POST untuk SEMUA operasi, dengan field `method` di body
// untuk membedakan aksi (get/getAll/update/delete/append).
// Apps Script akan dispatch berdasarkan body.method.

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

/** Raw call ke Apps Script. Selalu POST. */
async function callApi(payload: Record<string, unknown>): Promise<unknown> {
  const url = baseUrl();
  const body: Record<string, unknown> = { ...payload };
  const t = token();
  if (t) body.token = t;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Apps Script sering redirect; ikuti redirect.
    redirect: "follow",
    // Cache: tidak pernah cache hasil API.
    cache: "no-store",
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
  const data = (await callApi({ method: "getAll" })) as Order[];
  return Array.isArray(data) ? data : [];
}

/** Ambil 1 order by sheet row index. */
export async function getOrderByRowIndex(rowIndex: number): Promise<Order | null> {
  const data = (await callApi({ method: "getOne", rowIndex })) as Order | null;
  return data ?? null;
}

/** Tambah order baru. Return rowIndex baru. */
export async function appendOrder(input: Partial<Order>): Promise<number> {
  const data = (await callApi({ method: "append", data: input })) as { rowIndex: number };
  return data.rowIndex;
}

/** Update order by rowIndex. */
export async function updateOrder(rowIndex: number, input: Partial<Order>): Promise<boolean> {
  const data = (await callApi({ method: "update", rowIndex, data: input })) as { ok: boolean };
  return data.ok === true;
}

/** Hapus order by rowIndex. */
export async function deleteOrder(rowIndex: number): Promise<boolean> {
  const data = (await callApi({ method: "delete", rowIndex })) as { ok: boolean };
  return data.ok === true;
}

/** Ambil nilai unik untuk autocomplete. */
export async function getUniqueValues(): Promise<{
  event: string[];
  brand: string[];
  artikel: string[];
  metode_pembayaran: string[];
}> {
  const data = (await callApi({ method: "unique" })) as {
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
