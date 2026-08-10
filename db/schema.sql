-- ===== Hayko Order Manager — Database Schema =====
-- Jalankan di Vercel Postgres: psql "$POSTGRES_URL" -f db/schema.sql
-- Idempotent (CREATE ... IF NOT EXISTS).

-- Tabel users: akun admin (NextAuth Credentials)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Tabel orders: pesanan jastip (sesuai kolom tab "Rekap Pesanan" Google Sheet asli)
CREATE TABLE IF NOT EXISTS orders (
  id                 SERIAL PRIMARY KEY,
  event              VARCHAR(100) NOT NULL,          -- Kolom B
  nama               VARCHAR(100) NOT NULL,          -- Kolom C
  brand              VARCHAR(100),                   -- Kolom D
  artikel            VARCHAR(200),                   -- Kolom E
  warna_tipe         VARCHAR(100),                   -- Kolom F
  ukuran             VARCHAR(50),                    -- Kolom G
  jumlah             INTEGER DEFAULT 1,              -- Kolom H
  harga_cust         NUMERIC(12,2) NOT NULL,         -- Kolom I
  harga_asli         NUMERIC(12,2),                  -- Kolom J
  profit             NUMERIC(12,2),                  -- Kolom K (= harga_cust - harga_asli)
  fee                NUMERIC(12,2) NOT NULL,         -- Kolom L (auto-calc / override)
  add_fee            NUMERIC(12,2) DEFAULT 0,        -- Kolom M (flashsale + barang besar)
  total_fee          NUMERIC(12,2) NOT NULL,         -- Kolom N (= fee + add_fee)
  status_pesanan     VARCHAR(50) DEFAULT 'Fix Order', -- Kolom O
  status_pembayaran  VARCHAR(50) DEFAULT 'Not Yet',   -- Kolom P
  metode_pembayaran  VARCHAR(100),                   -- Kolom Q
  ditalangi_oleh     VARCHAR(100),                   -- Kolom R
  fee_override       BOOLEAN DEFAULT FALSE,
  add_fee_override   BOOLEAN DEFAULT FALSE,
  created_by         VARCHAR(100),                   -- Audit: nama admin yg input
  created_at         TIMESTAMP DEFAULT NOW(),
  updated_at         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event);
CREATE INDEX IF NOT EXISTS idx_orders_nama  ON orders(nama);
CREATE INDEX IF NOT EXISTS idx_orders_status_pesanan  ON orders(status_pesanan);
CREATE INDEX IF NOT EXISTS idx_orders_status_pembayaran ON orders(status_pembayaran);
