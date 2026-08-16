import test from 'node:test';
import assert from 'node:assert/strict';
import { getToastOptions } from '../src/utils/toastUtils.js';

test('creates toast options for success messages', () => {
  const options = getToastOptions('Muvaffaqiyatli!', 'success');

  assert.equal(options.type, 'success');
  assert.equal(options.message, 'Muvaffaqiyatli!');
});

test('uses info type by default', () => {
  const options = getToastOptions('Yangi xabar');

  assert.equal(options.type, 'info');
  assert.equal(options.message, 'Yangi xabar');
});
