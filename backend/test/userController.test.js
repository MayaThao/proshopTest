import request from 'supertest';

const app = 'http://127.0.0.1:5000'; 

describe('Feature 3 — User Profile Testing (Sprint 2 - PROJ-11)', () => {
  let authCookie; 
  const testEmail = 'tung.testprofile@example.com'; 

  beforeAll(async () => {
    /**
     * Đăng nhập chuẩn xác qua route thực tế: /api/users/auth
     * Đảm bảo tài khoản email và password này đang tồn tại trong Database thực tế của bạn
     */
    const loginRes = await request(app)
      .post('/api/users/auth') 
      .send({
        email: 'tung.testprofile@example.com', // <-- SỬA LẠI: Email có thật trong DB của bạn
        password: 'newSecurePassword123'          // <-- SỬA LẠI: Password chính xác của tài khoản đó
      });

    if (loginRes.statusCode === 200) {
      authCookie = loginRes.headers['set-cookie']; 
      console.log('Successfully authenticated via Cookie!');
    } else {
      throw new Error(`[Setup Fail] Không thể đăng nhập lấy Cookie bảo mật. API trả về: ${loginRes.statusCode} - ${JSON.stringify(loginRes.body)}`);
    }
  });

  // TC_3.1: getUserProfile – success
  it('TC_3.1: Should return 200 OK and profile data for logged-in user', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', authCookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('email');
  });

  // TC_3.2: getUserProfile – 401
  it('TC_3.2: Should return 401 Unauthorized when no token is provided', async () => {
    const res = await request(app)
      .get('/api/users/profile');

    expect(res.statusCode).toEqual(401);
  });

  // TC_3.3: getUserProfile – no pass
  it('TC_3.3: Should NOT include password field in the response data', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Cookie', authCookie);

    expect(res.statusCode).toEqual(200);
    expect(res.body.password).toBeUndefined();
  });

  // TC_3.4: updateUserProfile
  it('TC_3.4: Should update name and email successfully', async () => {
    const updatedData = {
      name: 'Nguyễn Nhật Tùng Updated',
      email: testEmail
    };

    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', authCookie)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body.name).toEqual(updatedData.name);
    expect(res.body.email).toEqual(updatedData.email);
    
    if (res.headers['set-cookie']) {
      authCookie = res.headers['set-cookie'];
    }
  });

  // TC_3.5: updateUserProfile – pass
  it('TC_3.5: Should update password successfully and allow re-login', async () => {
    const updatedPassword = {
      password: 'newSecurePassword123'
    };

    const res = await request(app)
      .put('/api/users/profile')
      .set('Cookie', authCookie)
      .send(updatedPassword);

    expect(res.statusCode).toEqual(200);
    
    const loginRes = await request(app)
      .post('/api/users/auth')
      .send({
        email: testEmail, 
        password: 'newSecurePassword123' 
      });
    expect(loginRes.statusCode).toEqual(200);
  });
});