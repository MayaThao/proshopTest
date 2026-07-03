import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express'; // Khởi tạo ứng dụng Express ảo để kiểm thử cô lập, không lo lỗi cổng mạng
import cookieParser from 'cookie-parser';
import { getUserProfile, updateUserProfile, authUser } from '../controllers/userController.js'; 
import { protect } from '../middleware/authMiddleware.js'; // Đường dẫn tới file middleware xác thực của bạn
import User from '../models/userModel.js';

// Cấu hình một ứng dụng Express giả lập phục vụ riêng cho môi trường kiểm thử
const app = express();
app.use(express.json());
app.use(cookieParser());

// Khai báo các tuyến đường (Routes) cần kiểm thử giống hệt cấu trúc hệ thống thật
app.get('/api/users/profile', protect, getUserProfile);
app.put('/api/users/profile', protect, updateUserProfile);
app.post('/api/users/auth', authUser);

describe('=== TÍNH NĂNG 3 — KIỂM THỬ THÔNG TIN CÁ NHÂN (Sprint 2 - PROJ-11) ===', () => {
  let regularUserCookie;
  const mockUserId = '60d5ec49f83d513d3c1a3b51';

  beforeAll(() => {
    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';
    // Tạo mã thông báo JWT giả lập lưu vào Cookie cho tài khoản người dùng thông thường
    regularUserCookie = `jwt=${jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Xóa sạch dữ liệu giả lập (mock) cũ sau mỗi trường hợp kiểm thử để tránh chồng chéo
  });

  // TC_3.1
  test('TC_3.1: Nên trả về trạng thái 200 OK và thông tin tài khoản khi người dùng đã đăng nhập', async () => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      return {
        select: jest.fn().mockResolvedValue({ _id: mockUserId, name: 'Nguyễn Nhật Tùng', email: 'tung@example.com', isAdmin: false }),
        _id: mockUserId,
        name: 'Nguyễn Nhật Tùng',
        email: 'tung@example.com',
        isAdmin: false
      };
    });

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [regularUserCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('name', 'Nguyễn Nhật Tùng');
    expect(res.body).toHaveProperty('email', 'tung@example.com');
  });

  // TC_3.2
  test('TC_3.2: Nên trả về trạng thái 401 Unauthorized khi không cung cấp mã xác thực Token', async () => {
    // Không gửi kèm Cookie xác thực để kiểm tra bộ lọc bảo mật ngăn chặn người lạ
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
  });

  // TC_3.3
  test('TC_3.3: KHÔNG ĐƯỢC bao gồm trường mật khẩu (password) trong dữ liệu phản hồi trả về', async () => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      return {
        select: jest.fn().mockResolvedValue({ _id: mockUserId, name: 'Nguyễn Nhật Tùng', email: 'tung@example.com', isAdmin: false }),
        _id: mockUserId,
        name: 'Nguyễn Nhật Tùng',
        email: 'tung@example.com',
        isAdmin: false
      };
    });

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [regularUserCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body.password).toBeUndefined(); // Xác thực bảo mật: mật khẩu phải trống rỗng/không tồn tại
  });

  // TC_3.4
  test('TC_3.4: Nên cập nhật Họ tên và Email mới thành công', async () => {
    const findByIdSpy = jest.spyOn(User, 'findById');
    
    // Giả lập cho lượt gọi kiểm tra của Middleware xác thực
    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: mockUserId })
    });

    // Giả lập cho lượt xử lý cập nhật và lưu đè dữ liệu của Controller
    const mockUserInstance = {
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      save: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Nguyễn Nhật Tùng Updated',
        email: 'tung.updated@example.com'
      })
    };
    findByIdSpy.mockResolvedValueOnce(mockUserInstance);
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
    const findByIdSpy = jest.spyOn(User, 'findById');
    
    // 1. Giả lập luồng Thay đổi mật khẩu
    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: mockUserId })
    });

    const mockUserInstance = {
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      save: jest.fn().mockResolvedValue({ _id: mockUserId })
    };
    findByIdSpy.mockResolvedValueOnce(mockUserInstance);
    const findOneSpy = jest.spyOn(User, 'findOne');
    
    const resUpdate = await request(app)
      .put('/api/users/profile')
      .set('Cookie', [regularUserCookie])
      .send({ password: 'newSecurePassword123' });

    expect(resUpdate.statusCode).toBe(200);

    // 2. Giả lập luồng Xác nhận đăng nhập lại bằng thông tin mật khẩu mới
    const mockUserLogin = {
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      matchPassword: jest.fn().mockResolvedValue(true) // Trả về true báo khớp mật khẩu
    };
    findOneSpy.mockResolvedValueOnce(mockUserLogin);

    const resLogin = await request(app)
      .post('/api/users/auth')
      .send({ email: 'tung@example.com', password: 'newSecurePassword123' });

    expect(resLogin.statusCode).toBe(200);
    expect(resLogin.body).toHaveProperty('_id', mockUserId);
  });
  // TC_3.9
test('TC_3.9: Không cho phép cập nhật email đã tồn tại', async () => {

  const findByIdSpy = jest.spyOn(User, 'findById');

  // Middleware protect
  findByIdSpy.mockReturnValueOnce({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  // Controller lấy user hiện tại
  findByIdSpy.mockResolvedValueOnce({
    _id: mockUserId,
    name: 'Nguyễn Nhật Tùng',
    email: 'tung@example.com'
  });

  // Email mới đã tồn tại
  jest.spyOn(User, 'findOne').mockResolvedValue({
    _id: 'anotherUser',
    email: 'duplicate@example.com'
  });

  const res = await request(app)
    .put('/api/users/profile')
    .set('Cookie', [regularUserCookie])
    .send({
      email: 'duplicate@example.com'
    });

  expect(res.statusCode).toBe(400);

});
// TC_3.11
test('TC_3.11: Không gửi dữ liệu cập nhật -> Giữ nguyên thông tin cũ', async () => {

  const findByIdSpy = jest.spyOn(User, 'findById');

  // middleware protect
  findByIdSpy.mockReturnValueOnce({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  // controller update
  const mockUser = {
    _id: mockUserId,
    name: 'Nguyễn Nhật Tùng',
    email: 'tung@example.com',
    isAdmin: false,
    save: jest.fn().mockResolvedValue({
      _id: mockUserId,
      name: 'Nguyễn Nhật Tùng',
      email: 'tung@example.com',
      isAdmin: false
    })
  };

  findByIdSpy.mockResolvedValueOnce(mockUser);

  const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie',[regularUserCookie])
      .send({});

  expect(res.statusCode).toBe(200);

  expect(res.body.name)
      .toBe('Nguyễn Nhật Tùng');

  expect(res.body.email)
      .toBe('tung@example.com');

});

  });