# Hayko Order Manager

Web app **internal** untuk tim admin Jastip Hayko — form input, edit, dan rekapitulasi pesanan dengan **auto-calc Fee** sesuai aturan bisnis.

> ⚠️ **Catatan arsitektur**: Awalnya dirancang untuk integrasi Google Sheets API (baca+tulis). Setelah diskusi, sumber data dipindah ke **Vercel Postgres** agar:
> - Tidak perlu setup Google Service Account (ribet)
> - Data pesanan tersimpan permanen & bisa diakses Hayfa + Kiko dari device mana saja
> - Mendukung audit trail (siapa yang input/edit)
> - CRUD lebih reliable daripada menulis ke baris Sheet
>
> Fitur **export to Google Sheets** bisa ditambah nanti sebagai nice-to-have.

---

## 🧱 Tech Stack

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Database | Vercel Postgres (`@vercel/postgres`) |
| Auth | NextAuth.js v4 (Credentials + bcrypt) |
| Hosting | Vercel |

---

## 🚀 Quick Start (Dev Lokal)

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Vercel Postgres (gratis untuk hobby)
1. Buka [vercel.com](https://vercel.com) → login → buat project baru (atau pakai yang ada)
2. Tab **Storage** → **Create Database** → pilih **Postgres** → beri nama `hayko-db`
3. Setelah dibuat, klik **Connect to Project** → pilih project Anda
4. Salin `POSTGRES_URL` dari tab **.env.local** atau **Connect**

### 3. Konfigurasi `.env.local`
Buat file `.env.local` di root project (sudah di-gitignore):
```bash
POSTGRES_URL=postgres://...     # dari Vercel Postgres
NEXTAUTH_SECRET=...             # generate via: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Jalankan migration + seed
```bash
npm run migrate
```
Ini akan membuat tabel `users` + `orders` dan seed 2 akun dummy:
- **Hayfa** / `hayko123`
- **Kiko** / `hayko123`

### 5. Jalankan dev server
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) → login pakai akun dummy di atas.

---

## 📦 Deploy ke Vercel

### Via Vercel CLI (rekomendasi)
```bash
# Login sekali
vercel login

# Link project
vercel link

# Set env vars di Vercel (production)
vercel env add POSTGRES_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL

# Deploy ke production
vercel --prod
```

### Via Dashboard
1. Push repo ke GitHub
2. Buka [vercel.com/new](https://vercel.com/new) → import repo
3. Tambah env vars yang sama di **Settings → Environment Variables**
4. Klik **Deploy**

> **Penting**: Setelah deploy pertama, jalankan migration di database production:
> ```bash
> vercel env pull .env.local   # tarik POSTGRES_URL production
> npm run migrate              # jalan ke DB production
> ```

---

## 🔑 Akun Default & Cara Ganti Password

Setelah `npm run migrate`, 2 akun default tersedia:
| Username | Password | Nama |
|---|---|---|
| `Hayfa` | `hayko123` | Hayfa |
| `Kiko` | `hayko123` | Kiko |

**Ganti password**: Login → belum ada halaman change-password (TODO). Sementara, admin baru bisa didaftarkan via halaman `/register`, atau jalankan:
```bash
npm run hash-password -- passwordbaru
```
Lalu update langsung di database:
```sql
UPDATE users SET password_hash = '<hash-dari-output>' WHERE username = 'Hayfa';
```

---

## 💰 Logika Fee

### Fee dasar (kolom L) — berdasarkan Harga Cust
| Harga Barang | Fee |
|---|---|
| ≤ 30.000 | 3.000 |
| 31.000 – 70.000 | 5.000 |
| 71.000 – 120.000 | 7.000 |
| 121.000 – 250.000 | 10.000 |
| 251.000 – 400.000 | 15.000 |
| 401.000 – 600.000 | 20.000 |
| > 600.000 | MAX(25.000, 5% × harga) |

Logika ada di [`lib/feeRules.ts`](lib/feeRules.ts) — pure function, dipakai client (live preview) & server (re-validate sebelum save).

### Add Fee (kolom M)
- **Flashsale/bundling**: +3.000 (checkbox)
- **Barang besar/berat/fragile**: +nominal manual 5.000–15.000 (input angka)
- Keduanya bisa digabung

### Override manual
Setiap field Fee & Add Fee punya toggle "Edit manual" — saat aktif, border berubah kuning & label "(manual)" muncul. Server tetap menyimpan nilai override tsb.

---

## 🗂️ Struktur Project

```
hayko-order-manager/
├── app/
│   ├── login/          # Sign In
│   ├── register/       # Sign Up
│   ├── input/          # Form tambah order
│   ├── edit/[id]/      # Form edit (prefill)
│   ├── rekap/          # Tabel + filter + hapus
│   └── api/
│       ├── auth/       # NextAuth handler
│       ├── register/   # POST daftar user baru
│       └── orders/     # GET/POST/PUT/DELETE orders
├── components/         # Navbar, OrderForm, dropdown, tabel, dll
├── lib/                # feeRules, db, auth, validators, format
├── db/                 # schema.sql, seed.sql
├── scripts/            # migrate.ts, hash-password.ts
├── types/              # TypeScript interfaces
└── middleware.ts       # Protect route protected
```

---

## 🔐 Keamanan

- Password di-hash **bcrypt** (cost 10) — tidak plaintext
- Middleware proteksi `/input`, `/edit`, `/rekap`, `/api/orders`
- Server re-calc Fee sebelum simpan (anti-manipulasi client)
- Audit trail: kolom `created_by` diisi otomatis dari session admin
- Semua kredensial di environment variable (tidak pernah di-commit)

---

## ⚠️ TODO — Perlu Konfirmasi Pemilik Bisnis

3 asumsi yang dipakai di code sekarang, perlu diklarifikasi:

1. **Aturan fee >600K** — saat ini pakai `MAX(25.000, 5%×harga)`. Konfirmasi: apakah "25K atau 5%, pilih yang lebih besar" atau logika lain? Ubah di `lib/feeRules.ts` → `FEE_ABOVE_600K`.
2. **Harga Cust = total per-baris atau per-unit?** — saat ini diasumsikan **total per-baris**. Kalau per-unit, hitungan Fee perlu disesuaikan (Fee × Jumlah?).
3. **Formula Profit & Total Fee** — saat ini Profit = Harga Cust − Harga Asli, Total Fee = Fee + Add Fee. Kalau di Sheet asli ada formula berbeda, replikasi di app.

---

## 📝 Catatan

- Fitur **export/sync ke Google Sheets** bisa ditambah nanti (gunakan service account, write-only).
- Kolom **"No"** (nomor urut di Sheet asli) tidak ditampilkan di UI — identifikasi baris pakai `id` primary key database.
- Searchable dropdown untuk Edit/Delete memastikan admin tidak salah pilih baris.

---

*Terakhir diperbarui: 2026-08-10*
