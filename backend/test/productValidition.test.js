import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { jest } from '@jest/globals';

// ---- Mock Product model (Mongoose) ----
jest.unstable_mockModule('../models/productModel.js', () => ({
  default: {
    findById: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

// Import sau khi mock (bắt buộc với ESM + jest.unstable_mockModule)
const { default: Product } = await import('../models/productModel.js');
const { getProducts, getProductById, createProductReview } =
  await import('../controllers/productController.js');

const productId = new mongoose.Types.ObjectId().toString();
const userToken = 'Bearer-user-token';

// ---- App test: middleware auth giả lập dựa trên token ----
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth === userToken) {
    req.user = { _id: 'user123', name: 'Test User', isAdmin: false };
  }
  next();
});

const requireAuth = (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
  next();
};

// Middleware giả lập kiểm tra ObjectId hợp lệ
// (thay cho middleware checkObjectId thật của project nếu có)
const checkObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404);
    return next(new Error(`Invalid ObjectId of: ${req.params.id}`));
  }
  next();
};

app.get('/api/products', getProducts);
app.get('/api/products/:id', checkObjectId, getProductById);
app.post('/api/products/:id/reviews', requireAuth, createProductReview);

app.use((err, req, res, next) => {
  const statusCode =
    res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({ message: err.message });
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// TC_2.12 - getProducts - page out of range
// ============================================================
describe('TC_2.12 - getProducts page out of range', () => {
  it('GET /api/products?pageNumber=999 trả về 200 OK và products array rỗng', async () => {
    Product.countDocuments.mockResolvedValue(5); // DB chỉ có 5 sản phẩm

    const findMock = {
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue([]), // page 999 vượt quá -> mảng rỗng
    };
    Product.find.mockReturnValue(findMock);

    const res = await request(app)
      .get('/api/products')
      .query({ pageNumber: 999 });

    expect(res.statusCode).toBe(200);
    expect(res.body.products).toEqual([]);
  });
});

// ============================================================
// TC_2.13 - getProductById - invalid ObjectId
// ============================================================
describe('TC_2.13 - getProductById invalid ObjectId', () => {
  it("GET /api/products/abc123 trả về 404 và message 'Invalid ObjectId'", async () => {
    const res = await request(app).get('/api/products/abc123');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Invalid ObjectId/i);
  });
});

// ============================================================
// TC_2.14 - createReview - rating out of range
// ============================================================
describe('TC_2.14 - createReview rating out of range', () => {
  it('POST /api/products/:id/reviews với rating=10 trả về 400 Bad Request', async () => {
    const mockProduct = {
      _id: productId,
      reviews: [],
      numReviews: 0,
      rating: 0,
      save: jest.fn(),
    };
    Product.findById.mockResolvedValue(mockProduct);

    const res = await request(app)
      .post(`/api/products/${productId}/reviews`)
      .set('Authorization', userToken)
      .send({ rating: 10, comment: 'Rating không hợp lệ' });

    expect(res.statusCode).toBe(400);
    expect(mockProduct.save).not.toHaveBeenCalled();
  });
});

// ============================================================
// TC_2.15 - createReview - missing comment
// ============================================================
describe('TC_2.15 - createReview missing comment', () => {
  it('POST /api/products/:id/reviews thiếu comment trả về 400 Bad Request', async () => {
    const mockProduct = {
      _id: productId,
      reviews: [],
      numReviews: 0,
      rating: 0,
      save: jest.fn(),
    };
    Product.findById.mockResolvedValue(mockProduct);

    const res = await request(app)
      .post(`/api/products/${productId}/reviews`)
      .set('Authorization', userToken)
      .send({ rating: 5 }); // thiếu comment

    expect(res.statusCode).toBe(400);
    expect(mockProduct.save).not.toHaveBeenCalled();
  });
});
