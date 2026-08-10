// ===== GET /api/orders (list) + POST /api/orders (create) =====

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { orderInputSchema } from "@/lib/validators";
import { calcBaseFee, calcAddFee, calcTotalFee, calcProfit } from "@/lib/feeRules";
import type { Order, OrderOption, SafeUser } from "@/types";

// ===== GET: ambil semua order (atau filter) =====
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const event = searchParams.get("event");
  const nama = searchParams.get("nama");
  const status = searchParams.get("status");

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (event) {
    params.push(event);
    conditions.push(`event = $${params.length}`);
  }
  if (nama) {
    params.push(`%${nama}%`);
    conditions.push(`nama ILIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status_pesanan = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<Order>(
    `SELECT id, event, nama, brand, artikel, warna_tipe, ukuran, jumlah,
            harga_cust, harga_asli, profit, fee, add_fee, total_fee,
            status_pesanan, status_pembayaran, metode_pembayaran, ditalangi_oleh,
            fee_override, add_fee_override, created_by, created_at, updated_at
       FROM orders ${where}
       ORDER BY created_at DESC, id DESC`,
    params,
  );

  // Hanya kembalikan id internal untuk dropdown bila diminta via ?options=1
  const onlyOptions = searchParams.get("options") === "1";
  if (onlyOptions) {
    const opts: OrderOption[] = rows.map((r) => ({
      id: r.id,
      label: `${[r.event, r.nama, r.artikel].filter(Boolean).join(" — ")} (Rp${new Intl.NumberFormat("id-ID").format(Number(r.harga_cust))})`,
    }));
    return NextResponse.json(opts);
  }

  return NextResponse.json(rows);
}

// ===== POST: tambah order baru =====
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = session.user as SafeUser;

  try {
    const body = await req.json();
    const parsed = orderInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
        { status: 400 },
      );
    }
    const input = parsed.data;

    // Re-calc fee di server (anti-manipulasi client), KECUALI admin override aktif.
    let fee = input.fee;
    let addFee = input.add_fee;
    if (!input.fee_override) {
      fee = calcBaseFee(Number(input.harga_cust));
    }
    if (!input.add_fee_override) {
      addFee = calcAddFee({
        flashsale: false,
        barangBesar: false,
        barangBesarNominal: 0,
      });
    }
    const totalFee = calcTotalFee(fee, addFee);
    const profit = calcProfit(Number(input.harga_cust), input.harga_asli);

    const rows = await query<{ id: number }>(
      `INSERT INTO orders (
         event, nama, brand, artikel, warna_tipe, ukuran, jumlah,
         harga_cust, harga_asli, profit, fee, add_fee, total_fee,
         status_pesanan, status_pembayaran, metode_pembayaran, ditalangi_oleh,
         fee_override, add_fee_override, created_by, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW())
       RETURNING id`,
      [
        input.event,
        input.nama,
        input.brand ?? null,
        input.artikel ?? null,
        input.warna_tipe ?? null,
        input.ukuran ?? null,
        input.jumlah,
        Number(input.harga_cust),
        input.harga_asli != null ? Number(input.harga_asli) : null,
        profit,
        fee,
        addFee,
        totalFee,
        input.status_pesanan,
        input.status_pembayaran,
        input.metode_pembayaran ?? null,
        input.ditalangi_oleh ?? null,
        input.fee_override,
        input.add_fee_override,
        admin.nama,
      ],
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error("[orders POST] error:", err);
    return NextResponse.json({ error: "Gagal menyimpan order" }, { status: 500 });
  }
}
