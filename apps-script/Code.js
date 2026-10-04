// Web app entry point. POST JSON {token, action, params}; see references/api.md.

var API_VERSION = '1';

var ACTIONS = {
  ping: ping_,
  get_context: getContext_,
  record_entry: recordEntry_,
  record_transfer: recordTransfer_,
  confirm_statement: confirmStatement_,
  set_asset_price: setAssetPrice_,
  find: find_,
  update_entry: updateEntry_,
  undo: undo_,
  monthly_summary: monthlySummary_
};

function doPost(e) {
  var action = null;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    action = body.action;
    checkToken_(body.token);
    var fn = ACTIONS[action];
    if (!fn) throw apiError_('unknown_action', 'Action không hỗ trợ: ' + action, Object.keys(ACTIONS));
    return json_({ ok: true, action: action, result: fn(body.params || {}) });
  } catch (err) {
    return json_({ ok: false, action: action, error: {
      code: err.apiCode || 'internal', message: err.message, details: err.details } });
  }
}

// GET exposes nothing but liveness, so a leaked URL alone reveals no data.
function doGet() {
  return json_({ ok: true, service: 'expense-book-api', api_version: API_VERSION });
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (!expected) throw apiError_('not_configured', 'Chưa chạy setup() để tạo API_TOKEN');
  if (typeof token !== 'string' || token.length !== expected.length) throw apiError_('unauthorized', 'Sai token');
  var diff = 0;
  for (var i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) throw apiError_('unauthorized', 'Sai token');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function newToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

// Run once from the Apps Script editor: grants spreadsheet access and creates the token.
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) props.setProperty('API_TOKEN', newToken_());
  Logger.log('ping: ' + JSON.stringify(ping_()));
  Logger.log('API_TOKEN: ' + props.getProperty('API_TOKEN'));
}

// Run from the editor if the token leaks; update EXPENSE_BOOK_TOKEN everywhere afterwards.
function rotateToken() {
  PropertiesService.getScriptProperties().setProperty('API_TOKEN', newToken_());
  Logger.log('API_TOKEN: ' + PropertiesService.getScriptProperties().getProperty('API_TOKEN'));
}
