/**
 * ===== Hayko Order Manager — Google Apps Script Backend =====
 *
 * Script ini berkomunikasi dengan Google Sheet "MASTER REKAP HAYKO"
 * (atau sheet dummy testing) via SpreadsheetApp.openById().
 * Bisa di-deploy sebagai STANDALONE project (tidak harus bound ke sheet).
 *
 * STRATEGI HTTP:
 *   - GET  untuk BACA (getAll, getOne, unique) — reliable, payload kecil
 *   - POST (Content-Type: text/plain) untuk TULIS (append, update, delete)
 *     karena Apps Script sering 411/reject application/json.
 *
 * --- CARA INSTALL (STANDALONE) ---
 * 1. Buka https://script.google.com/home/projects/create (editor kosong).
 * 2. Hapus isi Code.gs default, paste seluruh isi file ini.
 * 3. Ganti SHEET_ID di bawah dengan ID spreadsheet Anda.
 * 4. Klik Save (Ctrl+S), beri nama project "Hayko Backend".
 * 5. Klik Deploy → New deployment:
 *      - Type          : Web app
 *      - Description   : Hayko API v1
 *      - Execute as    : Me
 *      - Who has access: Anyone
 * 6. Authorize saat diminta: Advanced → Go to Hayko Backend (unsafe) → Allow.
 * 7. Salin Web App URL. Set sebagai SHEETS_API_URL di .env.local / Vercel.
 *
 * --- SETELAH UPDATE SCRIPT ---
 * Deploy → Manage deployments → Edit → Version: New version → Deploy. URL tetap.
 */

/** === KONFIGURASI === */
const SHEET_ID = '1mzeRPcBLIsjGpBsSLi2cOtsyvcwG0xMj'; // ID spreadsheet (dari URL)
const SHEET_NAME = 'Rekap Pesanan';   // nama tab CRUD
const HEADER_ROWS = 2;                // baris header (judul + sub-header)
const DATA_START_ROW = 3;             // baris pertama data
const NUM_COLUMNS = 18;               // kolom A–R

/** Token rahasia opsional. Diisi via Project Settings → Script properties → APP_TOKEN. */
function getToken() {
  return PropertiesService.getScriptProperties().getProperty('APP_TOKEN') || '';
}

/** Sheet aktif. Pakai openById karena script standalone. */
function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

/** Mapping kolom A–R → nama field internal. */
const FIELDS = [
  'no', 'event', 'nama', 'brand', 'artikel', 'warna_tipe', 'ukuran', 'jumlah',
  'harga_cust', 'harga_asli', 'profit', 'fee', 'add_fee', 'total_fee',
  'status_pesanan', 'status_pembayaran', 'metode_pembayaran', 'ditalangi_oleh',
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

/** ===== OPERATIONS ===== */

function getAllOrders() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return [];
  const values = sheet.getRange(DATA_START_ROW, 1, lastRow - HEADER_ROWS, NUM_COLUMNS).getValues();
  const result = [];
  for (let i = 0; i < values.length; i++) {
    const obj = rowToObject(values[i], DATA_START_ROW + i);
    if (obj && (obj.event || obj.nama)) result.push(obj);
  }
  return result;
}

function getOrderByRowIndex(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) return null;
  const row = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS).getValues()[0];
  return rowToObject(row, rowIndex);
}

function appendOrder(data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
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
    data.event || '', data.nama || '', data.brand || '', data.artikel || '',
    data.warna_tipe || '', data.ukuran || '',
    Number(data.jumlah) || 1, Number(data.harga_cust) || 0,
    data.harga_asli !== undefined && data.harga_asli !== null && data.harga_asli !== '' ? Number(data.harga_asli) : '',
    Number(data.profit) || 0, Number(data.fee) || 0, Number(data.add_fee) || 0, Number(data.total_fee) || 0,
    data.status_pesanan || 'Fix Order', data.status_pembayaran || 'Not Yet',
    data.metode_pembayaran || '', data.ditalangi_oleh || '',
  ];
  const targetRow = lastRow + 1;
  sheet.getRange(targetRow, 1, 1, NUM_COLUMNS).setValues([newRow]);
  sheet.getRange(targetRow, 8, 1, 7).setNumberFormat('#,##0');
  return targetRow;
}

function updateOrder(rowIndex, data) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  const range = sheet.getRange(rowIndex, 1, 1, NUM_COLUMNS);
  const existingNo = range.getValues()[0][0];
  const updatedRow = [
    existingNo,
    data.event || '', data.nama || '', data.brand || '', data.artikel || '',
    data.warna_tipe || '', data.ukuran || '',
    Number(data.jumlah) || 1, Number(data.harga_cust) || 0,
    data.harga_asli !== undefined && data.harga_asli !== null && data.harga_asli !== '' ? Number(data.harga_asli) : '',
    Number(data.profit) || 0, Number(data.fee) || 0, Number(data.add_fee) || 0, Number(data.total_fee) || 0,
    data.status_pesanan || 'Fix Order', data.status_pembayaran || 'Not Yet',
    data.metode_pembayaran || '', data.ditalangi_oleh || '',
  ];
  range.setValues([updatedRow]);
  range.offset(0, 7, 1, 7).setNumberFormat('#,##0');
  return { ok: true, rowIndex: rowIndex };
}

function deleteOrder(rowIndex) {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (rowIndex < DATA_START_ROW || rowIndex > lastRow) {
    return { ok: false, error: 'Row index di luar rentang data' };
  }
  sheet.deleteRow(rowIndex);
  return { ok: true, rowIndex: rowIndex };
}

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

/** ===== HTTP ENTRY POINTS =====
 *
 * GET  → action=getAll | getOne&row=N | unique
 * POST → body JSON: { "action": "append|update|delete", "row": N, "data": {...} }
 *        Content-Type WAJIB text/plain (bukan application/json).
 */

function doGet(e) {
  let result, status = 200;
  try {
    if (!checkToken(e)) return jsonOut({ error: 'Unauthorized' }, 401);
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
      case 'unique':
        result = getUniqueValues();
        break;
      default:
        result = { error: 'Action GET tidak dikenal: ' + action };
        status = 400;
    }
  } catch (err) {
    result = { error: String(err) };
    status = 500;
  }
  return jsonOut(result, status);
}

function doPost(e) {
  let result, status = 200;
  try {
    if (!checkToken(e)) return jsonOut({ error: 'Unauthorized' }, 401);
    // Parse body (text/plain JSON atau form)
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        return jsonOut({ error: 'Body bukan JSON valid' }, 400);
      }
    }
    const action = payload.action;
    const row = Number(payload.row);

    switch (action) {
      case 'append':
        result = { rowIndex: appendOrder(payload.data || {}) };
        status = 201;
        break;
      case 'update':
        result = updateOrder(row, payload.data || {});
        break;
      case 'delete':
        result = deleteOrder(row);
        break;
      default:
        result = { error: 'Action POST tidak dikenal: ' + action };
        status = 400;
    }
  } catch (err) {
    result = { error: String(err) };
    status = 500;
  }
  return jsonOut(result, status);
}

/** Cek token opsional. */
function checkToken(e) {
  const token = getToken();
  if (!token) return true;
  const provided = (e && e.parameter && e.parameter.token) || '';
  return provided === token;
}

/** Output JSON. */
function jsonOut(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
