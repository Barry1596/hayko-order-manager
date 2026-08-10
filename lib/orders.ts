// ===== Helpers server-side: ambil nilai unik untuk autocomplete =====

import { query } from "@/lib/db";

export interface Suggestions {
  event: string[];
  brand: string[];
  artikel: string[];
  metodePembayaran: string[];
}

/** Ambil nilai unik (non-null) dari kolom-kolom order untuk combobox suggestion. */
export async function getSuggestions(): Promise<Suggestions> {
  const [events, brands, artikels, metodes] = await Promise.all([
    query<{ v: string }>(`SELECT DISTINCT event AS v FROM orders WHERE event IS NOT NULL AND event <> '' ORDER BY event`),
    query<{ v: string }>(`SELECT DISTINCT brand AS v FROM orders WHERE brand IS NOT NULL AND brand <> '' ORDER BY brand`),
    query<{ v: string }>(`SELECT DISTINCT artikel AS v FROM orders WHERE artikel IS NOT NULL AND artikel <> '' ORDER BY artikel`),
    query<{ v: string }>(`SELECT DISTINCT metode_pembayaran AS v FROM orders WHERE metode_pembayaran IS NOT NULL AND metode_pembayaran <> '' ORDER BY metode_pembayaran`),
  ]);
  return {
    event: events.map((r) => r.v),
    brand: brands.map((r) => r.v),
    artikel: artikels.map((r) => r.v),
    metodePembayaran: metodes.map((r) => r.v),
  };
}
