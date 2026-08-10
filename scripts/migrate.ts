// ===== Migration + seed runner =====
// Menjalankan schema.sql + seed users secara idempotent.
// Hash password di-generate di runtime (lebih reliable daripada hardcode di .sql).
//
// Usage: npm run migrate
//   (pastikan POSTGRES_URL sudah diset di .env.local)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { Pool } from "@vercel/postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = resolve(__dirname, "..", "db");

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("❌ POSTGRES_URL belum diset di .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  console.log("→ Menjalankan schema.sql ...");
  const schema = readFileSync(resolve(DB_DIR, "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("✓ Schema OK");

  console.log("→ Seed users (Hayfa, Kiko) ...");
  const hash = bcrypt.hashSync("hayko123", 10);
  for (const [username, nama] of [["Hayfa", "Hayfa"], ["Kiko", "Kiko"]] as const) {
    await pool.query(
      `INSERT INTO users (username, password_hash, nama)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = $1)`,
      [username, hash, nama],
    );
    console.log(`  ✓ ${username} (password: hayko123)`);
  }

  console.log("\n✅ Migration selesai.");
  console.log("   Login default: username 'Hayfa' atau 'Kiko', password 'hayko123'");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration gagal:", err);
  process.exit(1);
});
