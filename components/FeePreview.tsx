"use client";

// ===== FeePreview — tampilan real-time hitungan Fee / Add Fee / Total Fee =====
// Read-only, hanya menampilkan angka hasil dari lib/feeRules.

import { formatRupiah } from "@/lib/format";

interface Props {
  fee: number;
  addFee: number;
  totalFee: number;
  feeOverride: boolean;
  addFeeOverride: boolean;
}

export default function FeePreview({ fee, addFee, totalFee, feeOverride, addFeeOverride }: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-brand-light p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-slate mb-2">
        Ringkasan Fee (otomatis)
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className={`rounded p-2 ${feeOverride ? "bg-yellow-100 ring-1 ring-yellow-400" : "bg-white"}`}>
          <div className="text-[11px] text-brand-slate">
            Fee {feeOverride && <span className="text-yellow-700 font-semibold">(manual)</span>}
          </div>
          <div className="text-sm font-bold text-brand-navy">{formatRupiah(fee)}</div>
        </div>
        <div className={`rounded p-2 ${addFeeOverride ? "bg-yellow-100 ring-1 ring-yellow-400" : "bg-white"}`}>
          <div className="text-[11px] text-brand-slate">
            Add Fee {addFeeOverride && <span className="text-yellow-700 font-semibold">(manual)</span>}
          </div>
          <div className="text-sm font-bold text-brand-navy">{formatRupiah(addFee)}</div>
        </div>
        <div className="rounded p-2 bg-brand-navy text-white">
          <div className="text-[11px] text-brand-light">Total Fee</div>
          <div className="text-sm font-bold">{formatRupiah(totalFee)}</div>
        </div>
      </div>
    </div>
  );
}
