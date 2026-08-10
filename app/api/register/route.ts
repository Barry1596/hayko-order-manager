// ===== POST /api/register — daftar admin baru =====

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
        { status: 400 },
      );
    }

    const { username, password, nama } = parsed.data;

    // Cek duplikat
    const existing = await query("SELECT id FROM users WHERE username = $1", [username]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    }

    const hash = bcrypt.hashSync(password, 10);
    const rows = await query<{ id: number }>(
      `INSERT INTO users (username, password_hash, nama)
       VALUES ($1, $2, $3) RETURNING id`,
      [username, hash, nama],
    );

    return NextResponse.json({ id: rows[0].id, username, nama }, { status: 201 });
  } catch (err) {
    console.error("[register] error:", err);
    return NextResponse.json({ error: "Gagal mendaftar" }, { status: 500 });
  }
}
