// One-off structural changes to the workbook. Run from the Apps Script editor, never via the API.
// Google Sheets version history (File > Version history) is the backup: name a version before running.

var LOAN_WALLET = { name: 'Vay Agribank', openingK: -372250, row: 15 };
var LOAN_CATEGORY = { name: 'Lãi vay', row: 19 };

// Formula text rewrites that grow the wallet list from 6 rows (A9:B14) to 7 (A9:B15)
// and the spending categories from D9:D18 to D9:D19.
var LOAN_REWRITES = [
  ["'Cài đặt'!$A$9:$A$14", "'Cài đặt'!$A$9:$A$15"],
  ["'Cài đặt'!$B$9:$B$14)<>6", "'Cài đặt'!$B$9:$B$15)<>7"],
  ["COUNT('Cài đặt'!B9:B14)<>6", "COUNT('Cài đặt'!B9:B15)<>7"],
  ["SUM('Cài đặt'!B9:B14)", "SUM('Cài đặt'!B9:B15)"],
  ["+6-COUNT('Cài đặt'!B9:B14)", "+7-COUNT('Cài đặt'!B9:B15)"],
  ["'Cài đặt'!$D$9:$D$18", "'Cài đặt'!$D$9:$D$19"],
  ['COUNT(I34:I39)<>6', 'COUNT(I34:I40)<>7'],
  ['COUNT(I34:I39)=6', 'COUNT(I34:I40)=7'],
  ['SUM(I34:I39)', 'SUM(I34:I40)']
];

function monthSheets_() {
  return ss_().getSheets().filter(function (s) { return /^\d{2}-\d{2}$/.test(s.getName()); });
}

function requireBlank_(sh, a1) {
  var vals = sh.getRange(a1).getValues().reduce(function (a, r) { return a.concat(r); }, []);
  if (vals.some(function (v) { return !isBlank_(v); })) {
    throw new Error(sh.getName() + '!' + a1 + ' đã có dữ liệu; dừng để không ghi đè');
  }
}

// Rewrites formulas in place, writing only runs of consecutive changed cells in each column.
function rewriteFormulas_(sh, rewrites) {
  var range = sh.getDataRange(), formulas = range.getFormulas(), changed = 0;
  for (var c = 0; c < formulas[0].length; c++) {
    var r = 0;
    while (r < formulas.length) {
      var start = r, run = [];
      while (r < formulas.length && formulas[r][c]) {
        var next = rewrites.reduce(function (f, p) { return f.split(p[0]).join(p[1]); }, formulas[r][c]);
        if (next === formulas[r][c]) break;
        run.push([next]);
        r++;
      }
      if (run.length) {
        sh.getRange(start + 1, c + 1, run.length, 1).setFormulas(run);
        changed += run.length;
      } else {
        r++;
      }
    }
  }
  return changed;
}

function addToListValidation_(range, value) {
  var rule = range.getCell(1, 1).getDataValidation();
  if (!rule || rule.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    throw new Error('Ô ' + range.getA1Notation() + ' không có dropdown dạng danh sách');
  }
  var args = rule.getCriteriaValues(), list = args[0].slice();
  if (list.indexOf(value) === -1) list.push(value);
  range.setDataValidation(rule.copy().requireValueInList(list, args[1] !== false).build());
}

// Adds the loan as a seventh wallet (negative opening balance = principal owed at the start date)
// and a "Lãi vay" spending category. Principal payments then go through Chuyển tiền into the
// loan wallet; interest and prepayment fees are Chi tiêu / Lãi vay.
function addLoanWallet() {
  var settings = sheet_(LAYOUT.settings.sheet), dash = sheet_('Dashboard');
  var entries = sheet_(LAYOUT.entries.sheet), transfers = sheet_(LAYOUT.transfers.sheet);
  var months = monthSheets_();

  requireBlank_(settings, 'A' + LOAN_WALLET.row + ':B' + LOAN_WALLET.row);
  requireBlank_(settings, 'D' + LOAN_CATEGORY.row);
  requireBlank_(dash, 'H40:I40');
  months.forEach(function (m) { requireBlank_(m, 'F31:G31'); });
  if (String(dash.getRange('H39').getValue()).trim() !== 'Thẻ Tech') throw new Error('Dashboard!H39 không phải ví cuối; dừng');

  withLock_(function () {
    var changed = 0;
    ss_().getSheets().forEach(function (s) { changed += rewriteFormulas_(s, LOAN_REWRITES); });

    settings.getRange('A' + LOAN_WALLET.row + ':B' + LOAN_WALLET.row).setValues([[LOAN_WALLET.name, LOAN_WALLET.openingK]]);
    settings.getRange('D' + LOAN_CATEGORY.row).setValue(LOAN_CATEGORY.name);

    dash.getRange('H39:I39').copyTo(dash.getRange('H40:I40'));
    dash.getRange('H40').setValue(LOAN_WALLET.name);
    months.forEach(function (m) {
      m.getRange('F30:G30').copyTo(m.getRange('F31:G31'));
      m.getRange('F31').setValue(LOAN_WALLET.name);
    });

    addToListValidation_(entries.getRange('E12:E1011'), LOAN_WALLET.name);
    addToListValidation_(entries.getRange('D12:D1011'), LOAN_CATEGORY.name);
    addToListValidation_(transfers.getRange('B12:C211'), LOAN_WALLET.name);

    Logger.log('Đã sửa ' + changed + ' công thức; tab tháng: ' + months.map(function (m) { return m.getName(); }).join(', '));
  });
  Logger.log('Dashboard ' + LOAN_WALLET.name + ': ' + dash.getRange('I40').getDisplayValue() +
    ' | Tài sản ròng: ' + dash.getRange('I42').getDisplayValue() + ' | Dòng cần bổ sung: ' + dash.getRange('K5').getDisplayValue());
}
