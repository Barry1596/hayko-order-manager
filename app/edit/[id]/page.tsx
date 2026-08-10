// ===== /edit/[id] — Form edit order existing (protected) =====

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import OrderForm from "@/components/OrderForm";
import { query } from "@/lib/db";
import { getSuggestions } from "@/lib/orders";
import type { Order } from "@/types";

interface PageProps {
  params: { id: string };
}

export default async function EditPage({ params }: PageProps) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [orderRows, suggestions] = await Promise.all([
    query<Order>(`SELECT * FROM orders WHERE id = $1`, [id]),
    getSuggestions(),
  ]);
  if (orderRows.length === 0) notFound();
  const order = orderRows[0];

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
          submitUrl={`/api/orders/${order.id}`}
          method="PUT"
        />
      </main>
    </div>
  );
}
