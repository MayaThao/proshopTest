module.exports = {
  // Chỉ định Jest sử dụng sucrase để tự động chuyển đổi mã 'import' thành 'require' lúc chạy test
  transform: {
    '.*\\.(js|jsx|ts|tsx)$': '@sucrase/jest-plugin',
  },
  // Khai báo môi trường chạy test là Node.js
  testEnvironment: 'node',
};