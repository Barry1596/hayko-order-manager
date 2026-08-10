"use client";

// ===== OrderForm — form reusable untuk /input (create) & /edit/[id] (update) =====
//
// Props:
//   - initial: data existing (mode edit), atau undefined (mode input)
//   - suggestions: nilai unik untuk autocomplete Event/Brand/Artikel
//   - submitUrl: endpoint tujuan (POST /api/orders atau PUT /api/orders/[id])
//
// Fitur:
//   - Fee & Add Fee auto-calc real-time via lib/feeRules
//   - Toggle "Edit manual" untuk override Fee & Add Fee (border kuning)
//   - Flashsale checkbox (+3.000) + Barang Besar checkbox (nominal 5–15K)
//   - Server re-validate ulang saat submit (tidak percaya client)

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OrderCombobox from "./OrderCombobox";
import FeePreview from "./FeePreview";
import { parseNumber } from "@/lib/format";
import {
  calcBaseFee,
  calcAddFee,
  calcTotalFee,
  BARANG_BESAR_RANGE,
  isBarangBesarNominalValid,
} from "@/lib/feeRules";
import {
  STATUS_PESANAN_OPTIONS,
  STATUS_PEMBAYARAN_OPTIONS,
} from "@/lib/validators";
import type { Order } from "@/types";

interface Props {
  initial?: Order;
  suggestions: {
    event: string[];
    brand: string[];
    artikel: string[];
    metodePembayaran: string[];
  };
  submitUrl: string;
  method: "POST" | "PUT";
}

export default function OrderForm({ initial, suggestions, submitUrl, method }: Props) {
  const router = useRouter();

  const [form, setForm] = useState({
    event: initial?.event ?? "",
    nama: initial?.nama ?? "",
    brand: initial?.brand ?? "",
    artikel: initial?.artikel ?? "",
    warna_tipe: initial?.warna_tipe ?? "",
    ukuran: initial?.ukuran ?? "",
    jumlah: initial?.jumlah ?? 1,
    harga_cust: initial?.harga_cust?.toString() ?? "",
    harga_asli: initial?.harga_asli?.toString() ?? "",
    status_pesanan: initial?.status_pesanan ?? "Fix Order",
    status_pembayaran: initial?.status_pembayaran ?? "Not Yet",
    metode_pembayaran: initial?.metode_pembayaran ?? "",
    ditalangi_oleh: initial?.ditalangi_oleh ?? "",
  });

  // Fee-related state
  const [feeOverride, setFeeOverride] = useState(initial?.fee_override ?? false);
  const [manualFee, setManualFee] = useState(initial?.fee?.toString() ?? "0");
  const [addFeeOverride, setAddFeeOverride] = useState(initial?.add_fee_override ?? false);
  const [manualAddFee, setManualAddFee] = useState(initial?.add_fee?.toString() ?? "0");

  const [flashsale, setFlashsale] = useState(false);
  const [barangBesar, setBarangBesar] = useState(false);
  const [barangBesarNominal, setBarangBesarNominal] = useState(
    BARANG_BESAR_RANGE.MIN.toString(),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== Computed fee (live) =====
  const hargaCust = parseNumber(form.harga_cust);
  const autoFee = useMemo(() => calcBaseFee(hargaCust), [hargaCust]);
  const fee = feeOverride ? parseNumber(manualFee) : autoFee;

  const autoAddFee = useMemo(() => {
    if (addFeeOverride) return parseNumber(manualAddFee);
    return calcAddFee({
      flashsale,
      barangBesar,
      barangBesarNominal: parseNumber(barangBesarNominal),
    });
  }, [addFeeOverride, manualAddFee, flashsale, barangBesar, barangBesarNominal]);

  const totalFee = calcTotalFee(fee, autoAddFee);

  function setField<K extends keyof typeof form>(key: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        jumlah: parseNumber(form.jumlah),
        harga_cust: parseNumber(form.harga_cust),
        harga_asli: form.harga_asli ? parseNumber(form.harga_asli) : null,
        fee: feeOverride ? parseNumber(manualFee) : autoFee,
        add_fee: addFeeOverride ? parseNumber(manualAddFee) : autoAddFee,
        fee_override: feeOverride,
        add_fee_override: addFeeOverride,
      };
      const res = await fetch(submitUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Gagal (${res.status})`);
      }
      router.push("/rekap");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi error");
    } finally {
      setSubmitting(false);
    }
  }

  const nominalWarn =
    barangBesar && !isBarangBesarNominalValid(parseNumber(barangBesarNominal));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ===== Section: Info Pesanan ===== */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-2 text-sm font-semibold text-brand-navy">Info Pesanan</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OrderCombobox
            label="Event"
            value={form.event}
            onChange={(v) => setField("event", v)}
            options={suggestions.event}
            required
          />
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">
              Nama Customer <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setField("nama", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <OrderCombobox
            label="Brand"
            value={form.brand}
            onChange={(v) => setField("brand", v)}
            options={suggestions.brand}
          />
          <OrderCombobox
            label="Artikel"
            value={form.artikel}
            onChange={(v) => setField("artikel", v)}
            options={suggestions.artikel}
          />
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Warna/Tipe</label>
            <input
              type="text"
              value={form.warna_tipe}
              onChange={(e) => setField("warna_tipe", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Ukuran</label>
            <input
              type="text"
              value={form.ukuran}
              onChange={(e) => setField("ukuran", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">
              Jumlah <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={form.jumlah}
              onChange={(e) => setField("jumlah", parseNumber(e.target.value))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">
              Harga Cust <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step="any"
              required
              value={form.harga_cust}
              onChange={(e) => setField("harga_cust", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Harga Asli</label>
            <input
              type="number"
              min={0}
              step="any"
              value={form.harga_asli}
              onChange={(e) => setField("harga_asli", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
      </fieldset>

      {/* ===== Section: Fee ===== */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-2 text-sm font-semibold text-brand-navy">Fee & Tambahan</legend>

        {/* Toggle override Fee */}
        <div className={`rounded p-3 ${feeOverride ? "bg-yellow-50 ring-1 ring-yellow-300" : ""}`}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={feeOverride}
              onChange={(e) => setFeeOverride(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="font-medium">Edit manual Fee (override auto-calc)</span>
          </label>
          {feeOverride ? (
            <div className="mt-2">
              <label className="block text-xs text-brand-slate mb-1">Fee manual (Rp)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={manualFee}
                onChange={(e) => setManualFee(e.target.value)}
                className="w-full rounded border-2 border-yellow-400 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>
          ) : (
            <div className="mt-1 text-xs text-brand-slate">
              Fee otomatis dari Harga Cust: <strong>Rp{autoFee.toLocaleString("id-ID")}</strong>
            </div>
          )}
        </div>

        {/* Checkbox Add Fee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={flashsale}
                disabled={addFeeOverride}
                onChange={(e) => setFlashsale(e.target.checked)}
                className="h-4 w-4"
              />
              <span>Flashsale / bundling <span className="text-brand-slate">(+Rp3.000)</span></span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={barangBesar}
                disabled={addFeeOverride}
                onChange={(e) => {
                  setBarangBesar(e.target.checked);
                  if (!e.target.checked) setBarangBesarNominal(BARANG_BESAR_RANGE.MIN.toString());
                }}
                className="h-4 w-4"
              />
              <span>Barang besar / berat / fragile</span>
            </label>
            {barangBesar && !addFeeOverride && (
              <div className="mt-2">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={barangBesarNominal}
                  onChange={(e) => setBarangBesarNominal(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
                {nominalWarn && (
                  <span className="text-xs text-yellow-700">
                    ⚠️ Disarankan rentang Rp5.000–Rp15.000.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Toggle override Add Fee */}
        <div className={`rounded p-3 ${addFeeOverride ? "bg-yellow-50 ring-1 ring-yellow-300" : ""}`}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={addFeeOverride}
              onChange={(e) => {
                setAddFeeOverride(e.target.checked);
                if (e.target.checked) {
                  setFlashsale(false);
                  setBarangBesar(false);
                }
              }}
              className="h-4 w-4"
            />
            <span className="font-medium">Edit manual Add Fee (override auto-calc)</span>
          </label>
          {addFeeOverride && (
            <div className="mt-2">
              <label className="block text-xs text-brand-slate mb-1">Add Fee manual (Rp)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={manualAddFee}
                onChange={(e) => setManualAddFee(e.target.value)}
                className="w-full rounded border-2 border-yellow-400 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>
          )}
        </div>

        <FeePreview
          fee={fee}
          addFee={autoAddFee}
          totalFee={totalFee}
          feeOverride={feeOverride}
          addFeeOverride={addFeeOverride}
        />
      </fieldset>

      {/* ===== Section: Status ===== */}
      <fieldset className="space-y-4 rounded-lg border border-slate-200 p-4">
        <legend className="px-2 text-sm font-semibold text-brand-navy">Status</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Status Pesanan</label>
            <select
              value={form.status_pesanan}
              onChange={(e) => setField("status_pesanan", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            >
              {STATUS_PESANAN_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Status Pembayaran</label>
            <select
              value={form.status_pembayaran}
              onChange={(e) => setField("status_pembayaran", e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            >
              {STATUS_PEMBAYARAN_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OrderCombobox
            label="Metode Pembayaran"
            value={form.metode_pembayaran}
            onChange={(v) => setField("metode_pembayaran", v)}
            options={suggestions.metodePembayaran}
          />
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Ditalangi oleh</label>
            <input
              type="text"
              value={form.ditalangi_oleh}
              onChange={(e) => setField("ditalangi_oleh", e.target.value)}
              placeholder="mis. Hayfa, Kiko"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
      </fieldset>

      {/* ===== Submit ===== */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded px-4 py-2 text-sm font-medium text-brand-slate hover:bg-slate-100"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-brand-navy px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-50"
        >
          {submitting ? "Menyimpan..." : method === "POST" ? "Simpan Order" : "Update Order"}
        </button>
      </div>
    </form>
  );
}
