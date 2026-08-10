// ===== Sheets API client — call Apps Script Web App =====
//
// SEMUA operasi via GET (Apps Script Web App hanya reliable via GET).
// Untuk tulis (append/update), payload di-encode sebagai JSON di parameter
// ?data=... pada URL. Apps Script otomatis decode & JSON.parse.

import type { Order, OrderOption } from "@/types";

/** Ambil base URL Apps Script dari env. */
function baseUrl(): string {
  const url = process.env.SHEETS_API_URL;
  if (!url) {
    throw new Error(
      "[sheets] SHEETS_API_URL belum diset. Set di .env.local atau Vercel dashboard.",
    );
  }
  return url.replace(/\/$/, "");
}

/** Token opsional. */
function token(): string {
  return process.env.SHEETS_API_TOKEN || "";
}

/**
 * GET request ke Apps Script.
 * Params:
 *   - untuk baca: { action: "getAll" | "getOne" | "unique" }
 *   - untuk tulis: { action: "append" | "update" | "delete", row?, data? }
 *     data (object) akan di-JSON.stringify lalu di-set sebagai param "data".
 */
async function callApi(params: {
  action: string;
  row?: number;
  data?: unknown;
}): Promise<unknown> {
  const url = new URL(baseUrl());
  url.searchParams.set("action", params.action);
  const t = token();
  if (t) url.searchParams.set("token", t);
  if (params.row !== undefined) url.searchParams.set("row", String(params.row));
  if (params.data !== undefined) {
    url.searchParams.set("data", JSON.stringify(params.data));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
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

export async function getAllOrders(): Promise<Order[]> {
  const data = (await callApi({ action: "getAll" })) as Order[];
  return Array.isArray(data) ? data : [];
}

export async function getOrderByRowIndex(rowIndex: number): Promise<Order | null> {
  const data = (await callApi({ action: "getOne", row: rowIndex })) as Order | null;
  return data ?? null;
}

export async function appendOrder(input: Partial<Order>): Promise<number> {
  const data = (await callApi({ action: "append", data: input })) as { rowIndex: number };
  return data.rowIndex;
}

export async function updateOrder(rowIndex: number, input: Partial<Order>): Promise<boolean> {
  const data = (await callApi({ action: "update", row: rowIndex, data: input })) as { ok: boolean };
  return data.ok === true;
}

export async function deleteOrder(rowIndex: number): Promise<boolean> {
  const data = (await callApi({ action: "delete", row: rowIndex })) as { ok: boolean };
  return data.ok === true;
}

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

export function toOrderOptions(orders: Order[]): OrderOption[] {
  return orders.map((o) => ({
    id: o.sheetRowIndex,
    label: `${[o.event, o.nama, o.artikel].filter(Boolean).join(" — ")} (Rp${new Intl.NumberFormat(
      "id-ID",
    ).format(Number(o.harga_cust ?? 0))})`,
  }));
}
