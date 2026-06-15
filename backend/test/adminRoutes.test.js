import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js'; 
import User from '../../backend/models/userModel.js';
import Order from '../../backend/models/orderModel.js';
import Product from '../../backend/models/productModel.js';

describe('=== PROJ-17: INTEGRATION TEST ADMIN ROUTES (TC_5.1 - TC_5.7) ===', () => {
  let adminCookie, userCookie;
  const mockAdminId = '60d5ec49f83d513d3c1a3b50';
  const mockUserId = '60d5ec49f83d513d3c1a3b51';
  const mockOrderId = '60d5ec49f83d513d3c1a3b52';
  const mockProductId = '60d5ec49f83d513d3c1a3b53';

  beforeAll(() => {
    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';
    adminCookie = `jwt=${jwt.sign({ userId: mockAdminId }, process.env.JWT_SECRET)}`;
    userCookie = `jwt=${jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Xóa sạch dữ liệu mock cũ sau mỗi test case để tránh chồng chéo
  });

  // TC_5.1
  test('TC_5.1: GET /api/orders (Admin) -> 200 OK', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });
    jest.spyOn(Order, 'find').mockReturnValue({
      populate: jest.fn().mockResolvedValue([{ _id: mockOrderId, totalPrice: 100 }])
    });

    const res = await request(app).get('/api/orders').set('Cookie', [adminCookie]);
    expect(res.statusCode).toBe(200);
  });

  // TC_5.2
  test('TC_5.2: GET /api/orders (User thường) -> Mong đợi chặn 403 Forbidden', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockUserId, isAdmin: false })
    });

    const res = await request(app).get('/api/orders').set('Cookie', [userCookie]);
    expect(res.statusCode).toBe(403); 
  });

  // TC_5.3
  test('TC_5.3: PUT /api/orders/:id/deliver (Admin + Đơn đã paid) -> 200 OK', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });
    const mockOrder = { _id: mockOrderId, isPaid: true, isDelivered: false, save: jest.fn().mockResolvedValue(true) };
    jest.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

    const res = await request(app).put(`/api/orders/${mockOrderId}/deliver`).set('Cookie', [adminCookie]);
    expect(res.statusCode).toBe(200);
  });

  // TC_5.4
  test('TC_5.4: PUT /api/orders/:id/deliver (Admin nhưng chưa paid) -> 400 Bad Request', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });
    jest.spyOn(Order, 'findById').mockResolvedValue({ _id: mockOrderId, isPaid: false });

    const res = await request(app).put(`/api/orders/${mockOrderId}/deliver`).set('Cookie', [adminCookie]);
    expect(res.statusCode).toBe(400);
  });

  // TC_5.5
  test('TC_5.5: DELETE /api/products/:id (User thường) -> Chặn 403', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockUserId, isAdmin: false })
    });

    const res = await request(app).delete(`/api/products/${mockProductId}`).set('Cookie', [userCookie]);
    expect(res.statusCode).toBe(403);
  });

  // TC_5.6
  test('TC_5.6: POST /api/products (User thường) -> Chặn 403', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: mockUserId, isAdmin: false })
    });

    const res = await request(app).post('/api/products').set('Cookie', [userCookie]);
    expect(res.statusCode).toBe(403);
  });

  // TC_5.7
  test('TC_5.7: PUT /api/users/:id (Admin cập nhật user) -> 200 OK', async () => {
    const findByIdSpy = jest.spyOn(User, 'findById');
    
    // Lần gọi 1: Auth middleware check admin
    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({ _id: mockAdminId, isAdmin: true })
    });
    // Lần gọi 2: Controller tìm user để edit
    findByIdSpy.mockReturnValueOnce({
      _id: mockUserId,
      name: 'Dat',
      save: jest.fn().mockResolvedValue(true)
    });

    const res = await request(app)
      .put(`/api/users/${mockUserId}`)
      .set('Cookie', [adminCookie])
      .send({ name: 'Dat QA', isAdmin: true });
      
    expect(res.statusCode).toBe(200);
  });
});