"use client";

// ===== DeleteOrder — panel pilih order via dropdown + preview + konfirmasi hapus =====
// Spec Section 6.4: wajib pilih dari data existing, preview sebelum hapus.
// Identifikasi baris pakai sheetRowIndex (bukan kolom "No").

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderDropdown from "./OrderDropdown";
import type { Order, OrderOption } from "@/types";
import { formatRupiah } from "@/lib/format";

export default function DeleteOrder({ options }: { options: OrderOption[] }) {
  const router = useRouter();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function onSelect(rowIndex: number) {
    setSelectedRowIndex(rowIndex);
    setPreview(null);
    setError(null);
    setConfirming(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${rowIndex}`);
      if (!res.ok) throw new Error("Gagal ambil data");
      const j: Order = await res.json();
      setPreview(j);
    } catch {
      setError("Tidak bisa memuat data order.");
    } finally {
      setLoading(false);
    }
  }

  async function doDelete() {
    if (selectedRowIndex == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${selectedRowIndex}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Gagal menghapus");
      }
      router.refresh();
      setPreview(null);
      setSelectedRowIndex(null);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="text-sm font-semibold text-brand-navy">Hapus Order</div>
      <p className="text-xs text-brand-slate">
        Pilih order dari daftar untuk menghindari salah hapus. Setelah dipilih, data akan ditampilkan untuk konfirmasi.
      </p>
      <OrderDropdown options={options} onSelect={onSelect} placeholder="Cari & pilih order untuk dihapus..." />

      {loading && <p className="text-xs text-brand-slate">Memuat data...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {preview && !confirming && (
        <div className="rounded border border-slate-200 bg-brand-light p-3 text-sm space-y-1">
          <PreviewData order={preview} />
          <button
            onClick={() => setConfirming(true)}
            className="mt-2 rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Lanjut hapus
          </button>
        </div>
      )}

      {preview && confirming && (
        <div className="rounded border-2 border-red-300 bg-red-50 p-3 text-sm space-y-2">
          <p className="font-semibold text-red-700">
            ⚠️ Yakin hapus order ini? Aksi ini permanen dan tidak bisa dibatalkan.
          </p>
          <PreviewData order={preview} />
          <div className="flex gap-2">
            <button
              onClick={doDelete}
              disabled={loading}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Menghapus..." : "Ya, hapus data ini"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded border px-3 py-1.5 text-xs"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewData({ order }: { order: Order }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <dt className="text-brand-slate">Event</dt><dd>{order.event}</dd>
      <dt className="text-brand-slate">Nama</dt><dd>{order.nama}</dd>
      <dt className="text-brand-slate">Artikel</dt><dd>{order.artikel ?? "—"}</dd>
      <dt className="text-brand-slate">Harga Cust</dt><dd>{formatRupiah(Number(order.harga_cust))}</dd>
      <dt className="text-brand-slate">Total Fee</dt><dd>{formatRupiah(Number(order.total_fee))}</dd>
      <dt className="text-brand-slate">Status</dt><dd>{order.status_pesanan}</dd>
    </dl>
  );
}
