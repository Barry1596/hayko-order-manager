"use client";

// ===== Navbar — navigasi utama, tampil di semua halaman protected =====

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/input", label: "Input Order" },
  { href: "/rekap", label: "Rekap" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-brand-navy text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/rekap" className="font-bold text-lg tracking-tight">
          Hayko <span className="text-brand-light">Order Manager</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  active ? "bg-white text-brand-navy" : "hover:bg-brand-blue"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          {session?.user && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-brand-blue">
              <span className="text-sm text-brand-light hidden sm:inline">
                {session.user.nama}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-700 transition"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
