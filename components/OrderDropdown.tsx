"use client";

// ===== OrderDropdown — searchable dropdown untuk pilih order (Edit/Delete) =====
// Wajib pilih dari data existing (tidak boleh ketik bebas).
// Setelah pilih, panggil onSelect dengan id order tsb.

import { useMemo, useState } from "react";
import type { OrderOption } from "@/types";

interface Props {
  options: OrderOption[];
  onSelect: (id: number) => void;
  placeholder?: string;
}

export default function OrderDropdown({ options, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options.slice(0, 100);
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 100);
  }, [options, query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Cari & pilih order..."}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-brand-slate">Tidak ada order cocok.</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(o.id);
                    setQuery(o.label);
                    setOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-brand-light"
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
