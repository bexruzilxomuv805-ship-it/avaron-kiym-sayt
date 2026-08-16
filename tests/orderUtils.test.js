import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderPayloadForDb, normalizeOrderStatus, normalizeOrders } from '../src/utils/orderUtils.js';

test('strips image fields from order items before saving to db.json', () => {
  const order = {
    id: 1,
    userId: 7,
    userName: 'Guest',
    items: [
      { id: 1, name: 'T-shirt', price: 120000, image: '/1.png' },
      { id: 2, name: 'Shoes', price: 200000, img: '/2.png' },
    ],
    phone: '+998901234567',
    location: 'Tashkent',
    total: 320000,
  };

  const payload = buildOrderPayloadForDb(order);

  assert.deepEqual(payload.items, [
    { id: 1, name: 'T-shirt', price: 120000 },
    { id: 2, name: 'Shoes', price: 200000 },
  ]);
  assert.equal(payload.items[0].image, undefined);
  assert.equal(payload.items[1].img, undefined);
});

test('normalizes order status values to the supported admin states', () => {
  assert.equal(normalizeOrderStatus('Yangi'), 'yangi');
  assert.equal(normalizeOrderStatus('Yo\u2018lda'), 'yolda');
  assert.equal(normalizeOrderStatus('Yetkazilgan'), 'yetkazilgan');
  assert.equal(normalizeOrderStatus('unknown'), 'yangi');
});

test('normalizes incoming order arrays without mutating the original data', () => {
  const orders = [
    { id: 1, status: 'Yangi' },
    { id: 2, status: 'YOLDA' },
  ];

  const normalized = normalizeOrders(orders);

  assert.deepEqual(normalized.map((order) => order.status), ['yangi', 'yolda']);
  assert.equal(orders[0].status, 'Yangi');
});
