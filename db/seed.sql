-- ===== Hayko Order Manager — Seed 2 akun admin dummy =====
-- Password: "hayko123" untuk keduanya (sudah di-hash bcrypt, cost=10).
-- Hash di-generate via: node -e "console.log(require('bcryptjs').hashSync('hayko123', 10))"
--
-- Jalankan SETELAH schema.sql:
--   psql "$POSTGRES_URL" -f db/schema.sql
--   psql "$POSTGRES_URL" -f db/seed.sql
-- Idempotent: hanya insert kalau username belum ada.

INSERT INTO users (username, password_hash, nama)
SELECT 'Hayfa', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Hayfa'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Hayfa');

INSERT INTO users (username, password_hash, nama)
SELECT 'Kiko', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Kiko'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'Kiko');
