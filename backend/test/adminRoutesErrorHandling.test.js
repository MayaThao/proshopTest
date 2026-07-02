import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import jwt from 'jsonwebtoken';

// Import các mô hình dữ liệu (Models)
import User from '../models/userModel.js';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';

describe('Admin Routes Error Handling (TC_5.12 - TC_5.14) - Pure Jest Unit Test', () => {
  // Chuỗi token giả lập ngắn gọn
  const mockTokenString = 'mock-secret-admin-token';
  const mockCookie = `jwt=${mockTokenString}`;
  const mockAuthorizationHeader = `Bearer ${mockTokenString}`;
  const randomUserId = '6a2919149fb1c4f4dc4600e6';

  beforeEach(() => {
    // 🚀 1. Giả lập giải mã JWT: Trả về cả 'id' và 'userId' để khớp với mọi cách viết trong middleware
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'mockadminid', userId: 'mockadminid' });

    // 🚀 2. Giả lập truy vấn User: Đảm bảo cả Middleware xác thực và phân quyền Admin đều PASS
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      // Tạo cấu trúc Mocking chuỗi lệnh gối đầu của Mongoose (.select())
      const mockQueryObject = {
        select: jest.fn().mockImplementation(function() {
          return Promise.resolve({
            _id: 'mockadminid',
            name: 'Mock Admin',
            email: 'admin@email.com',
            isAdmin: true, // Quyền admin bắt buộc
          });
        })
      };
      
      // Cho phép làm việc với cả cú pháp await User.findById(id) trực tiếp 
      // hoặc thông qua chuỗi lệnh await User.findById(id).select('-password')
      Object.setPrototypeOf(mockQueryObject, Promise.prototype);
      return mockQueryObject;
    });
  });

  afterEach(() => {
    // Dọn dẹp mock sau mỗi ca test
    jest.restoreAllMocks();
  });

  // ==========================================
  // 📌 TC_5.12: Đơn hàng không tồn tại (Trả về 404)
  // ==========================================
  describe('PUT /api/orders/:id/deliver', () => {
    it('TC_5.12 - Nên trả về 404 và thông báo lỗi khi ID đơn hàng không tồn tại', async () => {
      const nonExistentOrderId = '60c72b2f9b1d8b2bad123456';

      // Ép Model Order trả về null (Không tìm thấy đơn hàng)
      jest.spyOn(Order, 'findById').mockResolvedValue(null);

      const res = await request(app)
        .put(`/api/orders/${nonExistentOrderId}/deliver`)
        .set('Cookie', mockCookie) // 🎯 Bổ sung Cookie để vượt qua authMiddleware
        .set('Authorization', mockAuthorizationHeader)
        .send();

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toMatch(/Order not found/i);
    });
  });

  // ==========================================
  // 📌 TC_5.13: Trùng Email (Trả về 400)
  // ==========================================
  describe('PUT /api/users/:id', () => {
    it('TC_5.13 - Nên trả về 400 và từ chối cập nhật khi email đã bị trùng với user khác', async () => {
      const duplicateEmailData = {
        name: 'Admin Updated',
        email: 'jane@email.com',
        isAdmin: true,
      };

      // Đối tượng user mục tiêu đang cần được cập nhật
      const fakeTargetUser = {
        _id: randomUserId,
        name: 'Old Name',
        email: 'old@email.com',
        isAdmin: false,
        save: jest.fn(),
      };

      // Đè lại cấu trúc findById riêng cho ca test này để phục vụ cả việc tìm admin lẫn tìm user cần sửa
      jest.spyOn(User, 'findById').mockImplementation((id) => {
        if (id.toString() === 'mockadminid') {
          return {
            select: jest.fn().mockResolvedValue({ _id: 'mockadminid', isAdmin: true }),
          };
        }
        return Promise.resolve(fakeTargetUser);
      });

      // Ép hàm kiểm tra trùng email (findOne) tìm thấy một user khác đã dùng email này rồi
      jest.spyOn(User, 'findOne').mockResolvedValue({ _id: 'another_user_id', email: 'jane@email.com' });

      const res = await request(app)
        .put(`/api/users/${randomUserId}`)
        .set('Cookie', mockCookie) // 🎯 Bổ sung Cookie để vượt qua authMiddleware
        .set('Authorization', mockAuthorizationHeader)
        .send(duplicateEmailData);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Email already in use|User already exists/i);
    });
  });

  // ==========================================
  // 📌 TC_5.14: Sai định dạng ID (Trả về CastError)
  // ==========================================
  describe('GET /api/products/:id', () => {
    it('TC_5.14 - Hệ thống phải xử lý CastError trả về thông báo Resource not found khi sai định dạng ID', async () => {
      const invalidMongoId = '123';

      // Ép Mongoose ném ra lỗi CastError giả lập
      const castError = new Error('Cast to ObjectId failed');
      castError.name = 'CastError';
      jest.spyOn(Product, 'findById').mockRejectedValue(castError);

      const res = await request(app).get(`/api/products/${invalidMongoId}`).send();

      expect([400, 404]).toContain(res.statusCode);
      expect(res.body.message).toMatch(/Resource not found|Cast to ObjectId failed|Invalid ID|Invalid ObjectId of/i);
    });
  });
});