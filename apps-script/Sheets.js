// Workbook layout (investment_dashboard_v2). See references/workbook-map.md.
// Only columns listed in `inputs` are ever written; everything else holds formulas.

var LAYOUT = {
  entries: {
    sheet: 'Ghi chép', headerRow: 11, firstRow: 12, lastRow: 1011, lastCol: 17, idField: 'id',
    inputs: {
      date: { col: 1, kind: 'date' },
      description: { col: 2 },
      amount_k: { col: 3, kind: 'number' },
      category: { col: 4 },
      wallet: { col: 5 },
      type: { col: 6 },
      id: { col: 9 },
      source: { col: 10 },
      note: { col: 11 },
      qty: { col: 12, kind: 'number' },
      asset: { col: 13 },
      post_date: { col: 14, kind: 'date' }
    },
    computed: { warning: 7, month: 8, card_date: 15, close_date: 16, check: 17 },
    headers: { 1: 'Ngày', 2: 'Mua gì', 3: 'Số tiền', 4: 'Danh mục', 5: 'Ví', 6: 'Loại', 7: 'Nhắc bạn',
      8: 'Tháng/năm', 9: 'ID', 10: 'Mã nguồn', 11: 'Ghi chú gốc', 12: 'Số lượng', 13: 'Mã tài sản',
      14: 'Ngày hạch toán', 17: 'Kiểm tra' }
  },
  transfers: {
    sheet: 'Chuyển tiền', headerRow: 11, firstRow: 12, lastRow: 211, lastCol: 9, idField: 'id',
    inputs: {
      date: { col: 1, kind: 'date' },
      from: { col: 2 },
      to: { col: 3 },
      amount_k: { col: 4, kind: 'number' },
      note: { col: 5 },
      period: { col: 6 },
      id: { col: 8 }
    },
    computed: { warning: 7, month: 9 },
    headers: { 1: 'Ngày', 2: 'Từ ví', 3: 'Đến ví', 4: 'Số tiền', 5: 'Ghi chú', 6: 'Mã kỳ', 7: 'Nhắc bạn',
      8: 'Mã nguồn', 9: 'Tháng/năm' }
  },
  cards: {
    sheet: 'Thẻ tín dụng', headerRow: 11, firstRow: 12, lastRow: 83, lastCol: 12,
    cols: { period: 1, card: 2, close: 3, due: 4, estimated: 5, confirmed: 6, payable: 7, paid: 8,
      remaining: 9, status: 10, month: 11, actual_due: 12 },
    headers: { 1: 'Mã kỳ', 2: 'Thẻ', 3: 'Ngày chốt', 4: 'Hạn thanh toán', 6: 'Xác nhận', 9: 'Còn trả',
      10: 'Tình trạng', 12: 'Hạn thực tế' }
  },
  invest: {
    sheet: 'Đầu tư', headerRow: 36, firstRow: 37, lastRow: 60, lastCol: 8,
    cols: { month: 1, asset: 2, name: 3, unit: 4, qty: 5, price: 6, price_date: 7, value: 8 },
    headers: { 1: 'Tháng/năm', 2: 'Mã tài sản', 5: 'Số lượng', 6: 'Giá', 7: 'Ngày giá', 8: 'Giá trị' }
  },
  settings: {
    sheet: 'Cài đặt',
    startDate: 'B5', wallets: 'A9:B14', categories: 'D9:D30', types: 'H9:H13', cards: 'J8:M9', assets: 'J22:N23'
  }
};

function ss_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw apiError_('no_spreadsheet', 'Script phải được gắn vào sổ (container-bound)');
  return ss;
}

function tz_() {
  return ss_().getSpreadsheetTimeZone();
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw apiError_('schema_mismatch', 'Không thấy tab ' + name);
  return sh;
}

function checkHeaders_(key) {
  var l = LAYOUT[key];
  var row = sheet_(l.sheet).getRange(l.headerRow, 1, 1, l.lastCol).getDisplayValues()[0];
  var problems = [];
  Object.keys(l.headers).forEach(function (c) {
    if (!headerMatches_(row[c - 1], l.headers[c])) {
      problems.push(l.sheet + ' cột ' + c + ': cần "' + l.headers[c] + '", thấy "' + row[c - 1] + '"');
    }
  });
  return problems;
}

function assertHeaders_(key) {
  var p = checkHeaders_(key);
  if (p.length) throw apiError_('schema_mismatch', 'Cấu trúc sổ khác map, dừng ghi', p);
}

function toApiValue_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  if (typeof v === 'string') return v.trim();
  return v;
}

function toCellValue_(v, kind) {
  if (isBlank_(v)) return '';
  if (kind === 'date') return Utilities.parseDate(parseIsoDate_(v).iso, tz_(), 'yyyy-MM-dd');
  return v;
}

// Reads every row of a table as {row, fields} objects with API-shaped values.
function readRows_(key) {
  var l = LAYOUT[key];
  var vals = sheet_(l.sheet).getRange(l.firstRow, 1, l.lastRow - l.firstRow + 1, l.lastCol).getValues();
  return vals.map(function (r, i) { return { row: l.firstRow + i, raw: r }; });
}

function inputFields_(key, raw) {
  var l = LAYOUT[key], out = {};
  Object.keys(l.inputs).forEach(function (f) { out[f] = toApiValue_(raw[l.inputs[f].col - 1]); });
  return out;
}

function rowIsEmpty_(key, raw) {
  var l = LAYOUT[key];
  return Object.keys(l.inputs).every(function (f) { return isBlank_(raw[l.inputs[f].col - 1]); });
}

function findById_(key, id) {
  var l = LAYOUT[key], col = l.inputs[l.idField].col;
  var hits = readRows_(key).filter(function (r) { return String(r.raw[col - 1]).trim() === id; });
  if (hits.length > 1) throw apiError_('duplicate_id', 'Mã ' + id + ' xuất hiện ở nhiều hàng', hits.map(function (h) { return h.row; }));
  return hits[0] || null;
}

function firstEmptyRow_(key) {
  var hit = readRows_(key).filter(function (r) { return rowIsEmpty_(key, r.raw); })[0];
  if (!hit) throw apiError_('table_full', 'Hết vùng nhập của ' + LAYOUT[key].sheet + '; cần mở rộng bảng');
  return hit.row;
}

// Writes only the given input fields, grouping contiguous columns into one setValues call.
function writeInputs_(key, row, fields) {
  var l = LAYOUT[key], sh = sheet_(l.sheet);
  var cols = Object.keys(fields).map(function (f) {
    var spec = l.inputs[f];
    if (!spec) throw apiError_('bad_field', 'Không ghi được trường ' + f);
    return { col: spec.col, value: toCellValue_(fields[f], spec.kind) };
  }).sort(function (a, b) { return a.col - b.col; });
  var i = 0;
  while (i < cols.length) {
    var j = i;
    while (j + 1 < cols.length && cols[j + 1].col === cols[j].col + 1) j++;
    sh.getRange(row, cols[i].col, 1, j - i + 1).setValues([cols.slice(i, j + 1).map(function (c) { return c.value; })]);
    i = j + 1;
  }
}

function readRow_(key, row) {
  var l = LAYOUT[key], sh = sheet_(l.sheet);
  var raw = sh.getRange(row, 1, 1, l.lastCol).getValues()[0];
  var display = sh.getRange(row, 1, 1, l.lastCol).getDisplayValues()[0];
  var computed = {};
  Object.keys(l.computed || {}).forEach(function (f) { computed[f] = display[l.computed[f] - 1]; });
  return { sheet: l.sheet, row: row, fields: inputFields_(key, raw), computed: computed };
}

// Allowed values come from the live dropdown on the first data row, so new wallets or
// categories added in the sheet are accepted without a code change.
function allowedValues_(key, field) {
  var l = LAYOUT[key];
  var cell = sheet_(l.sheet).getRange(l.firstRow, l.inputs[field].col);
  var dv = cell.getDataValidation();
  if (!dv) return null;
  var type = dv.getCriteriaType(), args = dv.getCriteriaValues();
  var C = SpreadsheetApp.DataValidationCriteria;
  var list = null;
  if (type === C.VALUE_IN_LIST) list = args[0];
  if (type === C.VALUE_IN_RANGE) list = args[0].getDisplayValues().reduce(function (a, r) { return a.concat(r); }, []);
  if (!list) return null;
  return list.map(function (s) { return String(s).trim(); }).filter(function (s) { return s; });
}

function settingsList_(a1) {
  return sheet_(LAYOUT.settings.sheet).getRange(a1).getDisplayValues()
    .map(function (r) { return String(r[0]).trim(); }).filter(function (s) { return s; });
}

function assetCodes_() {
  return settingsList_(LAYOUT.settings.assets);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw apiError_('busy', 'Sổ đang được ghi, thử lại sau');
  try {
    return fn();
  } finally {
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}
