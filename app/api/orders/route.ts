// ===== GET /api/orders (list) + POST /api/orders (create) =====
//
// Data tersimpan di Google Sheets via Apps Script (lib/sheets.ts).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { orderInputSchema } from "@/lib/validators";
import { calcBaseFee, calcTotalFee, calcProfit } from "@/lib/feeRules";
import {
  getAllOrders,
  appendOrder,
  getUniqueValues,
} from "@/lib/sheets";
import { toOrderOptions } from "@/lib/sheets";

// GET: ambil semua order (atau hanya options untuk dropdown)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const onlyOptions = searchParams.get("options") === "1";
  const onlyUnique = searchParams.get("unique") === "1";

  if (onlyUnique) {
    const unique = await getUniqueValues();
    return NextResponse.json(unique);
  }

  const orders = await getAllOrders();
  if (onlyOptions) {
    return NextResponse.json(toOrderOptions(orders));
  }
  return NextResponse.json(orders);
}

// POST: tambah order baru
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Re-calc fee di server (anti-manipulasi client)
    let fee = input.fee;
    if (!input.fee_override) {
      fee = calcBaseFee(Number(input.harga_cust));
    }
    const totalFee = calcTotalFee(fee, input.add_fee);
    const profit = calcProfit(Number(input.harga_cust), input.harga_asli);

    const rowIndex = await appendOrder({
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

    return NextResponse.json({ rowIndex }, { status: 201 });
  } catch (err) {
    console.error("[orders POST] error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menyimpan order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
