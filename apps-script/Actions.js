// One function per API action. Money arrives as integer VND and is stored as k VND.

var INVEST_TYPES = ['Đầu tư', 'Rút đầu tư'];
var DONE_STATUS = 'Đã đủ / không nợ';

function walletNames_() {
  return sheet_(LAYOUT.settings.sheet).getRange(LAYOUT.settings.wallets).getDisplayValues()
    .map(function (r) { return String(r[0]).trim(); }).filter(function (s) { return s; });
}

function blankFields_(key) {
  var out = {};
  Object.keys(LAYOUT[key].inputs).forEach(function (f) { out[f] = ''; });
  return out;
}

function warningsOf_(rec) {
  return ['warning', 'check'].map(function (k) { return rec.computed[k]; })
    .filter(function (s) { return s && String(s).trim(); });
}

// Validates one editable field and returns {name, value} in stored form.
function validateField_(key, name, value) {
  if (name === 'amount_vnd') return { name: 'amount_k', value: vndToK_(requirePositiveVnd_(value, 'amount_vnd')) };
  if (name === 'date') return { name: name, value: parseIsoDate_(value).iso };
  if (key === 'entries') {
    switch (name) {
      case 'description': return { name: name, value: requireText_(value, name) };
      case 'category':
      case 'wallet':
      case 'type': {
        var allowed = allowedValues_('entries', name) ||
          (name === 'wallet' ? walletNames_() : name === 'type' ? settingsList_(LAYOUT.settings.types) : null);
        return { name: name, value: requireOneOf_(requireText_(value, name), allowed, name) };
      }
      case 'source':
      case 'note': return { name: name, value: optionalText_(value) };
      case 'qty': return { name: name, value: isBlank_(value) ? '' : requirePositiveNumber_(value, 'qty') };
      case 'asset': return { name: name, value: isBlank_(value) ? '' : requireOneOf_(requireText_(value, name), assetCodes_(), 'asset') };
      case 'post_date': return { name: name, value: isBlank_(value) ? '' : parseIsoDate_(value).iso };
    }
  }
  if (key === 'transfers') {
    switch (name) {
      case 'from':
      case 'to': return { name: name, value: requireOneOf_(requireText_(value, name), allowedValues_('transfers', name) || walletNames_(), name) };
      case 'note': return { name: name, value: optionalText_(value) };
      case 'period': return { name: name, value: isBlank_(value) ? '' : requireText_(value, name) };
    }
  }
  throw apiError_('bad_field', 'Không sửa được trường ' + name + ' ở ' + LAYOUT[key].sheet);
}

// Cross-field rules checked on the full row after merging edits.
function checkConsistency_(key, f) {
  if (key === 'entries') {
    var invest = INVEST_TYPES.indexOf(f.type) !== -1;
    if (invest && (isBlank_(f.qty) || isBlank_(f.asset))) throw apiError_('missing_field', 'Đầu tư cần qty và asset');
    if (!invest && (!isBlank_(f.qty) || !isBlank_(f.asset))) throw apiError_('bad_field', 'qty/asset chỉ dùng cho Đầu tư / Rút đầu tư');
  }
  if (key === 'transfers') {
    if (f.from === f.to) throw apiError_('bad_value', 'Ví nguồn và ví đích trùng nhau');
    if (!isBlank_(f.period)) {
      var p = findPeriod_(f.period);
      if (!p) throw apiError_('no_period', 'Không có mã kỳ ' + f.period);
      if (p.card !== f.to) throw apiError_('period_card_mismatch', 'Kỳ ' + f.period + ' thuộc ' + p.card + ', không phải ' + f.to);
    }
  }
}

function buildFields_(key, p, names) {
  var out = {};
  names.forEach(function (n) {
    if (p[n] === undefined) return;
    var v = validateField_(key, n, p[n]);
    out[v.name] = v.value;
  });
  return out;
}

function insertIdempotent_(key, id, fields) {
  return withLock_(function () {
    assertHeaders_(key);
    checkConsistency_(key, fields);
    var existing = findById_(key, id);
    if (existing) {
      var diff = diffFields_(inputFields_(key, existing.raw), fields);
      if (diff.length) throw apiError_('id_conflict', 'Mã ' + id + ' đã có ở hàng ' + existing.row + ' với nội dung khác', diff);
      return { status: 'already_recorded', record: readRow_(key, existing.row) };
    }
    var row = firstEmptyRow_(key);
    writeInputs_(key, row, fields);
    SpreadsheetApp.flush();
    var rec = readRow_(key, row);
    var mismatch = diffFields_(rec.fields, fields);
    if (mismatch.length) throw apiError_('verify_failed', 'Đọc lại hàng ' + row + ' không khớp', mismatch);
    return { status: 'recorded', record: rec, warnings: warningsOf_(rec),
      undo: { id: id, before: blankFields_(key), after: fields } };
  });
}

function recordEntry_(p) {
  var id = requireText_(p.request_id, 'request_id');
  ['date', 'description', 'amount_vnd', 'category', 'wallet', 'type'].forEach(function (n) {
    if (isBlank_(p[n])) throw apiError_('missing_field', 'Thiếu ' + n);
  });
  var fields = Object.assign(blankFields_('entries'),
    buildFields_('entries', p, ['date', 'description', 'amount_vnd', 'category', 'wallet', 'type', 'source', 'note', 'qty', 'asset', 'post_date']));
  fields.id = id;
  return insertIdempotent_('entries', id, fields);
}

function recordTransfer_(p) {
  var id = requireText_(p.request_id, 'request_id');
  ['date', 'from', 'to', 'amount_vnd'].forEach(function (n) {
    if (isBlank_(p[n])) throw apiError_('missing_field', 'Thiếu ' + n);
  });
  var fields = Object.assign(blankFields_('transfers'),
    buildFields_('transfers', p, ['date', 'from', 'to', 'amount_vnd', 'note', 'period']));
  fields.id = id;
  return insertIdempotent_('transfers', id, fields);
}

function periodRows_() {
  var l = LAYOUT.cards, c = l.cols;
  var sh = sheet_(l.sheet), n = l.lastRow - l.firstRow + 1;
  var raw = sh.getRange(l.firstRow, 1, n, l.lastCol).getValues();
  return raw.map(function (r, i) {
    var num = function (v) { return typeof v === 'number' ? v : null; };
    return {
      row: l.firstRow + i,
      period: String(r[c.period - 1]).trim(),
      card: String(r[c.card - 1]).trim(),
      close: toApiValue_(r[c.close - 1]),
      due: toApiValue_(r[c.due - 1]),
      actual_due: toApiValue_(r[c.actual_due - 1]),
      estimated_k: num(r[c.estimated - 1]),
      confirmed_k: isBlank_(r[c.confirmed - 1]) ? null : r[c.confirmed - 1],
      payable_k: num(r[c.payable - 1]),
      paid_k: num(r[c.paid - 1]),
      remaining_k: num(r[c.remaining - 1]),
      status: String(r[c.status - 1]).trim()
    };
  }).filter(function (p) { return p.period; });
}

function findPeriod_(id) {
  return periodRows_().filter(function (p) { return p.period === id; })[0] || null;
}

function confirmStatement_(p) {
  var period = requireText_(p.period, 'period');
  var k = vndToK_(requireNonNegativeVnd_(p.amount_vnd, 'amount_vnd'));
  var due = isBlank_(p.actual_due) ? null : parseIsoDate_(p.actual_due).iso;
  return withLock_(function () {
    assertHeaders_('cards');
    var before = findPeriod_(period);
    if (!before) throw apiError_('no_period', 'Không có mã kỳ ' + period);
    if (before.confirmed_k !== null && before.confirmed_k !== k && !p.overwrite) {
      throw apiError_('conflict', 'Kỳ ' + period + ' đã xác nhận ' + before.confirmed_k + 'k; gửi overwrite=true nếu muốn thay', before);
    }
    var sh = sheet_(LAYOUT.cards.sheet), c = LAYOUT.cards.cols;
    sh.getRange(before.row, c.confirmed).setValue(k);
    if (due) sh.getRange(before.row, c.actual_due).setValue(toCellValue_(due, 'date'));
    SpreadsheetApp.flush();
    var after = findPeriod_(period);
    if (after.confirmed_k !== k) throw apiError_('verify_failed', 'Đọc lại số sao kê không khớp', after);
    return { status: 'confirmed', before: before, after: after };
  });
}

function setAssetPrice_(p) {
  var asset = requireText_(p.asset, 'asset');
  var label = monthLabel_(p.month);
  var k = Math.round(requirePositiveNumber_(p.price_vnd, 'price_vnd')) / 1000;
  var date = parseIsoDate_(p.price_date).iso;
  return withLock_(function () {
    assertHeaders_('invest');
    var l = LAYOUT.invest, c = l.cols, sh = sheet_(l.sheet);
    var disp = sh.getRange(l.firstRow, 1, l.lastRow - l.firstRow + 1, l.lastCol).getDisplayValues();
    var idx = -1;
    disp.forEach(function (r, i) { if (r[c.month - 1].trim() === label && r[c.asset - 1].trim() === asset) idx = i; });
    if (idx === -1) throw apiError_('no_price_row', 'Không có hàng giá ' + asset + ' tháng ' + label);
    var row = l.firstRow + idx;
    var raw = sh.getRange(row, c.price, 1, 2).getValues()[0];
    var before = { price_k: isBlank_(raw[0]) ? null : raw[0], price_date: toApiValue_(raw[1]) };
    if (before.price_k !== null && before.price_k !== k && !p.overwrite) {
      throw apiError_('conflict', 'Đã có giá ' + before.price_k + 'k cho ' + asset + ' ' + label + '; gửi overwrite=true nếu muốn thay', before);
    }
    sh.getRange(row, c.price, 1, 2).setValues([[k, toCellValue_(date, 'date')]]);
    SpreadsheetApp.flush();
    var out = sh.getRange(row, 1, 1, l.lastCol).getDisplayValues()[0];
    return { status: 'price_set', row: row, before: before,
      after: { price_k: sh.getRange(row, c.price).getValue(), price_date: date, value_display: out[c.value - 1] } };
  });
}

function locate_(id) {
  var keys = ['entries', 'transfers'];
  for (var i = 0; i < keys.length; i++) {
    var hit = findById_(keys[i], id);
    if (hit) return { key: keys[i], hit: hit };
  }
  return null;
}

function find_(p) {
  var id = requireText_(p.id, 'id');
  var loc = locate_(id);
  if (!loc) return { status: 'not_found', id: id };
  return { status: 'found', kind: loc.key, record: readRow_(loc.key, loc.hit.row) };
}

function updateEntry_(p) {
  var id = requireText_(p.id, 'id');
  var changes = p.fields || {};
  if ('id' in changes || 'request_id' in changes) throw apiError_('bad_field', 'Không đổi mã giao dịch');
  return withLock_(function () {
    var loc = locate_(id);
    if (!loc) throw apiError_('not_found', 'Không thấy mã ' + id);
    assertHeaders_(loc.key);
    var current = inputFields_(loc.key, loc.hit.raw);
    var updates = buildFields_(loc.key, changes, Object.keys(changes));
    if (p.expect) {
      var stale = diffFields_(pick_(current, Object.keys(p.expect)), p.expect);
      if (stale.length) throw apiError_('stale', 'Giá trị hiện tại đã khác dự kiến', stale);
    }
    checkConsistency_(loc.key, Object.assign({}, current, updates));
    writeInputs_(loc.key, loc.hit.row, updates);
    SpreadsheetApp.flush();
    var rec = readRow_(loc.key, loc.hit.row);
    return { status: 'updated', record: rec, warnings: warningsOf_(rec),
      undo: { id: id, before: pick_(current, Object.keys(updates)), after: updates } };
  });
}

// Reverts an earlier record/update only if the row still holds exactly what that call wrote.
function undo_(p) {
  var id = requireText_(p.id, 'id');
  if (!p.before || !p.after) throw apiError_('missing_field', 'Cần before và after từ kết quả lần ghi');
  return withLock_(function () {
    var loc = locate_(id);
    if (!loc) throw apiError_('not_found', 'Không thấy mã ' + id);
    assertHeaders_(loc.key);
    var current = inputFields_(loc.key, loc.hit.raw);
    var stale = diffFields_(pick_(current, Object.keys(p.after)), p.after);
    if (stale.length) throw apiError_('undo_conflict', 'Hàng đã bị sửa sau lần ghi đó, không hoàn tác', stale);
    writeInputs_(loc.key, loc.hit.row, p.before);
    SpreadsheetApp.flush();
    return { status: 'undone', kind: loc.key, row: loc.hit.row, record: readRow_(loc.key, loc.hit.row) };
  });
}

function pick_(obj, keys) {
  var out = {};
  keys.forEach(function (k) { out[k] = obj[k]; });
  return out;
}

function round3_(n) {
  return Math.round(n * 1000) / 1000;
}

function monthlySummary_(p) {
  parseMonth_(p.month);
  var tz = tz_(), ym = p.month.trim();
  var inMonth = function (v) { return v instanceof Date && Utilities.formatDate(v, tz, 'yyyy-MM') === ym; };
  var e = LAYOUT.entries.inputs, t = LAYOUT.transfers.inputs;
  var byType = {}, byCategory = {}, count = 0;
  readRows_('entries').forEach(function (r) {
    if (!inMonth(r.raw[e.date.col - 1])) return;
    var amt = Number(r.raw[e.amount_k.col - 1]) || 0, type = String(r.raw[e.type.col - 1]).trim();
    count++;
    byType[type] = round3_((byType[type] || 0) + amt);
    if (type === 'Chi tiêu') {
      var cat = String(r.raw[e.category.col - 1]).trim();
      byCategory[cat] = round3_((byCategory[cat] || 0) + amt);
    }
  });
  var transfers = { total_k: 0, card_repayments_k: 0, count: 0 };
  readRows_('transfers').forEach(function (r) {
    if (!inMonth(r.raw[t.date.col - 1])) return;
    var amt = Number(r.raw[t.amount_k.col - 1]) || 0;
    transfers.count++;
    transfers.total_k = round3_(transfers.total_k + amt);
    if (!isBlank_(r.raw[t.period.col - 1])) transfers.card_repayments_k = round3_(transfers.card_repayments_k + amt);
  });
  var label = monthLabel_(ym);
  var due = periodRows_().filter(function (x) { return (x.actual_due || x.due || '').slice(0, 7) === ym; });
  var spend = byType['Chi tiêu'] || 0, refund = byType['Hoàn tiền'] || 0, income = byType['Thu nhập'] || 0;
  return {
    month: ym, label: label, entries: count, by_type_k: byType, spending_by_category_k: byCategory,
    net_spending_k: round3_(spend - refund), income_k: income, saving_k: round3_(income - spend + refund),
    net_investment_k: round3_((byType['Đầu tư'] || 0) - (byType['Rút đầu tư'] || 0)),
    transfers: transfers, card_periods_due: due
  };
}

function getContext_() {
  var st = LAYOUT.settings, sh = sheet_(st.sheet), tz = tz_();
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var horizon = Utilities.formatDate(new Date(Date.now() + 45 * 864e5), tz, 'yyyy-MM-dd');
  var wallets = sh.getRange(st.wallets).getValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { name: String(r[0]).trim(), opening_k: isBlank_(r[1]) ? null : r[1] }; });
  var cards = sh.getRange(st.cards).getValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { name: String(r[0]).trim(), close_day: r[1], days_to_due: r[2], code: String(r[3]).trim() }; });
  var assets = sh.getRange(st.assets).getValues().filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) { return { code: String(r[0]).trim(), name: r[1], unit: r[2], opening_qty: r[3], opening_cost_k: r[4] }; });
  var open = periodRows_().filter(function (x) {
    if (x.status === DONE_STATUS) return false;
    return (x.remaining_k || 0) > 0 || (x.close && x.close <= horizon);
  });
  return {
    spreadsheet: ss_().getName(), timezone: tz, today: today,
    start_date: toApiValue_(sh.getRange(st.startDate).getValue()),
    wallets: wallets,
    entry_wallets: allowedValues_('entries', 'wallet'),
    types: allowedValues_('entries', 'type') || settingsList_(st.types),
    categories: allowedValues_('entries', 'category') || settingsList_(st.categories),
    transfer_wallets: allowedValues_('transfers', 'from'),
    assets: assets, cards: cards, open_periods: open
  };
}

function ping_() {
  var problems = [];
  ['entries', 'transfers', 'cards', 'invest'].forEach(function (k) {
    try { problems = problems.concat(checkHeaders_(k)); } catch (e) { problems.push(e.message); }
  });
  var tz = tz_();
  // Sheets saves the +07:00 "Hà Nội" choice under the legacy IANA alias Asia/Saigon.
  if (['Asia/Ho_Chi_Minh', 'Asia/Saigon'].indexOf(tz) === -1) problems.push('Múi giờ sổ là ' + tz + ', cần Asia/Ho_Chi_Minh');
  return { status: problems.length ? 'schema_mismatch' : 'ok', spreadsheet: ss_().getName(),
    timezone: tz, schema: 'investment_dashboard_v2', api_version: API_VERSION, problems: problems };
}
