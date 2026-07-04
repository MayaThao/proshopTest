# Feature 1 — Authentication: Test Design (EP + BVA + Test Case + Whitebox + Coverage + Automation)

**Mô tả:** Tài liệu này trình bày thiết kế test case cho chức năng Xác thực người dùng (Authentication) — bao gồm đăng nhập, đăng ký, đăng xuất, và các cơ chế bảo vệ route (xác thực token, phân quyền) — theo đúng phương pháp luận: Equivalence Partitioning → Boundary Value Analysis → Test case design → Unit test tự động → Whitebox testing → Đo độ phủ → Automation. Cấu trúc tài liệu này được dùng làm mẫu chuẩn để thiết kế test case cho các chức năng còn lại của hệ thống (Sản phẩm, Hồ sơ người dùng, Đơn hàng/Thanh toán, Quản trị).

---

## 1. Đặc tả chức năng

Hệ thống cung cấp các chức năng liên quan đến xác thực và phân quyền người dùng như sau:

| Chức năng                                 | Input                             | Điều kiện xử lý                                                                                         | Output                                                                                                                                    |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Đăng nhập**                             | `email`, `password`               | Email phải tồn tại trong hệ thống VÀ password phải khớp với password đã lưu                             | Thành công: trả về token xác thực (qua cookie) + thông tin người dùng. Thất bại: từ chối truy cập, không tiết lộ email/password sai ở đâu |
| **Đăng ký**                               | `name`, `email`, `password`       | Email chưa từng được đăng ký, đủ 3 trường dữ liệu                                                       | Thành công: tạo tài khoản, trả về token + thông tin người dùng. Thất bại: từ chối, thông báo lý do                                        |
| **Đăng xuất**                             | Token hiện tại (cookie)           | Người dùng đã đăng nhập                                                                                 | Xoá token khỏi cookie, phiên đăng nhập kết thúc                                                                                           |
| **Truy cập route được bảo vệ**            | Token đính kèm trong cookie       | Token phải tồn tại, còn hiệu lực, chữ ký hợp lệ, và người dùng gắn với token còn tồn tại trong hệ thống | Cho phép truy cập nếu hợp lệ; từ chối nếu bất kỳ điều kiện nào sai                                                                        |
| **Truy cập route dành cho quản trị viên** | Token hợp lệ + vai trò người dùng | Người dùng phải có vai trò quản trị viên (admin)                                                        | Cho phép nếu là admin; từ chối nếu là người dùng thường                                                                                   |
| **Định danh tài nguyên theo ID**          | ID tài nguyên trong URL           | ID phải đúng định dạng định danh của hệ thống (24 ký tự hex)                                            | Cho qua nếu đúng định dạng; từ chối (404) nếu sai định dạng                                                                               |

**Công thức logic tổng quát:**

```
LoginValid    = (email tồn tại trong hệ thống) AND (password khớp với password đã lưu)
RegisterValid = (email chưa tồn tại) AND (name, email, password đều có giá trị)
AccessValid   = (có token) AND (token còn hiệu lực) AND (chữ ký hợp lệ) AND (người dùng gắn với token còn tồn tại)
AdminValid    = AccessValid AND (vai trò người dùng = admin)
IdValid       = (ID đúng định dạng 24 ký tự hex)
```

**Giả định của bài toán:**

1. Chỉ xét dữ liệu đầu vào hợp lệ về kiểu dữ liệu (chuỗi cho email/password, chuỗi hex cho ID); không xét lỗi encoding/ký tự đặc biệt.
2. Không có yêu cầu tường minh về độ dài tối thiểu của password trong đặc tả gốc — nếu áp dụng thêm ràng buộc này thì cần ghi rõ là giả định bổ sung (xem mục 2.3).
3. Một request được xem là hợp lệ khi và chỉ khi tất cả điều kiện liên quan đều đúng.

---

## 2.Phân hoạch lớp tương đương (Equivalence Partitioning)

| Biến đầu vào             | Lớp hợp lệ                                   | Tag | Lớp không hợp lệ                                              | Tag |
| ------------------------ | -------------------------------------------- | --- | ------------------------------------------------------------- | --- |
| **Email (đăng nhập)**    | Email đúng định dạng, tồn tại trong hệ thống | V1  | Email rỗng                                                    | X1  |
|                          |                                              |     | Email không tồn tại trong hệ thống                            | X2  |
|                          |                                              |     | Email sai định dạng (thiếu `@`)                               | X3  |
| **Password (đăng nhập)** | Password đúng, khớp dữ liệu đã lưu           | V2  | Password rỗng                                                 | X4  |
|                          |                                              |     | Password sai (không khớp)                                     | X5  |
| **Email (đăng ký)**      | Email hợp lệ, chưa tồn tại                   | V3  | Email rỗng                                                    | X6  |
|                          |                                              |     | Email đã tồn tại (trùng)                                      | X7  |
| **Password (đăng ký)**   | Password hợp lệ, có giá trị                  | V4  | Password rỗng                                                 | X8  |
| **Token xác thực**       | Token có mặt, còn hiệu lực, chữ ký đúng      | V5  | Không có token                                                | X9  |
|                          |                                              |     | Token có chữ ký giả mạo/sai                                   | X10 |
|                          |                                              |     | Token hợp lệ nhưng người dùng gắn với token không còn tồn tại | X11 |
| **Vai trò người dùng**   | Vai trò = admin                              | V6  | Vai trò = người dùng thường                                   | X12 |
| **ID tài nguyên**        | Đúng định dạng 24 ký tự hex                  | V7  | Sai định dạng (VD: `"abc123"`)                                | X13 |

_Mỗi biến đều có ≥1 lớp hợp lệ và ≥2 lớp không hợp lệ theo yêu cầu; với dạng dữ liệu chuỗi/trạng thái, "nhỏ hơn min / lớn hơn max" được thay bằng "thiếu dữ liệu / sai giá trị / sai định dạng" cho phù hợp với domain._

---

## 3. Phân tích giá trị biên (Boundary Value Analysis)

Do input của chức năng xác thực không phải dạng số nguyên/thực có khoảng `[min, max]`, BVA được áp dụng vào 2 miền giá trị định lượng thực sự tồn tại trong đặc tả: **độ dài định danh (ID)** và **thời gian hiệu lực của token**.

### 3.1. Độ dài ID tài nguyên (yêu cầu đúng 24 ký tự hex)

| Biến      |         min | min+ | nominal | max- | max | Tag biên                                             |
| --------- | ----------: | ---: | ------: | ---: | --: | ---------------------------------------------------- |
| Độ dài ID | 24 (hợp lệ) |    — |      24 |   23 |  25 | B1 (=24, hợp lệ), B2 (23, invalid), B3 (25, invalid) |

> Ghi chú: ID không có "khoảng" min–max như số, chỉ có đúng **1 độ dài hợp lệ = 24**. Boundary thực sự ở đây là "đúng 24" so với "24 ± 1".

### 3.2. Thời hạn hiệu lực của token (giả định thời hạn 30 ngày theo đặc tả)

| Biến                            |    min |   min+ | nominal |          max- |     max | Tag biên                                                                         |
| ------------------------------- | -----: | -----: | ------: | ------------: | ------: | -------------------------------------------------------------------------------- |
| Tuổi token (so với hạn 30 ngày) | 0 ngày | 1 ngày | 15 ngày | 29 ngày 23h59 | 30 ngày | B4 (mới tạo), B5 (gần hết hạn nhưng còn hợp lệ), B6 (vừa hết hạn → phải từ chối) |

> Trường hợp không mock được thời gian hệ thống, có thể lược bỏ B4–B6 và ghi chú rõ "Out of scope – cần mock thời gian hệ thống" trong báo cáo; đây là lựa chọn hợp lệ nếu có ghi chú rõ ràng.

### 3.3. Độ dài Password (giả định bổ sung, nếu áp dụng policy tối thiểu)

> **Lưu ý:** Đặc tả gốc không nêu yêu cầu tường minh về độ dài password tối thiểu. Đây là một khoảng trống cần được làm rõ với người ra đề — nếu không có xác nhận, nên ghi nhận việc thiếu kiểm tra độ dài password là một **finding** (khả năng là thiếu sót của hệ thống) thay vì mặc định áp một policy tuỳ ý. Nếu độ dài tối thiểu được xác nhận là yêu cầu (ví dụ ≥6 ký tự), bảng BVA tương ứng như sau:

| Biến                                 | min | min+ | nominal | max- | max | Tag biên                              |
| ------------------------------------ | --: | ---: | ------: | ---: | --: | ------------------------------------- |
| Độ dài password (giả định policy ≥6) |   6 |    7 |      10 |    — |   — | B7, B8 (không có max nên bỏ max-/max) |
| Độ dài password = 0 (rỗng)           |   — |    — |       — |    — |   — | X8 (đã liệt kê ở EP)                  |

---

## 4. Bảng test case

| STT | Tên test case                                | Input                                                               | Kết quả mong đợi                                                              | Tag được bao phủ |
| --: | -------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------- |
|   1 | Đăng nhập thành công                         | email hợp lệ + password đúng                                        | Trả về token xác thực + thông tin người dùng — **Hợp lệ**                     | V1, V2           |
|   2 | Đăng nhập – sai password                     | email đúng + password sai                                           | Từ chối truy cập — **Không hợp lệ**: password không khớp                      | V1, X5           |
|   3 | Đăng nhập – thiếu email                      | email rỗng, password bất kỳ                                         | Từ chối, báo lỗi thiếu dữ liệu — **Không hợp lệ**: thiếu field bắt buộc       | X1               |
|   4 | Đăng nhập – email không tồn tại              | email không có trong hệ thống                                       | Từ chối truy cập — **Không hợp lệ**: email chưa đăng ký                       | X2               |
|   5 | Đăng ký thành công                           | name/email/password hợp lệ, email chưa tồn tại                      | Tạo tài khoản, trả về token + thông tin người dùng — **Hợp lệ**               | V3, V4           |
|   6 | Đăng ký – email trùng                        | email đã tồn tại trong hệ thống                                     | Từ chối, báo lỗi trùng email — **Không hợp lệ**: trùng email                  | X7               |
|   7 | Đăng ký – password rỗng                      | password = `""`                                                     | Kỳ vọng từ chối với lỗi thiếu dữ liệu — **Không hợp lệ**: thiếu password      | X8               |
|   8 | Đăng ký – email rỗng                         | email = `""`                                                        | Kỳ vọng từ chối với lỗi thiếu dữ liệu — **Không hợp lệ**: thiếu email         | X6               |
|   9 | Đăng xuất                                    | người dùng đã đăng nhập, gọi chức năng đăng xuất                    | Token bị xoá khỏi cookie, phiên kết thúc — **Hợp lệ**                         | V5               |
|  10 | Truy cập route bảo vệ – token hợp lệ         | token hợp lệ, còn hiệu lực                                          | Cho phép truy cập — **Hợp lệ**                                                | V5, B4/B5        |
|  11 | Truy cập route bảo vệ – không có token       | không gửi token                                                     | Từ chối truy cập — **Không hợp lệ**: thiếu token                              | X9               |
|  12 | Truy cập route bảo vệ – chữ ký token sai     | token bị sửa/giả mạo chữ ký                                         | Từ chối truy cập — **Không hợp lệ**: sai chữ ký                               | X10              |
|  13 | Truy cập route bảo vệ – người dùng đã bị xoá | token hợp lệ nhưng người dùng gắn với token đã bị xoá khỏi hệ thống | Kỳ vọng từ chối truy cập — **Không hợp lệ**: người dùng không còn tồn tại     | X11              |
|  14 | Truy cập route admin – được phép             | vai trò = admin                                                     | Cho phép truy cập route quản trị — **Hợp lệ**                                 | V6               |
|  15 | Truy cập route admin – bị từ chối            | vai trò = người dùng thường                                         | Từ chối truy cập route quản trị — **Không hợp lệ**: không có quyền            | X12              |
|  16 | Truy cập tài nguyên – ID sai định dạng       | ID = `"abc123"`                                                     | Từ chối, báo lỗi định danh sai định dạng — **Không hợp lệ**: sai định dạng ID | X13, B2/B3       |

---

---

## 5. Whitebox — CFG, Cyclomatic Complexity, Independent Path

> Tiêu chí whitebox chuẩn: (1) Vẽ Control Flow Graph, (2) Tính V(G) = E − N + 2 (hoặc V(G) = số quyết định + 1), (3) Liệt kê independent path, (4) Thiết kế test case phủ từng path.
>
> Control Flow Graph dưới đây được dựng lại từ luồng xử lý mô tả trong đặc tả (mục 1); khi triển khai thực tế.

### 5.1. Chức năng "Đăng nhập" — worked example đầy đủ

```
N1: Start
N2: Nhận {email, password}; tìm người dùng theo email
N3: [Decision] Người dùng tồn tại VÀ password khớp?
N4:   Sinh token, trả về thông tin người dùng      // nhánh True
N5:   Từ chối, báo lỗi "Invalid email or password"  // nhánh False
N6: End
```

- Nodes N = 6, Edges E = 6 (N1→N2, N2→N3, N3→N4, N3→N5, N4→N6, N5→N6)
- **V(G) = E − N + 2 = 6 − 6 + 2 = 2** (khớp: 1 quyết định → V(G) = 1+1 = 2)
- **Independent paths (2):**
  - P1: N1→N2→N3(T)→N4→N6 — đăng nhập thành công → **TC1**
  - P2: N1→N2→N3(F)→N5→N6 — đăng nhập thất bại → **TC2 / TC4**

### 5.2. Chức năng "Đăng ký"

```
N1: Start → N2: Nhận {name, email, password} → N3: kiểm tra email đã tồn tại?
N4: [Decision 1] Email đã tồn tại?  → N5: từ chối, báo lỗi "User already exists"   (True)
                                    → N6: tạo tài khoản mới                          (False)
N7: [Decision 2] Tạo tài khoản thành công? → N8: sinh token, trả về 201             (True)
                                            → N9: từ chối, báo lỗi "Invalid user data" (False)
N10: End
```

- 2 điểm quyết định → **V(G) = 2 + 1 = 3**
- **Independent paths (3):**
  - P1: email đã tồn tại → từ chối → **TC6**
  - P2: email chưa tồn tại, tạo tài khoản thành công → **TC5**
  - P3: email chưa tồn tại, tạo tài khoản thất bại (lỗi dữ liệu) → **cần bổ sung test case mới, chưa có trong bộ 16 TC ở mục 4 — gap coverage cần bổ sung.**

### 5.3. Chức năng "Truy cập route được bảo vệ"

```
N1: Start → N2: đọc token từ request
N3: [Decision 1] Có token?  → N4: xác minh token        (True, có token)
                             → N9: từ chối, "Not authorized, no token"   (False, không có token)
N4 → N5: [Decision 2] Xác minh thành công?  → N6: gắn thông tin người dùng; cho qua   (True)
                                             → N8: từ chối, "Not authorized, token failed" (False)
```

- 2 điểm quyết định (có token? / xác minh thành công?) → **V(G) = 3**
- **Independent paths (3):**
  - P1: không có token → **TC11**
  - P2: có token, xác minh thành công → **TC10**
  - P3: có token, xác minh thất bại (sai chữ ký/hết hạn) → **TC12**

> Lưu ý: trường hợp "người dùng đã bị xoá" (**TC13**) đi qua path P2 (token vẫn hợp lệ vì chưa hết hạn), nhưng bước tra cứu người dùng theo ID trả về rỗng — đây là một nhánh **không được xử lý tường minh trong luồng mô tả ở mục 1** (đặc tả không nêu rõ hành vi khi token hợp lệ nhưng người dùng không còn tồn tại). Đây là khoảng trống đặc tả cần làm rõ và có thể là root cause khiến TC13 không đạt kết quả mong đợi khi kiểm thử thực tế — nên đề xuất bổ sung một decision node tường minh: "người dùng tra cứu được có tồn tại không?" vào luồng xử lý.

### 5.4. Chức năng "Truy cập route admin"

- 1 quyết định (vai trò = admin?) → **V(G) = 2**
- Paths: P1 (admin → cho qua) = **TC14**; P2 (không phải admin → từ chối) = **TC15**

### 5.5. Chức năng "Kiểm tra định dạng ID tài nguyên"

- 1 quyết định (ID đúng định dạng?) → **V(G) = 2**
- Paths: P1 (hợp lệ → cho qua) = cần bổ sung test case "ID hợp lệ"; P2 (không hợp lệ → từ chối) = **TC16**

### 5.6. Tổng hợp Cyclomatic Complexity

| Chức năng             |     Số quyết định | V(G) | Số path cần test | Đã có đủ TC?                                                        |
| --------------------- | ----------------: | ---: | ---------------: | ------------------------------------------------------------------- |
| Đăng nhập             |                 1 |    2 |                2 | ✅                                                                  |
| Đăng ký               |                 2 |    3 |                3 | ⚠️ thiếu path "tạo tài khoản thất bại"                              |
| Truy cập route bảo vệ |                 2 |    3 |                3 | ⚠️ thiếu path "người dùng đã bị xoá" đúng nghĩa (cần làm rõ đặc tả) |
| Truy cập route admin  |                 1 |    2 |                2 | ✅                                                                  |
| Kiểm tra định dạng ID |                 1 |    2 |                2 | ⚠️ thiếu TC "ID hợp lệ"                                             |
| Sinh token            | 0 (straight-line) |    1 |                1 | Không cần test riêng nhánh, gộp vào TC1/TC5                         |

### 5.7. Bảng đo độ phủ (Coverage Metrics)

> Phần whitebox: sau khi đã vẽ CFG, tính V(G), liệt kê independent path (5.1–5.6), bảng này đo xem test case thật sự đã **chạy qua** bao nhiêu % số path/nhánh/dòng đó khi triển khai. 4 cột được thêm sau cột Metric: Total, Covered, Coverage %, Tool sử dụng.

<!-- COVERAGE_TABLE_START -->

| Metric (độ phủ)    | Total | Covered | Coverage % | Tool sử dụng                   |
| ------------------ | ----: | ------: | ---------: | ------------------------------ |
| Statement coverage |   106 |      55 |     51.88% | jest --coverage (Istanbul/nyc) |
| Branch coverage    |    55 |      21 |     38.18% | jest --coverage (Istanbul/nyc) |
| Function coverage  |    12 |       7 |     58.33% | jest --coverage (Istanbul/nyc) |
| Line coverage      |   106 |      55 |     51.88% | jest --coverage (Istanbul/nyc) |

<!-- COVERAGE_TABLE_END -->
