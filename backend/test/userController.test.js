import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express'; 
import cookieParser from 'cookie-parser';
import { getUserProfile, updateUserProfile, authUser } from '../controllers/userController.js'; 
import { protect } from '../middleware/authMiddleware.js'; 
import User from '../models/userModel.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/api/users/profile', protect, getUserProfile);
app.put('/api/users/profile', protect, updateUserProfile);
app.post('/api/users/auth', authUser);

describe('=== TÍNH NĂNG 3 — KIỂM THỬ THÔNG TIN CÁ NHÂN (Sprint 2 - PROJ-11) ===', () => {
  let regularUserCookie;
  const mockUserId = '60d5ec49f83d513d3c1a3b51';

  beforeAll(() => {
    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';
    regularUserCookie = `jwt=${jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks(); 
  });

  // TC_3.1
  test('TC_3.1: Nên trả về trạng thái 200 OK và thông tin tài khoản khi người dùng đã đăng nhập', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({ _id: mockUserId, name: 'Nguyễn Nhật Tùng', email: 'tung@example.com', isAdmin: false }),
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      isAdmin: false
    }));

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [regularUserCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Nguyễn Nhật Tùng');
    expect(res.body).toHaveProperty('email', 'tung@example.com');
  });

  // TC_3.2
  test('TC_3.2: Nên trả về trạng thái 401 Unauthorized khi không cung cấp mã xác thực Token', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
  });

  // TC_3.3
  test('TC_3.3: KHÔNG ĐƯỢC bao gồm trường mật khẩu (password) trong dữ liệu phản hồi trả về', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      select: jest.fn().mockResolvedValue({ _id: mockUserId, name: 'Nguyễn Nhật Tùng', email: 'tung@example.com', isAdmin: false }),
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      isAdmin: false
    }));

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [regularUserCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body.password).toBeUndefined();
  });

  // TC_3.4
  test('TC_3.4: Nên cập nhật Họ tên và Email mới thành công', async () => {
    // Mock findById trả về instance có hàm save() cho cả middleware và controller
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      select: jest.fn().mockResolvedValue({ _id: mockUserId }),
      save: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Nguyễn Nhật Tùng Updated',
        email: 'tung.updated@example.com'
      })
    }));

    // Đảm bảo findOne trả về null -> Email mới không trùng với ai cả
    jest.spyOn(User, 'findOne').mockResolvedValue(null);

    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', [regularUserCookie])
      .send({ name: 'Nguyễn Nhật Tùng Updated', email: 'tung.updated@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toEqual('Nguyễn Nhật Tùng Updated');
    expect(res.body.email).toEqual('tung.updated@example.com');
  });

  // TC_3.5
  test('TC_3.5: Nên cập nhật mật khẩu mới thành công và cho phép đăng nhập lại bằng mật khẩu mới', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      select: jest.fn().mockResolvedValue({ _id: mockUserId }),
      save: jest.fn().mockResolvedValue({ _id: mockUserId })
    }));

    const mockUserLogin = {
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      matchPassword: jest.fn().mockResolvedValue(true)
    };
    
    jest.spyOn(User, 'findOne').mockResolvedValue(mockUserLogin);

    const resUpdate = await request(app)
      .put('/api/users/profile')
      .set('Cookie', [regularUserCookie])
      .send({ password: 'newSecurePassword123' });

    expect(resUpdate.statusCode).toBe(200);

    const resLogin = await request(app)
      .post('/api/users/auth')
      .send({ email: 'tung@example.com', password: 'newSecurePassword123' });

    expect(resLogin.statusCode).toBe(200);
    expect(resLogin.body).toHaveProperty('_id', mockUserId);
  });

  // TC_3.9
  test('TC_3.9: Không cho phép cập nhật email đã tồn tại', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      select: jest.fn().mockResolvedValue({ _id: mockUserId })
    }));

    // Giả lập tìm kiếm thấy một User khác nắm giữ email này
    jest.spyOn(User, 'findOne').mockResolvedValue({
      _id: 'anotherUserID_123456',
      email: 'duplicate@example.com'
    });

    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', [regularUserCookie])
      .send({ email: 'duplicate@example.com' });

    expect(res.statusCode).toBe(400);
  });

  // TC_3.11
  test('TC_3.11: Không gửi dữ liệu cập nhật -> Giữ nguyên thông tin cũ', async () => {
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      isAdmin: false,
      select: jest.fn().mockResolvedValue({ _id: mockUserId }),
      save: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Nguyễn Nhật Tùng',
        email: 'tung@example.com',
        isAdmin: false
      })
    }));

    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', [regularUserCookie])
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Nguyễn Nhật Tùng');
    expect(res.body.email).toBe('tung@example.com');
  });
});