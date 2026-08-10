/**
 * ===== Hayko Order Manager — Google Apps Script Backend =====
 *
 * SEMUA operasi via GET request dengan parameter URL.
 * Apps Script Web App hanya reliable via GET — POST sering reject/411/HTML.
 *
 * ENDPOINTS (GET):
 *   ?action=getAll                              → semua order
 *   ?action=getOne&row=3                        → 1 order by rowIndex
 *   ?action=append&data=URL_ENCODED_JSON        → tambah order baru
 *   ?action=update&row=3&data=URL_ENCODED_JSON  → update order
 *   ?action=delete&row=3                        → hapus order
 *   ?action=unique                              → nilai unik autocomplete
 *
 * Payload data untuk append/update: object JSON yang di-URL-encode.
 * Apps Script otomatis decode parameter, lalu JSON.parse isinya.
 *
 * --- CARA INSTALL (STANDALONE) ---
 * 1. https://script.google.com/home/projects/create → paste kode ini.
 * 2. Ganti SHEET_ID dengan ID spreadsheet Anda (bagian /d/<ID>/edit).
 * 3. Save (Ctrl+S) → beri nama "Hayko Backend".
 * 4. Deploy → New deployment → Type: Web app
 *      Execute as: Me | Who has access: Anyone → Deploy.
 * 5. Authorize: Advanced → Go to Hayko Backend (unsafe) → Allow.
 * 6. Copy Web App URL → set sebagai SHEETS_API_URL.
 *
 * --- UPDATE SCRIPT ---
 * Deploy → Manage deployments → Edit → Version: New version → Deploy.
 */

/** === KONFIGURASI === */
const SHEET_ID = '1mzeRPcBLIsjGpBsSLi2cOtsyvcwG0xMj';
const SHEET_NAME = 'Rekap Pesanan';
const HEADER_ROWS = 2;
const DATA_START_ROW = 3;
const NUM_COLUMNS = 18;

function getToken() {
  return PropertiesService.getScriptProperties().getProperty('APP_TOKEN') || '';
}

function getSheet() {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
}

const FIELDS = [
  'no', 'event', 'nama', 'brand', 'artikel', 'warna_tipe', 'ukuran', 'jumlah',
  'harga_cust', 'harga_asli', 'profit', 'fee', 'add_fee', 'total_fee',
  'status_pesanan', 'status_pembayaran', 'metode_pembayaran', 'ditalangi_oleh',
];

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

/** ===== HTTP ENTRY (GET only) ===== */

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
    result = { error: String(err) + (err && err.stack ? ' | ' + err.stack : '') };
    status = 500;
  }
  return jsonOut(result, status);
}

function checkToken(e) {
  const token = getToken();
  if (!token) return true;
  const provided = (e && e.parameter && e.parameter.token) || '';
  return provided === token;
}

function jsonOut(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
