"use client";

// ===== /register — Sign Up (daftar admin baru) =====

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "", nama: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error ?? "Gagal mendaftar");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-navy">Daftar Admin Baru</h1>
          <p className="text-sm text-brand-slate mt-1">Hayko Order Manager</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4"
        >
          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Username</label>
            <input
              type="text"
              required
              minLength={3}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
            <p className="text-xs text-brand-slate mt-1">Minimal 6 karakter.</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-50"
          >
            {loading ? "Mendaftarkan..." : "Daftar"}
          </button>

          <div className="text-center text-sm text-brand-slate">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-brand-blue font-medium hover:underline">
              Masuk
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
