import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import User from '../../backend/models/userModel.js';

describe('[F1] TC_1.7–1.10 Middleware Tests', () => {
  const mockUserId = '60d5ec49f83d513d3c1a3b50';
  const mockAdminId = '60d5ec49f83d513d3c1a3b51';
  let userCookie, adminCookie;

  beforeAll(() => {
    process.env.JWT_SECRET = 'proshopnhomsecret';
    userCookie = `jwt=${jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET)}`;
    adminCookie = `jwt=${jwt.sign({ userId: mockAdminId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────
  // TC_1.7: protect – token hợp lệ
  // ─────────────────────────────────────────────
  test('TC_1.7 protect valid token → 200 OK, trả về profile', async () => {
    const mockUser = {
      _id: mockUserId,
      name: 'Test User',
      email: 'test@email.com',
      isAdmin: false,
    };

    const findByIdSpy = jest.spyOn(User, 'findById');

    // Lần 1: protect middleware gọi findById().select('-password')
    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue(mockUser),
    });

    // Lần 2: getUserProfile controller gọi findById()
    findByIdSpy.mockResolvedValueOnce(mockUser);

    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', [userCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      email: 'test@email.com',
      name: 'Test User',
    });
  });

  // ─────────────────────────────────────────────
  // TC_1.8: protect – không có token
  // ─────────────────────────────────────────────
  test('TC_1.8 protect no token → 401 Unauthorized, "Not authorized"', async () => {
    const res = await request(app).get('/api/users/profile'); // Không gửi cookie

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  // ─────────────────────────────────────────────
  // TC_1.9: admin – user có isAdmin=true
  // ─────────────────────────────────────────────
  test('TC_1.9 admin allowed (isAdmin=true) → 200 OK', async () => {
    const findByIdSpy = jest.spyOn(User, 'findById');

    // Lần 1: protect middleware
    findByIdSpy.mockReturnValueOnce({
      select: jest.fn().mockResolvedValue({
        _id: mockAdminId,
        name: 'Admin User',
        email: 'admin@email.com',
        isAdmin: true,
      }),
    });

    // Mock User.find({}) cho getUsers controller
    jest
      .spyOn(User, 'find')
      .mockResolvedValue([
        { _id: mockUserId, name: 'Test User', email: 'test@email.com' },
      ]);

    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [adminCookie]);

    expect(res.statusCode).toBe(200);
  });

  // ─────────────────────────────────────────────
  // TC_1.10: admin – user thường (isAdmin=false)
  // ─────────────────────────────────────────────
  test('TC_1.10 admin forbidden (isAdmin=false) → 403 Forbidden', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Regular User',
        email: 'user@email.com',
        isAdmin: false,
      }),
    });

    const res = await request(app)
      .get('/api/users')
      .set('Cookie', [userCookie]);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized as an admin/i);
  });
});
