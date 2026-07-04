# Feature 3 — User Profile: Test Design (EP + BVA + Test Case + Whitebox + Coverage + Automation)

**Mô tả:** Tài liệu này trình bày thiết kế test case cho chức năng Hồ sơ người dùng (User Profile) — bao gồm xem/cập nhật thông tin cá nhân của chính người dùng, và các chức năng quản lý người dùng dành cho quản trị viên (xem danh sách, xem chi tiết, cập nhật vai trò, xoá người dùng) — theo đúng phương pháp luận: Equivalence Partitioning → Boundary Value Analysis → Test case design → Unit test tự động → Whitebox testing → Đo độ phủ → Automation. Cấu trúc tài liệu bám theo mẫu chung đã áp dụng cho Feature 1 (Authentication) và Feature 2 (Product).

---

## 1. Đặc tả chức năng

| Chức năng | Input | Điều kiện xử lý | Output |
|---|---|---|---|
| **Xem hồ sơ cá nhân** | Token của người dùng hiện tại | Người dùng phải đã đăng nhập (xác thực theo cơ chế đã mô tả ở Feature 1) | Trả về thông tin cá nhân (tên, email...), **không bao gồm** trường password |
| **Cập nhật hồ sơ cá nhân** | `name`, `email`, `password` (tất cả tuỳ chọn), token hiện tại | Nếu đổi email: email mới không được trùng với email của người dùng khác. Nếu không gửi `password`: giữ nguyên password cũ | Trả về thông tin đã cập nhật + token mới; nếu không gửi field nào thì giữ nguyên thông tin cũ |
| **Xem danh sách người dùng (admin)** | Vai trò quản trị viên | Người gọi phải có vai trò admin | Trả về danh sách toàn bộ người dùng |
| **Xem chi tiết 1 người dùng (admin)** | `userId`, vai trò quản trị viên | `userId` đúng định dạng VÀ tồn tại trong hệ thống, người gọi là admin | Trả về thông tin người dùng tương ứng |
| **Cập nhật người dùng (admin)** | `userId`, dữ liệu cập nhật (bao gồm vai trò `isAdmin`), vai trò quản trị viên | Người dùng đích tồn tại; nếu đổi email thì không được trùng với người dùng khác | Trả về thông tin người dùng đã cập nhật |
| **Xoá người dùng (admin)** | `userId`, vai trò quản trị viên | Người dùng đích phải tồn tại VÀ **không được phép xoá một tài khoản admin khác** | Xoá thành công người dùng thường; từ chối nếu đích là admin hoặc không tồn tại |

**Công thức logic tổng quát:**

```
ViewProfileValid   = (đã đăng nhập hợp lệ, theo AccessValid ở Feature 1)
UpdateProfileValid = (đã đăng nhập hợp lệ) AND (email mới, nếu có, không trùng người dùng khác)
AdminListValid     = (vai trò = admin)
AdminDetailValid   = (vai trò = admin) AND (userId đúng định dạng) AND (người dùng đích tồn tại)
AdminUpdateValid   = (vai trò = admin) AND (người dùng đích tồn tại) AND (email mới, nếu có, không trùng người dùng khác)
AdminDeleteValid   = (vai trò = admin) AND (người dùng đích tồn tại) AND (người dùng đích KHÔNG phải admin)
```

**Giả định của bài toán:**
1. Chỉ xét dữ liệu đầu vào hợp lệ về kiểu dữ liệu (chuỗi cho name/email/password, chuỗi hex cho userId).
2. Định dạng `userId` áp dụng cùng quy tắc đã nêu ở Feature 1 (24 ký tự hex).
3. "Không được xoá admin khác" là một ràng buộc nghiệp vụ bổ sung nhằm tránh mất quyền quản trị hệ thống — cần xác nhận với người ra đề nếu đặc tả gốc không nêu rõ; nếu hệ thống không có ràng buộc này thì TC12 (mục 4) sẽ chuyển từ "Không hợp lệ" sang một luồng khác.

---

## 2. Câu 1 — Phân hoạch lớp tương đương (Equivalence Partitioning)

| Biến đầu vào | Lớp hợp lệ | Tag | Lớp không hợp lệ | Tag |
|---|---|---|---|---|
| **Trạng thái đăng nhập (xem/sửa hồ sơ)** | Đã đăng nhập, token hợp lệ | V1 | Không có token | X1 |
| **Email (cập nhật hồ sơ/admin cập nhật user)** | Không đổi, hoặc đổi sang email chưa ai dùng | V2 | Đổi sang email đã có người khác dùng | X2 |
| | | | Email sai định dạng | X3 |
| **Password (cập nhật hồ sơ)** | Không gửi (giữ nguyên) | V3 | Gửi giá trị rỗng `""` | X4 |
| | Gửi password mới hợp lệ | V4 | | |
| **Nội dung body khi cập nhật** | Có ít nhất 1 field hợp lệ | V5 | Body rỗng `{}` | X5 |
| **userId (admin xem/sửa/xoá)** | Đúng định dạng, tồn tại | V6 | Sai định dạng | X6 |
| | | | Đúng định dạng nhưng không tồn tại | X7 |
| **Vai trò người gọi (chức năng admin)** | Vai trò = admin | V7 | Vai trò = người dùng thường | X8 |
| **Vai trò người dùng đích (khi xoá)** | Người dùng thường | V8 | Là admin khác | X9 |

*Mỗi biến đều có ≥1 lớp hợp lệ và ≥2 lớp không hợp lệ theo yêu cầu (riêng "body rỗng" và "vai trò đích khi xoá" có bản chất nhị phân nên chỉ có 1 lớp không hợp lệ tương ứng với đúng 1 tình huống thực tế).*

---

## 3. Câu 2 — Phân tích giá trị biên (Boundary Value Analysis)

Chức năng User Profile không phát sinh biến số học mới ngoài định dạng ID đã áp dụng ở Feature 1 và Feature 2. Áp dụng lại quy tắc đó cho `userId`, đồng thời bổ sung một khía cạnh boundary đặc trưng của chức năng này: **số lượng field được gửi khi cập nhật hồ sơ**.

### 3.1. Độ dài `userId` (áp dụng lại quy tắc đã định nghĩa ở Feature 1)

| Biến | min | min+ | nominal | max- | max | Tag biên |
|---|---:|---:|---:|---:|---:|---|
| Độ dài userId | 24 (hợp lệ) | — | 24 | 23 | 25 | B1 (=24, hợp lệ), B2 (23, invalid), B3 (25, invalid) |

### 3.2. Số lượng field gửi khi cập nhật hồ sơ (biên rời rạc, không phải khoảng số liên tục)

| Biến | min (0 field) | nominal (1–2 field) | max (tất cả field: name, email, password) | Tag biên |
|---|---:|---:|---:|---|
| Số field trong body cập nhật | 0 | 1–2 | 3 | B4 (0 field, biên dưới — không lỗi nhưng không thay đổi gì), B5 (nominal), B6 (đầy đủ field) |

> Ghi chú: đây không phải BVA cổ điển trên 1 khoảng số liên tục như `tinChi`/`gpa`, mà là ranh giới **số lượng phần tử tuỳ chọn** trong 1 tập hợp — một dạng biến thể của boundary thường gặp với API có nhiều field tuỳ chọn. B4 (0 field) là trường hợp biên dễ bị bỏ sót nhất, vì nhiều hệ thống không xử lý rõ ràng "body rỗng" (nên/không nên coi là lỗi).

---

## 4. Câu 3 — Bảng test case

| STT | Tên test case | Input | Kết quả mong đợi | Tag được bao phủ |
|---:|---|---|---|---|
| 1 | Xem hồ sơ cá nhân – thành công | Token hợp lệ | Trả về name/email, **không có** field password — **Hợp lệ** | V1 |
| 2 | Xem hồ sơ cá nhân – không có token | Không gửi token | Từ chối truy cập — **Không hợp lệ**: thiếu token | X1 |
| 3 | Xem hồ sơ cá nhân – kiểm tra ẩn password | Token hợp lệ | Response không chứa field password dưới bất kỳ hình thức nào — **Hợp lệ** | V1 |
| 4 | Cập nhật hồ sơ – đổi tên và email | Token hợp lệ, `name` + `email` mới hợp lệ | Cập nhật thành công, trả về token mới — **Hợp lệ** | V1, V2, V5 |
| 5 | Cập nhật hồ sơ – đổi password | Token hợp lệ, `password` mới | Cập nhật thành công, đăng nhập lại được bằng password mới — **Hợp lệ** | V1, V4 |
| 6 | Xem danh sách người dùng (admin) | Vai trò admin | Trả về danh sách toàn bộ người dùng — **Hợp lệ** | V7 |
| 7 | Xem chi tiết 1 người dùng (admin) | `userId` hợp lệ, tồn tại, vai trò admin | Trả về đúng thông tin người dùng — **Hợp lệ** | V6, V7 |
| 8 | Xoá người dùng (admin) – thành công | `userId` của người dùng thường, vai trò admin | Xoá thành công, báo "đã xoá người dùng" — **Hợp lệ** | V6, V7, V8 |
| 9 | Cập nhật hồ sơ – email trùng người khác | Token hợp lệ, `email` trùng với người dùng khác đã tồn tại | Kỳ vọng từ chối, báo lỗi trùng email — **Không hợp lệ**: trùng email | X2 |
| 10 | Xem chi tiết người dùng (admin) – không tồn tại | `userId` đúng định dạng nhưng không có trong hệ thống, vai trò admin | Từ chối, báo "không tìm thấy người dùng" — **Không hợp lệ**: userId không tồn tại | X7 |
| 11 | Cập nhật hồ sơ – body rỗng | Token hợp lệ, body `{}` | Kỳ vọng giữ nguyên thông tin cũ, không lỗi — **Biên**: 0 field | X5, B4 |
| 12 | Xoá người dùng (admin) – đích là admin khác | `userId` của một tài khoản admin khác, vai trò admin | Kỳ vọng từ chối, báo "không thể xoá tài khoản admin" — **Không hợp lệ**: đích là admin | X9 |

*Đã ≥8 test case, có cả hợp lệ/không hợp lệ, có test tại biên (TC11), expected result ghi rõ kèm lý do, mỗi TC có tag — đủ yêu cầu Câu 3.*

---



  // TC10 — Không hợp lệ ngoài biên: userId không tồn tại
  it('trả 404 khi admin xem userId hợp lệ nhưng không tồn tại', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/auth').send({ email: 'admin@email.com', password: 'adminpass' });
    const res = await agent.get('/api/users/60d5ec49f83d513d3c1a3b99');
    expect(res.status).toBe(404);
  });

  // TC1/TC3 — Lớp hợp lệ V1: xem hồ sơ, không lộ password
  it('trả về hồ sơ cá nhân và không chứa field password', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/auth').send({ email: 'john@email.com', password: '123456' });
    const res = await agent.get('/api/users/profile');
    expect(res.status).toBe(200);
    expect(res.body.password).toBeUndefined();
  });

  // TC9 — Lớp không hợp lệ X2: email trùng
  it('từ chối cập nhật hồ sơ khi email trùng với người dùng khác', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/auth').send({ email: 'john@email.com', password: '123456' });
    const res = await agent.put('/api/users/profile').send({ email: 'jane@email.com' });
    expect(res.status).toBe(400);
  });

  // TC12 — Lớp không hợp lệ X9: xoá admin khác
  it('từ chối xoá một tài khoản admin khác', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/auth').send({ email: 'admin@email.com', password: 'adminpass' });
    const res = await agent.delete('/api/users/60d5ec49f83d513d3c1a3b01'); // ID của 1 admin khác
    expect(res.status).toBe(400);
  });
});
```

**Yêu cầu bắt buộc đã đáp ứng:** ≥2 unit test tại biên (TC11 tại B4, TC10 ở lớp X7 gắn với biên "tồn tại/không tồn tại"), có ≥1 case hợp lệ tại biên (TC11), có ≥1 case không hợp lệ ngoài biên (TC10).

---

## 5. Whitebox — CFG, Cyclomatic Complexity, Independent Path

> Control Flow Graph dưới đây được dựng lại từ luồng xử lý mô tả trong đặc tả (mục 1); khi triển khai thực tế, cần đối chiếu lại với luồng xử lý thật của mã nguồn để đảm bảo CFG khớp chính xác.

### 5.1. Chức năng "Xem hồ sơ cá nhân" (getUserProfile)

```
N1: Start
N2: Lấy thông tin người dùng từ token đã xác thực (tái sử dụng luồng "protect" ở Feature 1)
N3: Loại bỏ field password khỏi dữ liệu trả về
N4: End
```

- Không có điểm quyết định mới trong phạm vi hàm này (việc kiểm tra token đã được phân tích riêng ở Feature 1, mục 6.3) → **V(G) = 1**
- 1 path duy nhất → **TC1 / TC3**. Trường hợp "không có token" (**TC2**) thuộc về path của middleware `protect` đã phân tích ở Feature 1, không lặp lại CFG ở đây.

### 5.2. Chức năng "Cập nhật hồ sơ cá nhân" (updateUserProfile) — worked example đầy đủ

```
N1: Start → N2: Nhận {name, email, password} (tuỳ chọn)
N3: [Decision 1] Có đổi email VÀ email mới đã được người khác dùng?
N4:   Từ chối, báo lỗi trùng email          // nhánh True
N5:   Cập nhật name/email (nếu có)          // nhánh False, tiếp tục
N6: [Decision 2] Có gửi password mới?
N7:   Hash và cập nhật password mới          // nhánh True
N8:   Giữ nguyên password cũ                 // nhánh False
N9: Trả về thông tin đã cập nhật + token mới
N10: End
```

- 2 điểm quyết định → **V(G) = 2 + 1 = 3**
- **Independent paths (3):**
  - P1: email trùng người khác → từ chối → **TC9**
  - P2: email hợp lệ (hoặc không đổi), có đổi password → **TC5**
  - P3: email hợp lệ (hoặc không đổi), không đổi password → **TC4 / TC11** (TC11 là trường hợp đặc biệt của path này khi cả `name` cũng không đổi — body rỗng)

### 5.3. Chức năng "Xem chi tiết người dùng" (admin — getUserById)

```
N1: Start → N2: đọc userId từ URL → N3: tìm người dùng theo ID
N4: [Decision] Người dùng có tồn tại?
N5:   Trả về thông tin người dùng      // True
N6:   Từ chối, "User not found"        // False
N7: End
```

- 1 điểm quyết định → **V(G) = 2**
- **Independent paths (2):** P1 (tồn tại) = **TC7**; P2 (không tồn tại) = **TC10**

### 5.4. Chức năng "Xoá người dùng" (admin — deleteUser)

```
N1: Start → N2: tìm người dùng đích theo userId
N3: [Decision 1] Người dùng đích có tồn tại?
N4:   Từ chối, "User not found"                    // False
N5:   [Decision 2] Người dùng đích có phải admin?  // True (tồn tại), tiếp tục kiểm tra
N6:     Từ chối, "Can not delete admin user"        // True (là admin)
N7:     Xoá thành công                              // False (không phải admin)
N8: End
```

- 2 điểm quyết định → **V(G) = 3**
- **Independent paths (3):**
  - P1: không tồn tại → **cần bổ sung test case mới** (chưa có TC riêng cho trường hợp xoá userId không tồn tại trong bộ 12 TC ở mục 4 — gap coverage cần bổ sung)
  - P2: tồn tại, là admin → **TC12**
  - P3: tồn tại, không phải admin → **TC8**

### 5.5. Chức năng "Xem danh sách người dùng" (admin — getUsers)

- Không có điểm quyết định (chỉ kiểm tra vai trò admin ở tầng middleware, đã phân tích ở Feature 1) → **V(G) = 1**
- 1 path duy nhất → **TC6**

### 5.6. Tổng hợp Cyclomatic Complexity

| Chức năng | Số quyết định | V(G) | Số path cần test | Đã có đủ TC? |
|---|---:|---:|---:|---|
| Xem hồ sơ cá nhân | 0 | 1 | 1 | ✅ |
| Cập nhật hồ sơ cá nhân | 2 | 3 | 3 | ✅ |
| Xem chi tiết người dùng (admin) | 1 | 2 | 2 | ✅ |
| Xoá người dùng (admin) | 2 | 3 | 3 | ⚠️ thiếu path "userId không tồn tại" |
| Xem danh sách người dùng (admin) | 0 | 1 | 1 | ✅ |

### 5.7. Bảng đo độ phủ (Coverage Metrics) — phần bắt buộc của Whitebox

> Câu trả lời cuối cùng của phần whitebox: sau khi đã vẽ CFG, tính V(G), liệt kê independent path (6.1–6.6), bảng này đo xem test case thật sự đã **chạy qua** bao nhiêu % số path/nhánh/dòng đó khi triển khai. 4 cột được thêm sau cột Metric: Total, Covered, Coverage %, Tool sử dụng.

<!-- COVERAGE_TABLE_START -->
| Metric (độ phủ) | Total | Covered | Coverage % | Tool sử dụng |
|---|---:|---:|---:|---|
| Statement coverage | 102 | 57 | 55.88% | jest --coverage (Istanbul/nyc) |
| Branch coverage | 53 | 28 | 52.83% | jest --coverage (Istanbul/nyc) |
| Function coverage | 11 | 8 | 72.72% | jest --coverage (Istanbul/nyc) |
| Line coverage | 102 | 57 | 55.88% | jest --coverage (Istanbul/nyc) |
<!-- COVERAGE_TABLE_END -->

_Bảng trên được điền tự động bởi `scripts/update-coverage.cjs`, xem hướng dẫn ở mục 9 — không nên sửa tay các dòng trong khối `COVERAGE_TABLE_START` / `COVERAGE_TABLE_END`._

**Cách lấy số liệu thật (bắt buộc dùng công cụ đo, không tự ước lượng):**
- Chạy bộ test với chế độ đo coverage, giới hạn phần được đo vào đúng các file thuộc chức năng User Profile (xem lệnh cụ thể ở mục 9).
- Có thể đưa báo cáo coverage cho một công cụ AI phân tích để chỉ ra dòng/nhánh chưa được cover, từ đó quay lại mục 6.1–6.6 để bổ sung test case cho path còn thiếu (path "userId không tồn tại" khi xoá người dùng).

---



