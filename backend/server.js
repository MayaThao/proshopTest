import fs from 'fs';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
dotenv.config();
import connectDB from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const port = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Thêm debug log
app.use((req, res, next) => {
  console.log(
    `[DEBUG] ${req.method} ${req.path} - Headers:`,
    req.headers.authorization ? 'HAS TOKEN' : 'NO TOKEN'
  );
  next();
});

app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/config/paypal', (req, res) =>
  res.send({ clientId: process.env.PAYPAL_CLIENT_ID })
);
const __dirname = path.resolve();

// 2. THAY THẾ ĐOẠN IF-ELSE PRODUCTION BẰNG ĐOẠN NÀY:
if (process.env.NODE_ENV === 'production') {
  // Tạo thư mục trên Render nếu chưa tồn tại để tránh lỗi ENOENT
  const prodUploadDir = '/var/data/uploads';
  if (!fs.existsSync(prodUploadDir)) {
    fs.mkdirSync(prodUploadDir, { recursive: true });
  }
  
  app.use('/uploads', express.static(prodUploadDir));
  app.use(express.static(path.join(__dirname, '/frontend/build')));

  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
  );
} else {
  // Tạo thư mục uploads ở máy Local nếu chưa tồn tại
  const localUploadDir = path.join(__dirname, '/uploads');
  if (!fs.existsSync(localUploadDir)) {
    fs.mkdirSync(localUploadDir, { recursive: true });
  }

  app.use('/uploads', express.static(localUploadDir));
  app.get('/', (req, res) => {
    res.send('API is running....');
  });
}
app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () =>
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${port}`
    )
  );
}

export default app;
