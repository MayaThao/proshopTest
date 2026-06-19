import { jest } from '@jest/globals';

// 1. Tạo biến cờ ở phạm vi global của NodeJS để truyền tín hiệu xuyên suốt các module
global.__shouldProductModelThrowError = false;

// 2. Đăng ký Mock cứng cấu trúc Module TRƯỚC KHI nạp hệ thống
jest.unstable_mockModule('../../backend/models/productModel.js', () => ({
  default: {
    // Hàm này sẽ tự kiểm tra biến cờ global để quyết định có văng lỗi hay không
    countDocuments: jest.fn(async () => {
      if (global.__shouldProductModelThrowError) {
        throw new Error('Sập DB nguồn');
      }
      return 0; // Trả về mặc định nếu không bật cờ lỗi
    }),
    find: jest.fn(() => ({
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.unstable_mockModule('../../backend/utils/paypal.js', () => ({
  verifyPayPalPayment: jest.fn(),
  checkIfNewTransaction: jest.fn(),
}));

// 3. Sử dụng Top-level Await để nạp các module dự án sau khi đã định nghĩa Mock
const request = (await import('supertest')).default;
const app = (await import('../../backend/server.js')).default;
const Order = (await import('../../backend/models/orderModel.js')).default;
const paypalUtils = await import('../../backend/utils/paypal.js');

describe('=== PROJ-18: ERROR HANDLING & PAYPAL UTILS (TC_5.8 - TC_5.11) ===', () => {
  
  afterEach(() => {
    // Hạ cờ sau mỗi test case để tránh ảnh hưởng đến các bài test khác
    global.__shouldProductModelThrowError = false;
    jest.clearAllMocks();
  });

  // TC_5.8
  test('TC_5.8: notFound middleware -> Trả về lỗi 404 Not Found', async () => {
    const res = await request(app).get('/api/route-khong-ton-tai');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('Not Found');
  });

  // TC_5.9
  test('TC_5.9: errorHandler middleware -> Trả về lỗi 500 khi server crash', async () => {
    // Bật cờ báo lỗi lên! Khi Express Controller gọi countDocuments, nó sẽ lập tức ném ra Error
    global.__shouldProductModelThrowError = true;
    
    const res = await request(app).get('/api/products');
    
    // Kiểm tra kết quả trả về đúng mã 500 và đúng câu thông báo lỗi mong muốn
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Sập DB nguồn');
  });

  // TC_5.10 & TC_5.11
  test('TC_5.10 & TC_5.11: Unit test xử lý logic PayPal Utils', async () => {
    paypalUtils.verifyPayPalPayment.mockResolvedValue({ verified: true, value: '200.00' });
    paypalUtils.checkIfNewTransaction.mockResolvedValue(false);

    const status = await paypalUtils.verifyPayPalPayment('tx_abc123');
    const isNew = await paypalUtils.checkIfNewTransaction(Order, 'tx_abc123');

    expect(status.verified).toBe(true);
    expect(isNew).toBe(false); 
  });
});