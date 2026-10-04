// Runs the pure helpers from apps-script/Util.js in Node: node --test tests/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../apps-script/Util.js', import.meta.url), 'utf8'), ctx);
const U = ctx;

test('parseIsoDate_ accepts real dates and rejects others', () => {
  assert.equal(U.parseIsoDate_('2026-10-04').iso, '2026-10-04');
  assert.throws(() => U.parseIsoDate_('04/10/2026'), /YYYY-MM-DD/);
  assert.throws(() => U.parseIsoDate_('2026-02-30'), /không tồn tại/);
});

test('monthLabel_ matches the workbook Tháng/năm label', () => {
  assert.equal(U.monthLabel_('2026-10'), '10/26');
  assert.equal(U.monthLabel_('2027-01'), '01/27');
  assert.throws(() => U.monthLabel_('2026-13'), /YYYY-MM/);
});

test('amounts must be integer VND and convert to k', () => {
  assert.equal(U.vndToK_(U.requirePositiveVnd_(130000, 'a')), 130);
  assert.equal(U.vndToK_(65500), 65.5);
  assert.throws(() => U.requirePositiveVnd_(0, 'a'), /dương/);
  assert.throws(() => U.requirePositiveVnd_(1.5, 'a'), /nguyên/);
  assert.throws(() => U.requirePositiveVnd_('130000', 'a'), /nguyên/);
  assert.equal(U.requireNonNegativeVnd_(0, 'a'), 0);
});

test('headerMatches_ ignores case and spacing', () => {
  assert.ok(U.headerMatches_('ID • tự động hóa', 'ID'));
  assert.ok(U.headerMatches_('Số tiền   (k)', 'số tiền'));
  assert.ok(!U.headerMatches_('Danh mục', 'Ví'));
});

test('requireOneOf_ checks only when a list exists', () => {
  assert.equal(U.requireOneOf_('Ăn uống', ['Ăn uống', 'Khác'], 'category'), 'Ăn uống');
  assert.equal(U.requireOneOf_('X', null, 'category'), 'X');
  assert.throws(() => U.requireOneOf_('Tech', ['Thẻ Tech'], 'wallet'), /không có trong danh sách/);
});

test('diffFields_ treats blanks alike and compares numbers numerically', () => {
  assert.deepEqual([...U.diffFields_({ a: '', b: 130, c: 'x' }, { a: null, b: 130, c: 'x' })], []);
  assert.deepEqual([...U.diffFields_({ b: 130 }, { b: 131 })], ['b']);
  assert.deepEqual([...U.diffFields_({ c: 'x' }, {})], ['c']);
});
