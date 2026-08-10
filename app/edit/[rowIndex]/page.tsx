// ===== /edit/[rowIndex] — Form edit order existing (protected) =====

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import OrderForm from "@/components/OrderForm";
import { getOrderByRowIndex, getUniqueValues } from "@/lib/sheets";

interface PageProps {
  params: { rowIndex: string };
}

export default async function EditPage({ params }: PageProps) {
  const rowIndex = Number(params.rowIndex);
  if (!Number.isFinite(rowIndex)) notFound();

  const [order, suggestions] = await Promise.all([
    getOrderByRowIndex(rowIndex),
    getUniqueValues(),
  ]);
  if (!order) notFound();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-brand-navy mb-6">
          Edit Order — <span className="text-brand-slate font-normal">{order.event} · {order.nama}</span>
        </h1>
        <OrderForm
          initial={order}
          suggestions={suggestions}
          submitUrl={`/api/orders/${order.sheetRowIndex}`}
          method="PUT"
        />
      </main>
    </div>
  );
}
