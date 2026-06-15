import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import User from '../../backend/models/userModel.js';

describe('[F1] TC_1.1–1.6 Auth Unit Tests', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'proshopnhomsecret';
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Xóa mock sau mỗi test
  });

  // TC_1.1: Login thành công
  test('TC_1.1 Login success → 200 OK, trả về userInfo + cookie jwt', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      _id: '60d5ec49f83d513d3c1a3b50',
      name: 'Test User',
      email: 'test@email.com',
      isAdmin: false,
      matchPassword: jest.fn().mockResolvedValue(true),
    });

    const res = await request(app)
      .post('/api/users/auth')
      .send({ email: 'test@email.com', password: '123456' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      name: 'Test User',
      email: 'test@email.com',
      isAdmin: false,
    });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  // TC_1.2: Sai password
  test('TC_1.2 Login wrong password → 401 Unauthorized', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      email: 'test@email.com',
      matchPassword: jest.fn().mockResolvedValue(false), // password sai
    });

    const res = await request(app)
      .post('/api/users/auth')
      .send({ email: 'test@email.com', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // TC_1.3: Thiếu email
  test('TC_1.3 Login missing email → 401 (không tìm thấy user)', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null); // không tìm thấy user

    const res = await request(app)
      .post('/api/users/auth')
      .send({ password: '123456' }); // thiếu email

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  // TC_1.4: Đăng ký thành công
  test('TC_1.4 Register success → 201 Created, trả về userInfo + cookie jwt', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null); // email chưa tồn tại

    jest.spyOn(User, 'create').mockResolvedValue({
      _id: '60d5ec49f83d513d3c1a3b51',
      name: 'New User',
      email: 'new@email.com',
      isAdmin: false,
    });

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'New User', email: 'new@email.com', password: '123456' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      name: 'New User',
      email: 'new@email.com',
    });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  // TC_1.5: Email đã tồn tại
  test('TC_1.5 Register duplicate email → 400, "User already exists"', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue({
      email: 'existing@email.com', // email đã có trong DB
    });

    const res = await request(app).post('/api/users').send({
      name: 'Another User',
      email: 'existing@email.com',
      password: '123456',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/user already exists/i);
  });

  // TC_1.6: Logout
  test('TC_1.6 Logout → 200 OK, cookie jwt bị xóa', async () => {
    const res = await request(app).post('/api/users/logout');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/logged out successfully/i);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/jwt=/);
  });
});
