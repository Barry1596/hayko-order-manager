// ===== GET/PUT/DELETE /api/orders/[id] =====

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { query } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { orderInputSchema } from "@/lib/validators";
import { calcBaseFee, calcTotalFee, calcProfit } from "@/lib/feeRules";
import type { Order, SafeUser } from "@/types";

// ===== GET single order (untuk prefill form edit) =====
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const rows = await query<Order>(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

// ===== PUT: update order =====
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = session.user as SafeUser;
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

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

    // Re-calc di server jika tidak override
    let fee = input.fee;
    if (!input.fee_override) fee = calcBaseFee(Number(input.harga_cust));
    const totalFee = calcTotalFee(fee, input.add_fee);
    const profit = calcProfit(Number(input.harga_cust), input.harga_asli);

    const rows = await query<{ id: number }>(
      `UPDATE orders SET
         event=$1, nama=$2, brand=$3, artikel=$4, warna_tipe=$5, ukuran=$6, jumlah=$7,
         harga_cust=$8, harga_asli=$9, profit=$10, fee=$11, add_fee=$12, total_fee=$13,
         status_pesanan=$14, status_pembayaran=$15, metode_pembayaran=$16, ditalangi_oleh=$17,
         fee_override=$18, add_fee_override=$19, created_by=$20, updated_at=NOW()
       WHERE id=$21 RETURNING id`,
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
        input.add_fee,
        totalFee,
        input.status_pesanan,
        input.status_pembayaran,
        input.metode_pembayaran ?? null,
        input.ditalangi_oleh ?? null,
        input.fee_override,
        input.add_fee_override,
        admin.nama,
        id,
      ],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[orders PUT] error:", err);
    return NextResponse.json({ error: "Gagal update order" }, { status: 500 });
  }
}

// ===== DELETE: hapus order =====
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }
  const rows = await query<{ id: number }>(`DELETE FROM orders WHERE id=$1 RETURNING id`, [id]);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id });
}
