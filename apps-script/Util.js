// Pure helpers: no SpreadsheetApp calls here, so tests/util.test.mjs can run them in Node.

function apiError_(code, message, details) {
  var err = new Error(message);
  err.apiCode = code;
  if (details !== undefined) err.details = details;
  return err;
}

function parseIsoDate_(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s).trim());
  if (!m) throw apiError_('bad_date', 'Ngày phải có dạng YYYY-MM-DD: ' + s);
  var y = +m[1], mo = +m[2], d = +m[3];
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw apiError_('bad_date', 'Ngày không tồn tại: ' + s);
  }
  return { y: y, m: mo, d: d, iso: m[0] };
}

function parseMonth_(s) {
  var m = /^(\d{4})-(\d{2})$/.exec(String(s == null ? '' : s).trim());
  if (!m || +m[2] < 1 || +m[2] > 12) throw apiError_('bad_month', 'Tháng phải có dạng YYYY-MM: ' + s);
  return { y: +m[1], m: +m[2] };
}

// "2026-10" -> "10/26", the label the workbook shows in its Tháng/năm columns.
function monthLabel_(s) {
  var p = parseMonth_(s);
  return (p.m < 10 ? '0' : '') + p.m + '/' + String(p.y).slice(-2);
}

function requirePositiveVnd_(v, field) {
  if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v <= 0) {
    throw apiError_('bad_amount', field + ' phải là số nguyên VND dương: ' + v);
  }
  return v;
}

function requireNonNegativeVnd_(v, field) {
  if (typeof v !== 'number' || !isFinite(v) || Math.floor(v) !== v || v < 0) {
    throw apiError_('bad_amount', field + ' phải là số nguyên VND không âm: ' + v);
  }
  return v;
}

// Workbook stores money in k VND with at most 3 decimals.
function vndToK_(vnd) {
  return Math.round(vnd) / 1000;
}

function requirePositiveNumber_(v, field) {
  if (typeof v !== 'number' || !isFinite(v) || v <= 0) {
    throw apiError_('bad_number', field + ' phải là số dương: ' + v);
  }
  return v;
}

function requireText_(v, field) {
  var s = String(v == null ? '' : v).trim();
  if (!s) throw apiError_('missing_field', 'Thiếu ' + field);
  return s;
}

function optionalText_(v) {
  return v == null ? '' : String(v).trim();
}

function normalizeHeader_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
}

function headerMatches_(actual, expectedPrefix) {
  return normalizeHeader_(actual).indexOf(normalizeHeader_(expectedPrefix)) === 0;
}

function requireOneOf_(value, allowed, field) {
  if (!allowed || !allowed.length) return value;
  if (allowed.indexOf(value) === -1) {
    throw apiError_('bad_value', field + ' "' + value + '" không có trong danh sách', { allowed: allowed });
  }
  return value;
}

function isBlank_(v) {
  return v === '' || v === null || v === undefined;
}

// Compare two {field: value} maps after normalisation; returns list of differing fields.
function diffFields_(a, b) {
  var keys = {}, out = [];
  Object.keys(a || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(b || {}).forEach(function (k) { keys[k] = true; });
  Object.keys(keys).forEach(function (k) {
    var x = a ? a[k] : undefined, y = b ? b[k] : undefined;
    if (isBlank_(x) && isBlank_(y)) return;
    if (typeof x === 'number' && typeof y === 'number' ? Math.abs(x - y) > 1e-9 : String(x) !== String(y)) {
      out.push(k);
    }
  });
  return out;
}
