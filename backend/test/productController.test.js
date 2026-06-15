import { jest } from '@jest/globals';

// Tạo các hàm mock độc lập
const mockCountDocuments = jest.fn();
const mockFindById = jest.fn();

// Giả lập chuỗi hàm (Method Chaining): Product.find().limit().skip()
const mockSkip = jest.fn();
const mockLimit = jest.fn(() => ({
  skip: mockSkip,
}));
const mockFind = jest.fn(() => ({
  limit: mockLimit,
}));

// Tạo một Constructor giả lập cho "new Product"
function MockProduct(data) {
  this.name = data.name;
  this.price = data.price;
  this.user = data.user;
  this.image = data.image;
  this.brand = data.brand;
  this.category = data.category;
  this.countInStock = data.countInStock;
  this.numReviews = data.numReviews;
  this.description = data.description;
}

// Gắn các hàm Static của Mongoose vào Constructor MockProduct
MockProduct.find = mockFind;
MockProduct.findById = mockFindById;
MockProduct.countDocuments = mockCountDocuments;

// Giả lập hàm prototype.save() khi gọi "await product.save()"
MockProduct.prototype.save = jest.fn().mockImplementation(function () {
  return Promise.resolve(this);
});

// Tiến hành Mock module nguyên bản
jest.unstable_mockModule('../models/productModel.js', () => ({
  default: MockProduct,
}));

// Import các controller sau khi Mock hoàn tất
const { getProducts, getProductById, createProduct } =
  await import('../controllers/productController.js');

describe('Bộ kiểm thử Product Controller (Đã Fix Lỗi)', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      query: {},
      params: {},
      user: { _id: 'admin_user_id' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    process.env.PAGINATION_LIMIT = '2';
  });

  // --- TC_2.1 ---
  test('TC_2.1: getProducts – default (Lấy danh sách mặc định)', async () => {
    const mockProductsList = [{ name: 'Product 1' }, { name: 'Product 2' }];
    mockCountDocuments.mockResolvedValue(2);
    mockSkip.mockResolvedValue(mockProductsList); // Trả về mảng sạch, không bị dính link chuỗi hàm

    await getProducts(req, res);

    expect(mockCountDocuments).toHaveBeenCalledWith({});
    expect(mockFind).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith({
      products: mockProductsList,
      page: 1,
      pages: 1,
    });
  });

  // --- TC_2.2 ---
  test('TC_2.2: getProducts – search (Tìm kiếm theo keyword)', async () => {
    req.query.keyword = 'iphone';
    const mockProductsList = [{ name: 'iPhone 13' }];

    mockCountDocuments.mockResolvedValue(1);
    mockSkip.mockResolvedValue(mockProductsList);

    await getProducts(req, res);

    const expectedKeywordMatch = {
      name: {
        $regex: 'iphone',
        $options: 'i',
      },
    };

    expect(mockCountDocuments).toHaveBeenCalledWith(expectedKeywordMatch);
    expect(mockFind).toHaveBeenCalledWith(expectedKeywordMatch);
    expect(res.json).toHaveBeenCalledWith({
      products: mockProductsList,
      page: 1,
      pages: 1,
    });
  });

  // --- TC_2.3 ---
  test('TC_2.3: getProductById – found (Tìm thấy sản phẩm theo ID)', async () => {
    const validId = '65cf1234567890abcdef1234';
    req.params.id = validId;
    const mockProduct = { _id: validId, name: 'Sản phẩm tồn tại' };

    mockFindById.mockResolvedValue(mockProduct);

    await getProductById(req, res);

    expect(mockFindById).toHaveBeenCalledWith(validId);
    expect(res.json).toHaveBeenCalledWith(mockProduct);
  });

  // --- TC_2.4 ---
  test('TC_2.4: getProductById – 404 (Sản phẩm không tồn tại)', async () => {
    const missingId = '65cf00000000000000000000';
    req.params.id = missingId;

    mockFindById.mockResolvedValue(null);

    await expect(getProductById(req, res)).rejects.toThrow('Product not found');
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // --- TC_2.5 ---
  test('TC_2.5: createProduct (Tạo mới sản phẩm mẫu)', async () => {
    await createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sample name',
        price: 0,
        user: 'admin_user_id',
      })
    );
  });
});
