import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';
// Import đối tượng controller tổng để tránh lỗi import đơn lẻ trong ProShop
import * as userController from '../controllers/userController.js'; 
import { protect, admin } from '../middleware/authMiddleware.js'; 
import User from '../models/userModel.js';

// Khởi tạo Express ảo
const app = express();
app.use(express.json());
app.use(cookieParser());

// Định nghĩa các Route Admin
app.get('/api/users', protect, admin, userController.getUsers);
app.delete('/api/users/:id', protect, admin, userController.deleteUser);
app.get('/api/users/:id', protect, admin, userController.getUserById);

describe('=== TÍNH NĂNG 3 — KIỂM THỬ QUẢN TRỊ USER (S3: TC_3.6 - TC_3.8) ===', () => {
  let adminCookie;
  const mockAdminId = '60d5ec49f83d513d3c1a3b50';
  const mockTargetUserId = '60d5ec49f83d513d3c1a3b51';

  beforeAll(() => {
    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';
    adminCookie = `jwt=${jwt.sign({ userId: mockAdminId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC_3.6
  test('TC_3.6: GET /api/users (Quyền Admin) -> Nên trả về 200 OK và toàn bộ danh sách users', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });

    const mockUserList = [
      { _id: mockAdminId, name: 'Admin Tùng', email: 'admin@example.com', isAdmin: true },
      { _id: mockTargetUserId, name: 'User Test', email: 'user@example.com', isAdmin: false }
    ];
    jest.spyOn(User, 'find').mockResolvedValue(mockUserList);

    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [adminCookie]);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // TC_3.7
  test('TC_3.7: DELETE /api/users/:id (Quyền Admin) -> Nên xóa thành công user và trả về 200 OK', async () => {
    const findByIdSpy = jest.spyOn(User, 'findById');

    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });

    const mockUserToDelete = { _id: mockTargetUserId, name: 'User Test', isAdmin: false };
    findByIdSpy.mockResolvedValueOnce(mockUserToDelete);
    jest.spyOn(User, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

    const res = await request(app)
      .delete(`/api/users/${mockTargetUserId}`)
      .set('Cookie', [adminCookie]);

    expect(res.statusCode).toBe(200);
  });

  // TC_3.8
  test('TC_3.8: GET /api/users/:id (Quyền Admin) -> Nên trả về chi tiết thông tin user theo ID', async () => {
    const findByIdSpy = jest.spyOn(User, 'findById');

    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });

    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({
        _id: mockTargetUserId,
        name: 'User Test',
        email: 'user@example.com',
        isAdmin: false
      })
    });

    const res = await request(app)
      .get(`/api/users/${mockTargetUserId}`)
      .set('Cookie', [adminCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('_id', mockTargetUserId);
  });
});