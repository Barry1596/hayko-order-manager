// ===== Database client wrapper (Vercel Postgres) =====
//
// Menggunakan @vercel/postgres Pool. Saat dev lokal tanpa POSTGRES_URL,
// fungsi akan throw error yang informatif supaya jelas env var belum diset.

import { Pool } from "@vercel/postgres";

let _pool: Pool | null = null;

/** Pool singleton — dibuat lazy saat pertama dipakai. */
export function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "[db] POSTGRES_URL belum diset. Set di .env.local (dev) atau Vercel dashboard (prod).",
    );
  }
  _pool = new Pool({ connectionString: url });
  return _pool;
}

/** Helper: jalankan query dengan error handling konsisten. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, params as never);
  return res.rows as T[];
}
