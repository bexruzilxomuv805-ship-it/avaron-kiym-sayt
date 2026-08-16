import test from 'node:test';
import assert from 'node:assert/strict';
import { getRecommendedSize, normalizeSizes } from '../src/utils/sizeUtils.js';

test('normalizeSizes converts mixed input into uppercase size labels', () => {
  assert.deepEqual(normalizeSizes(['s', 'M', 'L', 'XL']), ['S', 'M', 'L', 'XL']);
});

test('getRecommendedSize returns a size from the available options', () => {
  const suggested = getRecommendedSize(
    ['S', 'M', 'L'],
    { age: 20, height: 160, weight: 50, bodyType: 'ozg\'in' },
  );

  assert.equal(suggested, 'S');
});

test('getRecommendedSize increases the size for larger builds', () => {
  const suggested = getRecommendedSize(
    ['S', 'M', 'L', 'XL'],
    { age: 25, height: 185, weight: 90, bodyType: 'semiz' },
  );

  assert.equal(suggested, 'XL');
});
