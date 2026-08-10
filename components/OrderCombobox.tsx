"use client";

// ===== OrderCombobox — autocomplete untuk Event / Brand / Artikel =====
// Bisa diketik bebas (value baru) atau pilih dari suggestion yang sudah ada.
//
// Props:
//   - value: nilai saat ini (controlled)
//   - onChange: callback saat nilai berubah
//   - options: array string nilai unik untuk suggestion
//   - label: teks label field

import { useId, useMemo, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
  placeholder?: string;
  required?: boolean;
}

export default function OrderCombobox({
  value,
  onChange,
  options,
  label,
  placeholder,
  required,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 50);
  }, [options, query]);

  return (
    <div ref={ref} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-brand-slate mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type="text"
        value={open ? query : value}
        placeholder={placeholder ?? `Ketik atau pilih ${label.toLowerCase()}`}
        required={required}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none"
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded border border-slate-200 bg-white shadow-lg">
          {filtered.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(opt);
                  setQuery(opt);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-brand-light"
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
