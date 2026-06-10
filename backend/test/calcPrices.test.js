import { calcPrices } from '../utils/calcPrices.js';

describe('calcPrices', () => {
  test('Tính tổng tiền đúng', () => {
    const items = [{ price: 10, qty: 2 }];
    const result = calcPrices(items);
    expect(result.itemsPrice).toBe('20.00');
  });

  test('Xử lý số thập phân 0.1 + 0.2 không bị lỗi', () => {
    const items = [{ price: 0.1, qty: 3 }];
    const result = calcPrices(items);
    expect(result.itemsPrice).toBe('0.30');
  });
});
