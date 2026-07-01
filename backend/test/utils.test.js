import { calcPrices, addDecimals } from '../utils/calcPrices.js';



describe('=== PROJ-23: UTILS TEST ===', () => {
//TC_4.15
  test('TC_4.15: calcPrices normal', () => {

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

//TC_4.16
test('TC_4.16: calcPrices float precision', () => {

  const result = calcPrices([
    {
      price: 0.1,
      qty: 3
    }
  ]);

  expect(result.itemsPrice).toBe('0.30');

});
//TC_4.17
test('TC_4.17: calcPrices empty cart', () => {

    const result = calcPrices([]);

    expect(result.itemsPrice).toBe('0.00');
    expect(result.shippingPrice).toBe('10.00');
    expect(result.taxPrice).toBe('0.00');
    expect(result.totalPrice).toBe('10.00');
  });
//TC_4.18
  test('TC_4.18: addDecimals normal', () => {

    expect(addDecimals(1.005)).toBe('1.01');
    expect(addDecimals(2.1 + 0.2)).toBe('2.30');
  });
  //TC_4.19
  test('TC_4.19: addDecimals negative number', () => {

    expect(addDecimals(-5.555)).toBe('-5.55');
  });

});