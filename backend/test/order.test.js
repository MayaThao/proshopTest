import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../../backend/server.js';
import User from '../../backend/models/userModel.js';
import Order from '../../backend/models/orderModel.js';
import Product from '../../backend/models/productModel.js';

describe('=== PROJ-14: ORDER TEST ===', () => {
  let userCookie;

  const mockUserId = '60d5ec49f83d513d3c1a3b51';
  const mockOrderId = '60d5ec49f83d513d3c1a3b52';
  const mockProductId = '60d5ec49f83d513d3c1a3b53';

  beforeAll(() => {

    process.env.JWT_SECRET = 'chuoi_bi_mat_test_123';

    userCookie =
      `jwt=${jwt.sign(
        { userId: mockUserId },
        process.env.JWT_SECRET
      )}`;

  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  // TC_4.1
  test('TC_4.1: Create Order Success -> 201 Created', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId,
      isAdmin: false
    })
  });

  jest.spyOn(Product, 'find').mockResolvedValue([
    {
      _id: mockProductId,
      price: 100
    }
  ]);

  jest.spyOn(Order.prototype, 'save')
    .mockResolvedValue({
      _id: mockOrderId
    });

  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', [userCookie])
    .send({
      orderItems: [
        {
          _id: mockProductId,
          qty: 1
        }
      ],
      shippingAddress: {
        address: 'HCM'
      },
      paymentMethod: 'PayPal'
    });

  expect(res.statusCode).toBe(201);

});

// TC_4.2
test('TC_4.2: Empty Order Items -> 400', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', [userCookie])
    .send({
      orderItems: []
    });

  expect(res.statusCode).toBe(400);

});
  // TC_4.3
  test('TC_4.3: Create Order Without Login -> 401', async () => {

  const res = await request(app)
    .post('/api/orders')
    .send({});

  expect(res.statusCode).toBe(401);

});
// TC_4.4
test('TC_4.4: Get My Orders -> 200', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  jest.spyOn(Order, 'find')
    .mockResolvedValue([
      {
        _id: mockOrderId,
        totalPrice: 100
      }
    ]);

  const res = await request(app)
    .get('/api/orders/mine')
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(200);

});
// TC_4.5
test('TC_4.5: Get Order By ID -> 200', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  jest.spyOn(Order, 'findById').mockReturnValue({
    populate: jest.fn().mockResolvedValue({
      _id: mockOrderId,
      totalPrice: 100
    })
  });

  const res = await request(app)
    .get(`/api/orders/${mockOrderId}`)
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(200);

});
 // TC_4.6
test('TC_4.6: Order Not Found -> 404', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  jest.spyOn(Order, 'findById').mockReturnValue({
    populate: jest.fn().mockResolvedValue(null)
  });

  const res = await request(app)
    .get(`/api/orders/${mockOrderId}`)
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(404);

}); 
// TC_4.11
test('TC_4.11: Missing Shipping Address -> 400', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId
    })
  });

  jest.spyOn(Product, 'find').mockResolvedValue([
    {
      _id: mockProductId,
      price: 100
    }
  ]);

  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', [userCookie])
    .send({
      orderItems: [
        {
          _id: mockProductId,
          qty: 1
        }
      ],
      paymentMethod: 'PayPal'
    });

  expect([400, 500]).toContain(res.statusCode);

});
// TC_4.13
test('TC_4.13: Get Orders Admin Success -> 200', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId,
      isAdmin: true
    })
  });

  jest.spyOn(Order, 'find').mockReturnValue({
    populate: jest.fn().mockResolvedValue([
      {
        _id: mockOrderId
      }
    ])
  });

  const res = await request(app)
    .get('/api/orders')
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(200);

});
// TC_4.14
test('TC_4.14: Get Orders Without Admin -> 403', async () => {

  jest.spyOn(User, 'findById').mockReturnValue({
    select: jest.fn().mockResolvedValue({
      _id: mockUserId,
      isAdmin: false
    })
  });

  const res = await request(app)
    .get('/api/orders')
    .set('Cookie', [userCookie]);

  expect(res.statusCode).toBe(403);

});
});