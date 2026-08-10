"use client";

// ===== OrdersTable — tabel rekap + filter + pagination =====
// Kolom "No" (kolom A sheet) TIDAK ditampilkan.
// Tombol Edit → /edit/[rowIndex] (rowIndex = baris asli di sheet).

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import type { Order } from "@/types";

interface Props {
  orders: Order[];
  events: string[];
}

const PAGE_SIZE = 20;

export default function OrdersTable({ orders, events }: Props) {
  const [q, setQ] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return orders.filter((o) => {
      if (filterEvent && o.event !== filterEvent) return false;
      if (filterStatus && o.status_pesanan !== filterStatus) return false;
      if (!ql) return true;
      return [o.nama, o.brand, o.artikel, o.event].some((v) =>
        v?.toLowerCase().includes(ql),
      );
    });
  }, [orders, q, filterEvent, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages - 1);
  const slice = filtered.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const statusOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.status_pesanan))).filter(Boolean),
    [orders],
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Cari nama/brand/artikel..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          className="flex-1 min-w-[200px] rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />
        <select
          value={filterEvent}
          onChange={(e) => {
            setFilterEvent(e.target.value);
            setPage(0);
          }}
          className="rounded border border-slate-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">Semua Event</option>
          {events.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
          className="rounded border border-slate-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">Semua Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-brand-slate">
        Menampilkan {slice.length} dari {filtered.length} order
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-navy text-white">
            <tr>
              {["Event", "Nama", "Artikel", "Harga Cust", "Total Fee", "Status Pesanan", "Status Bayar", "Aksi"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-brand-slate">
                  Belum ada data order.
                </td>
              </tr>
            ) : (
              slice.map((o) => (
                <tr key={o.sheetRowIndex} className="border-t border-slate-100 hover:bg-brand-light">
                  <td className="px-3 py-2">{o.event}</td>
                  <td className="px-3 py-2 font-medium">{o.nama}</td>
                  <td className="px-3 py-2 text-brand-slate">
                    {[o.artikel, o.warna_tipe, o.ukuran].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatRupiah(Number(o.harga_cust))}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold">{formatRupiah(Number(o.total_fee))}</td>
                  <td className="px-3 py-2">
                    <StatusBadge value={o.status_pesanan} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge value={o.status_pembayaran} variant="payment" />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      href={`/edit/${o.sheetRowIndex}`}
                      className="rounded bg-brand-blue px-2 py-1 text-xs font-medium text-white hover:bg-brand-navy"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={cur === 0}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            ‹ Prev
          </button>
          <span className="text-sm text-brand-slate">
            Hal {cur + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={cur >= totalPages - 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  value,
  variant = "order",
}: {
  value: string;
  variant?: "order" | "payment";
}) {
  const colorMap: Record<string, string> = variant === "order"
    ? {
        "Fix Order": "bg-blue-100 text-blue-800",
        "Sudah Dibeli": "bg-indigo-100 text-indigo-800",
        "Tidak Dapat": "bg-red-100 text-red-800",
        Packing: "bg-yellow-100 text-yellow-800",
        Pengiriman: "bg-purple-100 text-purple-800",
        Complete: "bg-green-100 text-green-800",
      }
    : {
        "Not Yet": "bg-red-100 text-red-800",
        Invoicing: "bg-yellow-100 text-yellow-800",
        Complete: "bg-green-100 text-green-800",
      };
  const cls = colorMap[value] ?? "bg-slate-100 text-slate-700";
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{value}</span>;
}
