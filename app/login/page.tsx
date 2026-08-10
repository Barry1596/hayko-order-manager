"use client";

// ===== /login — Sign In =====

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Username atau password salah.");
      return;
    }
    router.push("/rekap");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-brand-navy">Hayko Order Manager</h1>
          <p className="text-sm text-brand-slate mt-1">Masuk untuk mengelola pesanan</p>
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
            <label className="block text-sm font-medium text-brand-slate mb-1">Username</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-slate mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-center text-xs text-brand-slate mt-4">
          Login: <code className="bg-white px-1 rounded">Hayfa</code> /{" "}
          <code className="bg-white px-1 rounded">Kiko</code> — password{" "}
          <code className="bg-white px-1 rounded">hayko123</code>
        </p>
      </div>
    </div>
  );
}
