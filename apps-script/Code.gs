/**
 * ===== Hayko Order Manager — Google Apps Script Backend =====
 *
 * Script ini berkomunikasi dengan Google Sheet "MASTER REKAP HAYKO"
 * (atau sheet dummy testing) via SpreadsheetApp.openById().
 * Bisa di-deploy sebagai STANDALONE project (tidak harus bound ke sheet).
 *
 * Semua operasi (baca/tulis/update/delete) dilakukan via GET request
 * dengan parameter URL — Apps Script Web App paling reliable via GET.
 *
 * --- CARA INSTALL (STANDALONE) ---
 * 1. Buka https://script.google.com/home/projects/create (editor kosong).
 * 2. Hapus isi Code.gs default, paste seluruh isi file ini.
 * 3. Ganti SHEET_ID di bawah dengan ID spreadsheet Anda
 *    (bagian /d/<ID>/edit dari URL sheet).
 * 4. Klik Save (Ctrl+S), beri nama project "Hayko Backend".
 * 5. Klik Deploy → New deployment:
 *      - Type          : Web app
 *      - Description   : Hayko API v1
 *      - Execute as    : Me
 *      - Who has access: Anyone
 *    → klik Deploy.
 * 6. Authorize saat diminta: Advanced → Go to Hayko Backend (unsafe) → Allow.
 * 7. Salin Web App URL (https://script.google.com/macros/s/XXXX/exec).
 *    Set sebagai SHEETS_API_URL di .env.local / Vercel.
 *
 * --- SETELAH UPDATE SCRIPT ---
 * Setiap perubahan WAJIB re-deploy: Deploy → Manage deployments → Edit →
 * Version: New version → Deploy. URL TIDAK berubah.
 *
 * --- API ENDPOINTS (GET) ---
 *   ?action=getAll                 → semua order
 *   ?action=getOne&row=3           → 1 order by rowIndex
 *   ?action=append&data={...}      → tambah order baru (JSON-encoded)
 *   ?action=update&row=3&data={...}→ update order
 *   ?action=delete&row=3           → hapus order
 *   ?action=unique                 → nilai unik untuk autocomplete
 */

/** === KONFIGURASI === */
const SHEET_ID = '1mzeRPcBLIsjGpBsSLi2cOtsyvcwG0xMj'; // ID spreadsheet (dari URL)
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

/** Sheet aktif. Pakai openById karena script standalone. */
function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
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
  obj.sheetRowIndex = sheetRowIndex;
  return obj;
}

/** Ambil semua order. */
function getAllOrders() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];

  const values = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROWS, NUM_COLUMNS).getValues();
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const obj = rowToObject(values[i], DATA_START_ROW + i);
    if (obj && (obj.event || obj.nama)) {
      result.push(obj);
    }
  }
  return result;
}

/** Ambil 1 order by sheet row index. */
function getOrderByRowIndex(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) return null;
  const row = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS).getValues()[0];
  return rowToObject(row, rowIndex);
}

/** Tambah order baru. Return rowIndex baru. */
function appendOrder(data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();

  // Hitung No urut berikutnya (kolom A)
  let nextNo = 1;
  if (lastRow >= DATA_START_ROW) {
    const colA = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROWS, 1).getValues();
    for (let i = colA.length - 1; i >= 0; i--) {
      if (colA[i][0] !== '' && colA[i][0] !== null) {
        nextNo = Number(colA[i][0]) + 1;
        break;
      }
    }
  }

  const newRow = [
    nextNo,
    data.event || '',
    data.nama || '',
    data.brand || '',
    data.artikel || '',
    data.warna_tipe || '',
    data.ukuran || '',
    Number(data.jumlah) || 1,
    Number(data.harga_cust) || 0,
    data.harga_asli !== undefined && data.harga_asli !== null && data.harga_asli !== '' ? Number(data.harga_asli) : '',
    Number(data.profit) || 0,
    Number(data.fee) || 0,
    Number(data.add_fee) || 0,
    Number(data.total_fee) || 0,
    data.status_pesanan || 'Fix Order',
    data.status_pembayaran || 'Not Yet',
    data.metode_pembayaran || '',
    data.ditalangi_oleh || '',
  ];

  const targetRow = lastRow + 1;
  sheet.getRange(targetRow, 1, 1, NUM_COLUMNS).setValues([newRow]);
  sheet.getRange(targetRow, 8, 1, 7).setNumberFormat('#,##0');
  return targetRow;
}

/** Update order berdasarkan sheet row index. */
function updateOrder(rowIndex, data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  const range = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS);
  const existingNo = range.getValues()[0][0];
  const updatedRow = [
    existingNo, // A: No dipertahankan
    data.event || '',
    data.nama || '',
    data.brand || '',
    data.artikel || '',
    data.warna_tipe || '',
    data.ukuran || '',
    Number(data.jumlah) || 1,
    Number(data.harga_cust) || 0,
    data.harga_asli !== undefined && data.harga_asli !== null && data.harga_asli !== '' ? Number(data.harga_asli) : '',
    Number(data.profit) || 0,
    Number(data.fee) || 0,
    Number(data.add_fee) || 0,
    Number(data.total_fee) || 0,
    data.status_pesanan || 'Fix Order',
    data.status_pembayaran || 'Not Yet',
    data.metode_pembayaran || '',
    data.ditalangi_oleh || '',
  ];
  range.setValues([updatedRow]);
  range.offset(0, 7, 1, 7).setNumberFormat('#,##0');
  return { ok: true, rowIndex: rowIndex };
}

/** Hapus order berdasarkan sheet row index. */
function deleteOrder(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  sheet.deleteRow(rowIndex);
  return { ok: true, rowIndex: rowIndex };
}

/** Ambil nilai unik untuk autocomplete. */
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

/** ===== HTTP ENTRY POINT (GET only) ===== */

function doGet(e) {
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
    const action = params.action || 'getAll';

    switch (action) {
      case 'getAll':
        result = getAllOrders();
        break;
      case 'getOne': {
        const row = Number(params.row);
        result = getOrderByRowIndex(row);
        if (!result) { result = { error: 'Order tidak ditemukan' }; status = 404; }
        break;
      }
      case 'append': {
        const data = JSON.parse(params.data || '{}');
        result = { rowIndex: appendOrder(data) };
        status = 201;
        break;
      }
      case 'update': {
        const row = Number(params.row);
        const data = JSON.parse(params.data || '{}');
        result = updateOrder(row, data);
        break;
      }
      case 'delete': {
        const row = Number(params.row);
        result = deleteOrder(row);
        break;
      }
      case 'unique':
        result = getUniqueValues();
        break;
      default:
        result = { error: 'Action tidak dikenal: ' + action };
        status = 400;
    }
  } catch (err) {
    result = { error: String(err) };
    status = 500;
  }
  return jsonOut(result, status);
}

/** Output JSON. */
function jsonOut(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
