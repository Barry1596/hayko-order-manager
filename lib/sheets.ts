// ===== Sheets API client — call Apps Script Web App =====
//
// STRATEGI HTTP (hybrid):
//   - GET  untuk BACA (getAll, getOne, unique) — Apps Script doGet, payload kecil
//   - POST dengan Content-Type: text/plain untuk TULIS (append, update, delete)
//     Apps Script sering 411/reject application/json, tapi text/plain OK.
//
// Untuk tulis, body dikirim sebagai JSON string dengan Content-Type text/plain,
// dan Apps Script doPost akan parse body tsb.

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

/** GET request ke Apps Script (untuk baca). */
async function callGet(params: Record<string, string | number | undefined>): Promise<unknown> {
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
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[sheets GET] HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json && typeof json === "object" && "error" in json) {
    throw new Error(`[sheets] ${json.error}`);
  }
  return json;
}

/** POST request ke Apps Script (untuk tulis/update/delete).
 *  Body = JSON string, Content-Type: text/plain (syarat Apps Script). */
async function callPost(payload: Record<string, unknown>): Promise<unknown> {
  const url = new URL(baseUrl());
  const t = token();
  if (t) url.searchParams.set("token", t);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[sheets POST] HTTP ${res.status}: ${text.slice(0, 200)}`);
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
  const data = (await callGet({ action: "getAll" })) as Order[];
  return Array.isArray(data) ? data : [];
}

/** Ambil 1 order by sheet row index. */
export async function getOrderByRowIndex(rowIndex: number): Promise<Order | null> {
  const data = (await callGet({ action: "getOne", row: rowIndex })) as Order | null;
  return data ?? null;
}

/** Tambah order baru. Return rowIndex baru. */
export async function appendOrder(input: Partial<Order>): Promise<number> {
  const data = (await callPost({ action: "append", data: input })) as { rowIndex: number };
  return data.rowIndex;
}

/** Update order by rowIndex. */
export async function updateOrder(rowIndex: number, input: Partial<Order>): Promise<boolean> {
  const data = (await callPost({ action: "update", row: rowIndex, data: input })) as { ok: boolean };
  return data.ok === true;
}

/** Hapus order by rowIndex. */
export async function deleteOrder(rowIndex: number): Promise<boolean> {
  const data = (await callPost({ action: "delete", row: rowIndex })) as { ok: boolean };
  return data.ok === true;
}

/** Ambil nilai unik untuk autocomplete. */
export async function getUniqueValues(): Promise<{
  event: string[];
  brand: string[];
  artikel: string[];
  metode_pembayaran: string[];
}> {
  const data = (await callGet({ action: "unique" })) as {
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
