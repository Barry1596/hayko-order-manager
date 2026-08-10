// ===== Middleware: proteksi route protected =====
// - /input, /edit, /rekap → wajib login, else redirect /login
// - /api/orders/* → wajib login (CEK juga di handler utk double security)
//
// NextAuth middleware hanya cek token JWT (cepat, tanpa DB call).
// Verifikasi user ada di DB tetap dilakukan di authorize() & API handler.

export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/input/:path*", "/edit/:path*", "/rekap/:path*", "/api/orders/:path*"],
};
