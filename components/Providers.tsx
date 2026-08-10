"use client";

// ===== SessionProvider wrapper (client component) =====
// Dipakai di app/layout.tsx supaya useSession bisa dipanggil di semua page.

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
