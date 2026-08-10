// ===== GET/PUT/DELETE /api/orders/[rowIndex] =====
//
// rowIndex = nomor baris asli di sheet (1-based, dari Apps Script).
// Bukan angka "No" (kolom A) — kolom A disembunyikan dari UI.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { orderInputSchema } from "@/lib/validators";
import { calcBaseFee, calcTotalFee, calcProfit } from "@/lib/feeRules";
import { getOrderByRowIndex, updateOrder, deleteOrder } from "@/lib/sheets";

// GET single order (untuk prefill form edit)
export async function GET(
  _req: Request,
  { params }: { params: { rowIndex: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rowIndex = Number(params.rowIndex);
  if (!Number.isFinite(rowIndex)) {
    return NextResponse.json({ error: "rowIndex tidak valid" }, { status: 400 });
  }
  const order = await getOrderByRowIndex(rowIndex);
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json(order);
}

// PUT: update order
export async function PUT(
  req: Request,
  { params }: { params: { rowIndex: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rowIndex = Number(params.rowIndex);
  if (!Number.isFinite(rowIndex)) {
    return NextResponse.json({ error: "rowIndex tidak valid" }, { status: 400 });
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

    const ok = await updateOrder(rowIndex, {
      event: input.event,
      nama: input.nama,
      brand: input.brand ?? "",
      artikel: input.artikel ?? "",
      warna_tipe: input.warna_tipe ?? "",
      ukuran: input.ukuran ?? "",
      jumlah: input.jumlah,
      harga_cust: Number(input.harga_cust),
      harga_asli: input.harga_asli != null ? Number(input.harga_asli) : undefined,
      profit: profit ?? 0,
      fee,
      add_fee: input.add_fee,
      total_fee: totalFee,
      status_pesanan: input.status_pesanan,
      status_pembayaran: input.status_pembayaran,
      metode_pembayaran: input.metode_pembayaran ?? "",
      ditalangi_oleh: input.ditalangi_oleh ?? "",
      fee_override: input.fee_override,
      add_fee_override: input.add_fee_override,
    });

    if (!ok) {
      return NextResponse.json({ error: "Gagal update (rowIndex tidak valid?)" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, rowIndex });
  } catch (err) {
    console.error("[orders PUT] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal update order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: hapus order
export async function DELETE(
  _req: Request,
  { params }: { params: { rowIndex: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rowIndex = Number(params.rowIndex);
  if (!Number.isFinite(rowIndex)) {
    return NextResponse.json({ error: "rowIndex tidak valid" }, { status: 400 });
  }
  const ok = await deleteOrder(rowIndex);
  if (!ok) {
    return NextResponse.json({ error: "Gagal hapus (rowIndex tidak valid?)" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, rowIndex });
}
