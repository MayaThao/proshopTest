import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../../backend/models/userModel.js';
const mockUserId = '60d5ec49f83d513d3c1a3b51';
const mockOrderId = '60d5ec49f83d513d3c1a3b52';

// ===== MOCK PAYPAL FIRST =====
const mockVerifyPayPalPayment = jest.fn();
const mockCheckIfNewTransaction = jest.fn();

jest.unstable_mockModule('../../backend/utils/paypal.js', () => ({
  verifyPayPalPayment: mockVerifyPayPalPayment,
  checkIfNewTransaction: mockCheckIfNewTransaction,
}));

let app;
let Order;

describe('===  ORDER PAYMENT TEST ===', () => {

  let userCookie;

  beforeAll(async () => {

    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';

    //  IMPORT SAU KHI MOCK
    const server = await import('../../backend/server.js');
    app = server.default;

    Order = (await import('../../backend/models/orderModel.js')).default;

    userCookie =
      `jwt=${jwt.sign(
        { userId: mockUserId },
        process.env.JWT_SECRET
      )}`;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  // TC_4.7
test('TC_4.7: Deliver Unpaid Order -> 400', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId,
      isAdmin: true,
    }),
  });

  jest.spyOn(Order, 'findById').mockResolvedValue({
    _id: mockOrderId,
    isPaid: false,
  });

  const res = await request(app)
    .put(`/api/orders/${mockOrderId}/deliver`)
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(400);

});
// TC_4.8
test('TC_4.8: User Access Admin Deliver Route -> 403', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId,
      isAdmin: false,
    }),
  });

  const res = await request(app)
    .put(`/api/orders/${mockOrderId}/deliver`)
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(403);

});
//TC_4.9
  test('TC_4.9: Update Order To Paid -> 200', async () => {

    mockVerifyPayPalPayment.mockResolvedValue({
      verified: true,
      value: '100',
    });

    mockCheckIfNewTransaction.mockResolvedValue(true);

    const mockOrder = {
      _id: mockOrderId,
      totalPrice: 100,
      isPaid: false,
      save: jest.fn().mockResolvedValue({
        _id: mockOrderId,
        isPaid: true,
      }),
    };

    jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

    const res = await request(app)
      .put(`/api/orders/${mockOrderId}/pay`)
      .set('Cookie', [userCookie])
      .send({
        id: 'PAYPAL_TXN_123',
        status: 'COMPLETED',
        update_time: '2026-06-30',
        payer: { email_address: 'test@gmail.com' },
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.isPaid).toBe(true);
  }, 10000); //  tăng timeout tránh CI lag
// TC_4.10
test('TC_4.10: Duplicate Transaction -> 400/500', async () => {

  // 1. THÊM ĐOẠN NÀY: Giả lập đơn hàng CHƯA thanh toán
  jest.spyOn(Order, 'findById').mockResolvedValue({
    _id: mockOrderId,
    totalPrice: 100,
    isPaid: false, //  không bị lỗi "already been paid"
  });

  // 2. PayPal verify thành công
  mockVerifyPayPalPayment.mockResolvedValue({
    verified: true,
    value: '100.00',
  });

  // 3. Transaction đã tồn tại
  mockCheckIfNewTransaction.mockResolvedValue(false);

  // 4. Gọi API
  const res = await request(app)
    .put(`/api/orders/${mockOrderId}/pay`)
    .set('Cookie', [userCookie])
    .send({
      id: 'PAYPAL_TXN_123',
      status: 'COMPLETED',
      update_time: '2026-01-01',
      payer: {
        email_address: 'test@test.com',
      },
    });

  // 5. Kiểm tra đúng thông báo lỗi
  expect([400, 500]).toContain(res.statusCode);
  expect(res.body.message).toContain('Transaction has been used before');
});
test('TC_4.12: Get Paypal Client ID -> 200', async () => {
  process.env.PAYPAL_CLIENT_ID = 'test-client-id';

  const res = await request(app)
    .get('/api/config/paypal');

  expect(res.statusCode).toBe(200);
  expect(res.body.clientId).toBe('test-client-id');
});
});