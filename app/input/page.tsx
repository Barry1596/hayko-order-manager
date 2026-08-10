// ===== /input — Form tambah order baru (protected) =====

export const dynamic = "force-dynamic";

import Navbar from "@/components/Navbar";
import OrderForm from "@/components/OrderForm";
import { getUniqueValues } from "@/lib/sheets";

export default async function InputPage() {
  const suggestions = await getUniqueValues();
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold text-brand-navy mb-6">Tambah Order Baru</h1>
        <OrderForm
          suggestions={suggestions}
          submitUrl="/api/orders"
          method="POST"
        />
      </main>
    </div>
  );
}
