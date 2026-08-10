# Hayko Order Manager

Web app **internal** untuk tim admin Jastip Hayko — form input, edit, dan rekapitulasi pesanan dengan **auto-calc Fee**, terhubung langsung (baca+tulis) ke Google Sheets **"MASTER REKAP HAYKO"** via Google Apps Script.

---

## 🧱 Tech Stack

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Backend / DB | **Google Sheets** via **Google Apps Script Web App** |
| Auth | NextAuth.js v4 (Credentials, users di env var) |
| Hosting | Vercel |

> Kenapa Apps Script? Tulis-ke-Sheet dari web app biasanya butuh Service Account Google Cloud (ribet setup). Apps Script jalan **di dalam** Sheet itu sendiri — sekali deploy, dapat URL API. Tidak perlu kredensial Google Cloud.

---

## 🚀 Setup — 3 Tahap

### Tahap 1: Deploy Apps Script Backend (di Google Sheet)

1. Buka spreadsheet **"MASTER REKAP HAYKO"** di browser
2. Menu: **Extensions → Apps Script**
3. Hapus isi `Code.gs` default, **paste seluruh isi file [`apps-script/Code.gs`](apps-script/Code.gs)** dari repo ini
4. **Save** (Ctrl+S), beri nama project "Hayko Backend"
5. Klik **Deploy → New deployment**:
   - Type: **Web app**
   - Description: `Hayko API v1`
   - Execute as: **Me** (email pemilik sheet)
   - Who has access: **Anyone**
   - → klik **Deploy**
6. Authorize akses saat diminta (Advanced → Go to project → Allow)
7. **Salin Web App URL** (format: `https://script.google.com/macros/s/XXXX/exec`)

> Setiap update `Code.gs`, wajib re-deploy: Deploy → Manage deployments → Edit → Version: New version → Deploy. **URL tidak berubah**.

### Tahap 2: Konfigurasi `.env.local`

Buat file `.env.local` di root project (sudah di-gitignore):

```bash
# Apps Script URL (dari Tahap 1)
SHEETS_API_URL=https://script.google.com/macros/s/XXXX/exec

# Generate via: openssl rand -base64 32
NEXTAUTH_SECRET=paste-output-openssl-disini
NEXTAUTH_URL=http://localhost:3000

# Daftar admin (JSON array)
ADMIN_USERS=[{"username":"Hayfa","password":"hayko123","nama":"Hayfa"},{"username":"Kiko","password":"hayko123","nama":"Kiko"}]
```

### Tahap 3: Jalankan Dev Server

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) → login `Hayfa` / `hayko123`.

---

## 📦 Deploy ke Vercel

1. Push repo ke GitHub (sudah di-push ke `Barry1596/hayko-order-manager`)
2. Buka [vercel.com/new](https://vercel.com/new) → import repo `hayko-order-manager`
3. Di halaman import, tambah **Environment Variables** (lihat daftar di Tahap 2):
   - `SHEETS_API_URL`
   - `NEXTAUTH_SECRET` (generate baru via `openssl rand -base64 32`)
   - `NEXTAUTH_URL` = `https://hayko-order-manager.vercel.app` (URL final Vercel)
   - `ADMIN_USERS`
4. Klik **Deploy**

Selesai. Tidak perlu migration, tidak perlu database setup — semua data tersimpan di Sheet yang sudah ada.

---

## 🔑 Login

| Username | Password |
|---|---|
| `Hayfa` | `hayko123` |
| `Kiko` | `hayko123` |

Tambah admin baru: edit env var `ADMIN_USERS` (di `.env.local` atau Vercel dashboard), tambahkan object baru, redeploy/restart.

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
- **Barang besar/berat/fragile**: +nominal manual 5.000–15.000
- Keduanya bisa digabung

### Override manual
Toggle "Edit manual" di field Fee & Add Fee → border kuning + label "(manual)". Server tetap simpan nilai override tsb.

---

## 🗂️ Struktur Project

```
hayko-order-manager/
├── apps-script/
│   └── Code.gs              # Backend Apps Script (paste ke Extensions → Apps Script)
├── app/
│   ├── login/               # Sign In
│   ├── input/               # Form tambah order
│   ├── edit/[rowIndex]/     # Form edit (prefill)
│   ├── rekap/               # Tabel + filter + hapus
│   └── api/
│       ├── auth/            # NextAuth handler
│       └── orders/          # GET/POST/PUT/DELETE → Apps Script
├── components/              # Navbar, OrderForm, dropdown, tabel, dll
├── lib/
│   ├── sheets.ts            # Client ke Apps Script
│   ├── auth.ts              # NextAuth (users dari env var)
│   ├── feeRules.ts          # Pure function perhitungan fee
│   ├── format.ts            # formatRupiah dll
│   └── validators.ts        # Zod schemas
├── types/index.ts
└── middleware.ts            # Protect route protected
```

---

## 🔐 Keamanan

- Middleware proteksi `/input`, `/edit`, `/rekap`, `/api/orders`
- Server re-calc Fee sebelum simpan (anti-manipulasi client)
- Apps Script pakai token opsional (`SHEETS_API_TOKEN`) kalau mau dibatasi
- Password plain-text di env var — trade-off untuk kemudahan (tool internal). Upgrade ke bcrypt kalau perlu.

---

## ⚠️ TODO — Perlu Konfirmasi Pemilik Bisnis

1. **Aturan fee >600K** — saat ini `MAX(25.000, 5%×harga)`. Ubah di `lib/feeRules.ts` → `FEE_ABOVE_600K`.
2. **Harga Cust = per-baris atau per-unit?** — diasumsikan total per-baris.
3. **Formula Profit/Total Fee** — Profit = Harga Cust − Harga Asli, Total Fee = Fee + Add Fee.

---

*Terakhir diperbarui: 2026-08-10*
