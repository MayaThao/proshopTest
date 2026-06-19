import { calcPrices } from '../utils/calcPrices.js';



describe('=== PROJ-23: UTILS TEST ===', () => {

  test('TC_4.9: calcPrices normal', () => {

    const result = calcPrices([
      {
        price: 10,
        qty: 2
      }
    ]);

    expect(result.itemsPrice).toBe('20.00');
    expect(result.shippingPrice).toBe('10.00');
    expect(result.taxPrice).toBe('3.00');
    expect(result.totalPrice).toBe('33.00');

  });

});
test('TC_4.10: calcPrices float precision', () => {

  const result = calcPrices([
    {
      price: 0.1,
      qty: 3
    }
  ]);

  expect(result.itemsPrice).toBe('0.30');

});
test('TC_4.11: Free Shipping -> shippingPrice = 0', () => {

  const result = calcPrices([
    {
      price: 60,
      qty: 2
    }
  ]);

  expect(result.itemsPrice).toBe('120.00');
  expect(result.shippingPrice).toBe('0.00');
  expect(result.taxPrice).toBe('18.00');
  expect(result.totalPrice).toBe('138.00');

});

test('TC_4.12: Empty Cart', () => {

  const result = calcPrices([]);

  expect(result.itemsPrice).toBe('0.00');
  expect(result.shippingPrice).toBe('10.00');
  expect(result.taxPrice).toBe('0.00');
  expect(result.totalPrice).toBe('10.00');

});