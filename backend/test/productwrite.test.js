import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../backend/server.js';
import User from '../../backend/models/userModel.js';
import Product from '../../backend/models/productModel.js';

describe('=== PROJ-9: PRODUCT WRITE TESTS (TC_2.6 - TC_2.11) ===', () => {
  const mockAdminId = '60d5ec49f83d513d3c1a3b50';
  const mockUserId = '60d5ec49f83d513d3c1a3b51';
  const mockProductId = '60d5ec49f83d513d3c1a3b52';
  let adminCookie, userCookie;

  beforeAll(() => {
    process.env.JWT_SECRET = 'proshopnhomsecret';
    adminCookie = `jwt=${jwt.sign({ userId: mockAdminId }, process.env.JWT_SECRET)}`;
    userCookie = `jwt=${jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET)}`;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────
  // TC_2.6: Update product thành công
  // Pre-condition: Product tồn tại, token admin
  // ─────────────────────────────────────────────
  test('TC_2.6: PUT /api/products/:id (admin) → 200 OK, sản phẩm được cập nhật', async () => {
    // Mock protect middleware
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockAdminId,
        isAdmin: true,
      }),
    });

    // Mock product tìm thấy + save
    const mockProduct = {
      _id: mockProductId,
      name: 'Old Name',
      price: 100,
      description: 'Old desc',
      image: '/images/old.jpg',
      brand: 'Old brand',
      category: 'Old category',
      countInStock: 5,
      save: jest.fn().mockResolvedValue({
        _id: mockProductId,
        name: 'New Name',
        price: 200,
        description: 'New desc',
        image: '/images/new.jpg',
        brand: 'New brand',
        category: 'New category',
        countInStock: 10,
      }),
    };
    jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

    const res = await request(app)
      .put(`/api/products/${mockProductId}`)
      .set('Cookie', [adminCookie])
      .send({
        name: 'New Name',
        price: 200,
        description: 'New desc',
        image: '/images/new.jpg',
        brand: 'New brand',
        category: 'New category',
        countInStock: 10,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ name: 'New Name', price: 200 });
  });

  // ─────────────────────────────────────────────
  // TC_2.7: Delete product thành công
  // Pre-condition: Product tồn tại, token admin
  // ─────────────────────────────────────────────
  test('TC_2.7: DELETE /api/products/:id (admin) → 200 OK, "Product removed"', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockAdminId,
        isAdmin: true,
      }),
    });

    jest.spyOn(Product, 'findById').mockResolvedValue({
      _id: mockProductId,
      name: 'Test Product',
    });

    jest.spyOn(Product, 'deleteOne').mockResolvedValue({ deletedCount: 1 });

    const res = await request(app)
      .delete(`/api/products/${mockProductId}`)
      .set('Cookie', [adminCookie]);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/product removed/i);
  });

  // ─────────────────────────────────────────────
  // TC_2.8: Create review thành công
  // Pre-condition: User đã đăng nhập
  // ─────────────────────────────────────────────
  test('TC_2.8: POST /api/products/:id/reviews → 201 Created, review được thêm', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Test User',
        isAdmin: false,
      }),
    });

    const mockProduct = {
      _id: mockProductId,
      reviews: [],
      numReviews: 0,
      rating: 0,
      save: jest.fn().mockResolvedValue(true),
    };
    // reviews.find trả về undefined (chưa review)
    mockProduct.reviews.find = jest.fn().mockReturnValue(undefined);

    jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

    const res = await request(app)
      .post(`/api/products/${mockProductId}/reviews`)
      .set('Cookie', [userCookie])
      .send({ rating: 5, comment: 'Great product!' });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/review added/i);
  });

  // ─────────────────────────────────────────────
  // TC_2.9: Create review trùng lặp
  // Pre-condition: User đã review trước đó
  // ─────────────────────────────────────────────
  test('TC_2.9: POST /api/products/:id/reviews lần 2 → 400, "Product already reviewed"', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockUserId,
        name: 'Test User',
        isAdmin: false,
      }),
    });

    const mockProduct = {
      _id: mockProductId,
      reviews: [{ user: mockUserId }],
      numReviews: 1,
      rating: 5,
    };
    // reviews.find trả về review đã tồn tại
    mockProduct.reviews.find = jest.fn().mockReturnValue({
      user: mockUserId,
    });

    jest.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

    const res = await request(app)
      .post(`/api/products/${mockProductId}/reviews`)
      .set('Cookie', [userCookie])
      .send({ rating: 4, comment: 'Review again!' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/product already reviewed/i);
  });

  // ─────────────────────────────────────────────
  // TC_2.10: Get top products
  // Pre-condition: DB có ≥3 sản phẩm
  // ─────────────────────────────────────────────
  test('TC_2.10: GET /api/products/top → 200 OK, 3 sản phẩm rating cao nhất', async () => {
    jest.spyOn(Product, 'find').mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          { _id: '1', name: 'Product A', rating: 5 },
          { _id: '2', name: 'Product B', rating: 4.5 },
          { _id: '3', name: 'Product C', rating: 4 },
        ]),
      }),
    });

    const res = await request(app).get('/api/products/top');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  // ─────────────────────────────────────────────
  // TC_2.11: Upload product image
  // Pre-condition: Token admin, file ảnh hợp lệ
  // ─────────────────────────────────────────────
  test('TC_2.11: POST /api/upload (admin) → 200 OK, trả về image path', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: mockAdminId,
        isAdmin: true,
      }),
    });

    const res = await request(app)
      .post('/api/upload')
      .set('Cookie', [adminCookie])
      .attach('image', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('image');
  });
});
