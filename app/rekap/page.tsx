// ===== /rekap — tabel + filter + panel hapus (protected) =====

export const dynamic = "force-dynamic";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import OrdersTable from "@/components/OrdersTable";
import DeleteOrder from "@/components/DeleteOrder";
import { getAllOrders, toOrderOptions } from "@/lib/sheets";

export default async function RekapPage() {
  const orders = await getAllOrders();
  const events = Array.from(new Set(orders.map((o) => o.event).filter(Boolean))).sort();
  const dropdownOptions = toOrderOptions(orders);

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
