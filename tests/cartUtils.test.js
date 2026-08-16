import test from 'node:test';
import assert from 'node:assert/strict';
import { getCartProductCounts, getCartBadgeCount } from '../src/utils/cartUtils.js';

test('counts each product type once even when added multiple times', () => {
  const cart = [
    { id: 7, quantity: 2, selectedSize: 'M', cartKey: '7-M' },
    { id: 7, quantity: 3, selectedSize: 'L', cartKey: '7-L' },
    { id: 8, quantity: 1, selectedSize: 'S', cartKey: '8-S' },
  ];

  assert.deepEqual(getCartProductCounts(cart), { 7: 1, 8: 1 });
  assert.equal(getCartBadgeCount(cart), 2);
});
