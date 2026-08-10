/**
 * ===== Hayko Order Manager — Google Apps Script Backend =====
 *
 * Script ini jalan DI DALAM Google Sheet "MASTER REKAP HAYKO".
 * Fungsinya: menyediakan Web App API (URL) untuk CRUD data di tab
 * "Rekap Pesanan", sehingga app Next.js bisa baca/tulis/hapus/edit
 * tanpa Service Account Google Cloud.
 *
 * --- CARA INSTALL ---
 * 1. Buka spreadsheet "MASTER REKAP HAYKO" di browser.
 * 2. Menu: Extensions → Apps Script.
 * 3. Hapus isi Code.gs default, paste seluruh isi file ini.
 * 4. Klik Save ( Ctrl+S ), beri nama project "Hayko Backend".
 * 5. Klik Deploy → New deployment:
 *      - Type          : Web app
 *      - Description   : Hayko API v1
 *      - Execute as    : Me (email pemilik sheet)
 *      - Who has access: Anyone
 *    → klik Deploy.
 * 6. Authorize akses saat diminta (klik "Advanced → Go to project → Allow").
 * 7. Salin Web App URL (format: https://script.google.com/macros/s/XXXX/exec).
 *    Set sebagai SHEETS_API_URL di file .env.local / Vercel.
 *
 * --- SETELAH UPDATE SCRIPT ---
 * Setiap kali script diubah, WAJIB Deploy ulang:
 *   Deploy → Manage deployments → (pilih deployment) → Edit →
 *   Version: New version → Deploy. URL TIDAK berubah.
 */

/** === KONFIGURASI === */
const SHEET_NAME = 'Rekap Pesanan';   // nama tab CRUD
const HEADER_ROWS = 2;                // baris header (judul + sub-header)
const DATA_START_ROW = 3;             // baris pertama data
const NUM_COLUMNS = 18;               // kolom A–R

/** Token rahasia opsional untuk autentikasi minimal.
 *  Diisi via Project Settings → Script properties → APP_TOKEN.
 *  Kalau dikosongkan, endpoint terbuka (sesuai permintaan: "URL publik no problem"). */
function getToken() {
  return PropertiesService.getScriptProperties().getProperty('APP_TOKEN') || '';
}

/** Sheet aktif (cache per-request). */
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/** Mapping kolom A–R → nama field internal. */
const FIELDS = [
  'no',               // A
  'event',            // B
  'nama',             // C
  'brand',            // D
  'artikel',          // E
  'warna_tipe',       // F
  'ukuran',           // G
  'jumlah',           // H
  'harga_cust',       // I
  'harga_asli',       // J
  'profit',           // K
  'fee',              // L
  'add_fee',          // M
  'total_fee',        // N
  'status_pesanan',   // O
  'status_pembayaran',// P
  'metode_pembayaran',// Q
  'ditalangi_oleh',   // R
];

/** Ubah array 1 baris (18 cell) jadi object field. */
function rowToObject(row, sheetRowIndex) {
  if (!row || row.length === 0) return null;
  const obj = {};
  for (let i = 0; i < FIELDS.length; i++) {
    obj[FIELDS[i]] = row[i] !== undefined ? row[i] : '';
  }
  // sheetRowIndex = baris asli di sheet (1-based). Dipakai sebagai id untuk update/delete.
  obj.sheetRowIndex = sheetRowIndex;
  return obj;
}

/** Ambil semua order (GET). */
function getAllOrders() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];

  const values = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROWS, NUM_COLUMNS).getValues();
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const obj = rowToObject(values[i], DATA_START_ROW + i);
    // Skip baris kosong total (semua cell kosong)
    if (obj && (obj.event || obj.nama)) {
      result.push(obj);
    }
  }
  return result;
}

/** Ambil 1 order by sheet row index (GET). */
function getOrderByRowIndex(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) return null;
  const row = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS).getValues()[0];
  return rowToObject(row, rowIndex);
}

/** Tambah order baru (POST). Return rowIndex baru. */
function appendOrder(data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  // Hitung No urut berikutnya (kolom A)
  let nextNo = 1;
  if (lastRow >= DATA_START_ROW) {
    const colA = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROWS, 1).getValues();
    // Ambil No dari baris terakhir yang punya data
    for (let i = colA.length - 1; i >= 0; i--) {
      if (colA[i][0] !== '' && colA[i][0] !== null) {
        nextNo = Number(colA[i][0]) + 1;
        break;
      }
    }
  }

  const newRow = [
    nextNo,                                                   // A: No (auto)
    data.event || '',                                        // B
    data.nama || '',                                         // C
    data.brand || '',                                        // D
    data.artikel || '',                                      // E
    data.warna_tipe || '',                                   // F
    data.ukuran || '',                                       // G
    Number(data.jumlah) || 1,                                // H
    Number(data.harga_cust) || 0,                           // I
    data.harga_asli !== undefined && data.harga_asli !== null ? Number(data.harga_asli) : '', // J
    Number(data.profit) || 0,                               // K
    Number(data.fee) || 0,                                  // L
    Number(data.add_fee) || 0,                              // M
    Number(data.total_fee) || 0,                            // N
    data.status_pesanan || 'Fix Order',                     // O
    data.status_pembayaran || 'Not Yet',                    // P
    data.metode_pembayaran || '',                           // Q
    data.ditalangi_oleh || '',                              // R
  ];

  const targetRow = lastRow + 1;
  sheet.getRange(targetRow, 1, 1, NUM_COLUMNS).setValues([newRow]);
  // Format angka kolom H, I, J, K, L, M, N
  sheet.getRange(targetRow, 8, 1, 7).setNumberFormat('#,##0');
  return targetRow;
}

/** Update order berdasarkan sheet row index (PUT). */
function updateOrder(rowIndex, data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  const updatedRow = [
    '', // A: No (dipertahankan, tidak diubah)
    data.event || '',
    data.nama || '',
    data.brand || '',
    data.artikel || '',
    data.warna_tipe || '',
    data.ukuran || '',
    Number(data.jumlah) || 1,
    Number(data.harga_cust) || 0,
    data.harga_asli !== undefined && data.harga_asli !== null ? Number(data.harga_asli) : '',
    Number(data.profit) || 0,
    Number(data.fee) || 0,
    Number(data.add_fee) || 0,
    Number(data.total_fee) || 0,
    data.status_pesanan || 'Fix Order',
    data.status_pembayaran || 'Not Yet',
    data.metode_pembayaran || '',
    data.ditalangi_oleh || '',
  ];
  const range = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS);
  // Pertahankan kolom A (No) yang sudah ada
  const existingNo = range.getValues()[0][0];
  updatedRow[0] = existingNo;
  range.setValues([updatedRow]);
  range.offset(0, 7, 1, 7).setNumberFormat('#,##0');
  return { ok: true, rowIndex: rowIndex };
}

/** Hapus order berdasarkan sheet row index (DELETE). */
function deleteOrder(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  sheet.deleteRow(rowIndex);
  return { ok: true, rowIndex: rowIndex };
}

/** Ambil nilai unik untuk autocomplete (GET ?unique=1). */
function getUniqueValues() {
  const orders = getAllOrders();
  const pick = (field) => {
    const set = new Set();
    orders.forEach((o) => {
      const v = o[field];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        set.add(String(v).trim());
      }
    });
    return Array.from(set).sort();
  };
  return {
    event: pick('event'),
    brand: pick('brand'),
    artikel: pick('artikel'),
    metode_pembayaran: pick('metode_pembayaran'),
  };
}

/** ===== HTTP ENTRY POINTS (Web App) ===== */

function doGet(e) {
  return handleRequest('GET', e);
}

function doPost(e) {
  return handleRequest('POST', e);
}

function doPut(e) {
  return handleRequest('PUT', e);
}

function doDelete(e) {
  return handleRequest('DELETE', e);
}

/** Router utama. */
function handleRequest(method, e) {
  let result;
  let status = 200;
  try {
    // Opsional: cek token
    const token = getToken();
    if (token) {
      const provided = (e && e.parameter && e.parameter.token) || '';
      if (provided !== token) {
        return jsonOut({ error: 'Unauthorized' }, 401);
      }
    }

    const params = (e && e.parameter) || {};
    const path = params.path || '';
    const body = parseBody(e);

    // Routing
    if (method === 'GET' && params.unique === '1') {
      result = getUniqueValues();
    } else if (method === 'GET' && params.row) {
      result = getOrderByRowIndex(Number(params.row));
      if (!result) { result = { error: 'Order tidak ditemukan' }; status = 404; }
    } else if (method === 'GET') {
      result = getAllOrders();
    } else if (method === 'POST') {
      result = { rowIndex: appendOrder(body) };
      status = 201;
    } else if (method === 'PUT') {
      const rowIndex = Number(params.row || body.rowIndex);
      result = updateOrder(rowIndex, body);
    } else if (method === 'DELETE') {
      const rowIndex = Number(params.row || body.rowIndex);
      result = deleteOrder(rowIndex);
    } else {
      result = { error: 'Method tidak dikenal' };
      status = 400;
    }
  } catch (err) {
    result = { error: String(err) };
    status = 500;
  }
  return jsonOut(result, status);
}

/** Parse body JSON dari POST/PUT/DELETE. */
function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

/** Output JSON dengan CORS header (supaya bisa dipanggil dari domain lain). */
function jsonOut(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
