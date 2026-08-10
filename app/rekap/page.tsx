// ===== /rekap — tabel + filter + panel hapus (protected) =====

export const dynamic = "force-dynamic";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import OrdersTable from "@/components/OrdersTable";
import DeleteOrder from "@/components/DeleteOrder";
import { query } from "@/lib/db";
import { formatOrderLabel } from "@/lib/format";
import type { Order, OrderOption } from "@/types";

export default async function RekapPage() {
  const [orders, options] = await Promise.all([
    query<Order>(
      `SELECT id, event, nama, brand, artikel, warna_tipe, ukuran, jumlah,
              harga_cust, harga_asli, profit, fee, add_fee, total_fee,
              status_pesanan, status_pembayaran, metode_pembayaran, ditalangi_oleh,
              fee_override, add_fee_override, created_by, created_at, updated_at
         FROM orders
         ORDER BY created_at DESC, id DESC`,
    ),
    query<{ id: number; event: string; nama: string; artikel: string | null; harga_cust: string }>(
      `SELECT id, event, nama, artikel, harga_cust FROM orders ORDER BY created_at DESC, id DESC`,
    ),
  ]);

  const events = Array.from(new Set(orders.map((o) => o.event))).filter(Boolean).sort();
  const dropdownOptions: OrderOption[] = options.map((o) => ({
    id: o.id,
    label: formatOrderLabel({
      event: o.event,
      nama: o.nama,
      artikel: o.artikel,
      harga_cust: Number(o.harga_cust),
    }),
  }));

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-navy">Rekap Pesanan</h1>
          <Link
            href="/input"
            className="rounded bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue"
          >
            + Tambah Order
          </Link>
        </div>

        <OrdersTable orders={orders} events={events} />

        <DeleteOrder options={dropdownOptions} />
      </main>
    </div>
  );
}
