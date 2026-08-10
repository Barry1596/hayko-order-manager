// ===== NextAuth options (Credentials Provider + bcrypt) =====

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import type { SafeUser } from "@/types";

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
        const rows = await query<{ id: number; username: string; password_hash: string; nama: string }>(
          `SELECT id, username, password_hash, nama FROM users WHERE username = $1 LIMIT 1`,
          [username],
        );
        const user = rows[0];
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        const safe: SafeUser = { id: user.id, username: user.username, nama: user.nama };
        return safe as unknown as { id: string; name: string; username: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // user di sini = return value authorize (SafeUser yang di-cast)
        const u = user as unknown as SafeUser;
        token.id = u.id;
        token.username = u.username;
        token.nama = u.nama;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SafeUser).id = token.id as number;
        (session.user as SafeUser).username = token.username as string;
        (session.user as SafeUser).nama = token.nama as string;
      }
      return session;
    },
  },
};

// Augment tipe NextAuth supaya token/session punya field username & nama.
declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      username: string;
      nama: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: number;
    username?: string;
    nama?: string;
  }
}
