import { calcPrices } from '../utils/calcPrices.js';

describe('Bộ kiểm thử hàm calcPrices (Unit Test)', () => {
  test('TC_1: Tính tổng tiền hàng chính xác với số nguyên', () => {
    const items = [
      { price: 10, qty: 2 }, // 20
      { price: 15, qty: 1 }, // 15
    ];
    const result = calcPrices(items);

    // Tổng tiền hàng = 20 + 15 = 35
    expect(result.itemsPrice).toBe('35.00');
    // Tiền hàng <= 100 phí ship sẽ là 10.00
    expect(result.shippingPrice).toBe('10.00');
    // Thuế 15% của 35 = 5.25
    expect(result.taxPrice).toBe('5.25');
    // Tổng cộng = 35 + 10 + 5.25 = 50.25
    expect(result.totalPrice).toBe('50.25');
  });

  test('TC_2: Xử lý chính xác sai số dấu câu thập phân (0.1 + 0.2)', () => {
    const items = [{ price: 0.1, qty: 3 }];
    const result = calcPrices(items);

    // Trong Javascript, 0.1 * 3 dễ bị lỗi thành 0.30000000000000004
    // Hàm calcPrices phải xử lý để trả về đúng '0.30'
    expect(result.itemsPrice).toBe('0.30');
  });

  test('TC_3: Miễn phí vận chuyển khi tổng tiền hàng lớn hơn 100', () => {
    const items = [{ price: 120, qty: 1 }];
    const result = calcPrices(items);

    // Tiền hàng > 100 -> shippingPrice phải bằng 0.00
    expect(result.shippingPrice).toBe('0.00');
    expect(result.totalPrice).toBe('138.00'); // 120 + 0 + (120 * 0.15)
  });

  test('TC_4: Xử lý giỏ hàng trống (Không có sản phẩm)', () => {
    const items = [];
    const result = calcPrices(items);

    expect(result.itemsPrice).toBe('0.00');
    expect(result.shippingPrice).toBe('10.00'); // < 100$ vẫn tính ship mặc định
    expect(result.taxPrice).toBe('0.00');
    expect(result.totalPrice).toBe('10.00');
  });
});
