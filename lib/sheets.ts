// ===== Sheets API client — call Apps Script Web App =====
//
// SEMUA operasi via GET. Untuk tulis (append/update), field order dikirim
// sebagai parameter URL individual (event=X&nama=Y&...) — BUKAN JSON.
// Google memblokir parameter "data" berisi JSON (dianggap konten sensitif).

import type { Order, OrderOption } from "@/types";

function baseUrl(): string {
  const url = process.env.SHEETS_API_URL;
  if (!url) {
    throw new Error(
      "[sheets] SHEETS_API_URL belum diset. Set di .env.local atau Vercel dashboard.",
    );
  }
  return url.replace(/\/$/, "");
}

function token(): string {
  return process.env.SHEETS_API_TOKEN || "";
}

/** Field yang bisa dikirim sebagai parameter URL untuk append/update. */
const ORDER_FIELDS: (keyof Order)[] = [
  "event", "nama", "brand", "artikel", "warna_tipe", "ukuran", "jumlah",
  "harga_cust", "harga_asli", "profit", "fee", "add_fee", "total_fee",
  "status_pesanan", "status_pembayaran", "metode_pembayaran", "ditalangi_oleh",
];

/** Bangun URL dengan parameter untuk action tertentu. */
function buildUrl(
  action: string,
  opts?: { row?: number; data?: Partial<Order> },
): string {
  const url = new URL(baseUrl());
  url.searchParams.set("action", action);
  const t = token();
  if (t) url.searchParams.set("token", t);
  if (opts?.row !== undefined) url.searchParams.set("row", String(opts.row));
  if (opts?.data) {
    for (const field of ORDER_FIELDS) {
      const v = opts.data[field];
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(field, String(v));
      }
    }
  }
  return url.toString();
}

/** GET request generic. */
async function callApi(
  action: string,
  opts?: { row?: number; data?: Partial<Order> },
): Promise<unknown> {
  const res = await fetch(buildUrl(action, opts), {
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
  const data = (await callApi("getAll")) as Order[];
  return Array.isArray(data) ? data : [];
}

export async function getOrderByRowIndex(rowIndex: number): Promise<Order | null> {
  const data = (await callApi("getOne", { row: rowIndex })) as Order | null;
  return data ?? null;
}

export async function appendOrder(input: Partial<Order>): Promise<number> {
  const data = (await callApi("append", { data: input })) as { rowIndex: number };
  return data.rowIndex;
}

export async function updateOrder(rowIndex: number, input: Partial<Order>): Promise<boolean> {
  const data = (await callApi("update", { row: rowIndex, data: input })) as { ok: boolean };
  return data.ok === true;
}

export async function deleteOrder(rowIndex: number): Promise<boolean> {
  const data = (await callApi("delete", { row: rowIndex })) as { ok: boolean };
  return data.ok === true;
}

export async function getUniqueValues(): Promise<{
  event: string[];
  brand: string[];
  artikel: string[];
  metode_pembayaran: string[];
}> {
  const data = (await callApi("unique")) as {
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
