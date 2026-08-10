// ===== NextAuth options (Credentials Provider, users di env var) =====
//
// Daftar admin disimpan di env var ADMIN_USERS sebagai JSON array:
//   [{"username":"Hayfa","password":"hayko123","nama":"Hayfa"},
//    {"username":"Kiko","password":"hayko123","nama":"Kiko"}]
//
// Catatan: password plain-text di env var. Karena ini tool internal & URL
// publik memang diizinkan user, ini trade-off yang disengaja demi kemudahan
// (tanpa setup database bcrypt). Kalau butuh security lebih, tinggal
// tambahkan bcrypt compare di sini.

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validators";
import type { SafeUser } from "@/types";

interface AdminUser {
  username: string;
  password: string;
  nama: string;
}

/** Parse daftar admin dari process.env.ADMIN_USERS. */
function getAdmins(): AdminUser[] {
  const raw = process.env.ADMIN_USERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is AdminUser =>
        typeof u === "object" &&
        u !== null &&
        typeof u.username === "string" &&
        typeof u.password === "string" &&
        typeof u.nama === "string",
    );
  } catch {
    console.error("[auth] ADMIN_USERS env var bukan JSON valid");
    return [];
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const admins = getAdmins();
        const found = admins.find(
          (u) => u.username.toLowerCase() === username.toLowerCase(),
        );
        if (!found || found.password !== password) return null;

        const safe: SafeUser = { username: found.username, nama: found.nama };
        return safe as unknown as { id: string; name: string; username: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as SafeUser;
        token.username = u.username;
        token.nama = u.nama;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SafeUser).username = token.username as string;
        (session.user as SafeUser).nama = token.nama as string;
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      username: string;
      nama: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    nama?: string;
  }
}
