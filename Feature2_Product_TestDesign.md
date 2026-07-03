# Feature 2 — Product: Test Design (EP + BVA + Test Case + Whitebox + Coverage + Automation)

**Mô tả:** Tài liệu này trình bày thiết kế test case cho chức năng Quản lý sản phẩm (Product) — bao gồm xem danh sách/tìm kiếm/phân trang, xem chi tiết, tạo/sửa/xoá (dành cho quản trị viên), đánh giá sản phẩm (review), lấy top sản phẩm và upload ảnh sản phẩm — theo đúng phương pháp luận: Equivalence Partitioning → Boundary Value Analysis → Test case design → Unit test tự động → Whitebox testing → Đo độ phủ → Automation. Cấu trúc tài liệu bám theo mẫu chung đã áp dụng cho Feature 1 (Authentication).

---

## 1. Đặc tả chức năng

| Chức năng                      | Input                                                           | Điều kiện xử lý                                                                                    | Output                                                                    |
| ------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Xem danh sách sản phẩm**     | `keyword` (tuỳ chọn), `pageNumber` (tuỳ chọn)                   | Nếu có `keyword`, chỉ trả sản phẩm có tên khớp; `pageNumber` phải nằm trong khoảng số trang hợp lệ | Danh sách sản phẩm + thông tin phân trang (trang hiện tại, tổng số trang) |
| **Xem chi tiết sản phẩm**      | `productId` (ID trong URL)                                      | ID phải đúng định dạng VÀ tồn tại trong hệ thống                                                   | Thông tin đầy đủ của sản phẩm, hoặc lỗi nếu không tìm thấy/sai định dạng  |
| **Tạo sản phẩm mới**           | Vai trò quản trị viên                                           | Người gọi phải có vai trò admin                                                                    | Tạo 1 sản phẩm mẫu với dữ liệu mặc định, trả về sản phẩm vừa tạo          |
| **Cập nhật sản phẩm**          | `productId`, dữ liệu cập nhật, vai trò quản trị viên            | Sản phẩm phải tồn tại VÀ người gọi phải là admin                                                   | Sản phẩm được cập nhật, hoặc lỗi nếu không tìm thấy/không có quyền        |
| **Xoá sản phẩm**               | `productId`, vai trò quản trị viên                              | Sản phẩm phải tồn tại VÀ người gọi phải là admin                                                   | Xoá sản phẩm khỏi hệ thống, hoặc lỗi nếu không tìm thấy/không có quyền    |
| **Đánh giá sản phẩm (review)** | `productId`, `rating` (1–5), `comment`, người dùng đã đăng nhập | Người dùng chưa từng đánh giá sản phẩm này; `rating` nằm trong khoảng 1–5; `comment` không rỗng    | Thêm đánh giá vào sản phẩm, cập nhật lại điểm rating trung bình           |
| **Lấy top sản phẩm**           | —                                                               | Không có điều kiện đầu vào                                                                         | Trả về 3 sản phẩm có rating trung bình cao nhất, sắp xếp giảm dần         |
| **Upload ảnh sản phẩm**        | File ảnh, vai trò quản trị viên                                 | Người gọi phải là admin, file phải là ảnh hợp lệ                                                   | Trả về đường dẫn ảnh đã lưu                                               |

**Công thức logic tổng quát:**

```
ListValid     = (keyword rỗng HOẶC có sản phẩm khớp keyword) AND (pageNumber nằm trong khoảng số trang hợp lệ)
DetailValid   = (productId đúng định dạng) AND (sản phẩm tồn tại)
WriteValid    = (vai trò = admin) AND (sản phẩm tồn tại, với update/delete)
ReviewValid   = (người dùng chưa review sản phẩm này) AND (1 ≤ rating ≤ 5) AND (comment có giá trị)
```

**Giả định của bài toán:**

1. Chỉ xét dữ liệu đầu vào hợp lệ về kiểu dữ liệu (chuỗi cho keyword/comment, số cho pageNumber/rating, chuỗi hex cho productId).
2. Định dạng `productId` áp dụng cùng quy tắc đã nêu ở Feature 1 (24 ký tự hex).
3. Một request được xem là hợp lệ khi và chỉ khi tất cả điều kiện liên quan đều đúng (nguyên tắc AND).

---

## 2.Phân hoạch lớp tương đương (Equivalence Partitioning)

| Biến đầu vào                     | Lớp hợp lệ                                                  | Tag | Lớp không hợp lệ                           | Tag |
| -------------------------------- | ----------------------------------------------------------- | --- | ------------------------------------------ | --- |
| **Keyword (tìm kiếm)**           | Có giá trị, khớp ≥1 sản phẩm                                | V1  | Không rỗng nhưng không khớp sản phẩm nào   | X1  |
|                                  | Rỗng (lấy toàn bộ danh sách)                                | V2  |                                            |     |
| **pageNumber**                   | Nằm trong khoảng số trang hợp lệ (1 ≤ page ≤ tổng số trang) | V3  | Vượt quá tổng số trang                     | X2  |
|                                  |                                                             |     | Nhỏ hơn 1 (ví dụ 0 hoặc số âm)             | X3  |
| **productId**                    | Đúng định dạng 24 ký tự hex, tồn tại trong hệ thống         | V4  | Sai định dạng                              | X4  |
|                                  |                                                             |     | Đúng định dạng nhưng không tồn tại         | X5  |
| **Vai trò (tạo/sửa/xoá/upload)** | Vai trò = admin                                             | V5  | Vai trò = người dùng thường                | X6  |
| **rating (review)**              | Số nguyên trong khoảng 1–5                                  | V6  | Nhỏ hơn 1                                  | X7  |
|                                  |                                                             |     | Lớn hơn 5                                  | X8  |
| **comment (review)**             | Có giá trị (không rỗng)                                     | V7  | Rỗng/thiếu trường                          | X9  |
| **Trạng thái review**            | Người dùng chưa từng review sản phẩm này                    | V8  | Người dùng đã review sản phẩm này trước đó | X10 |

_Mỗi biến đều có ≥1 lớp hợp lệ và ≥2 lớp không hợp lệ theo yêu cầu (riêng `productId` và trạng thái review có bản chất nhị phân/trạng thái nên số lớp không hợp lệ được liệt kê theo đúng các tình huống thực tế phát sinh)._

---

## 3.Phân tích giá trị biên (Boundary Value Analysis)

### 3.1. Số trang (`pageNumber`)

| Biến                               | min | min+ | nominal | max- | max | Tag biên                                               |
| ---------------------------------- | --: | ---: | ------: | ---: | --: | ------------------------------------------------------ |
| pageNumber (giả định tổng 5 trang) |   1 |    2 |       3 |    4 |   5 | B1 (min), B2 (min+), B3 (nominal), B4 (max-), B5 (max) |
| pageNumber ngoài biên              |   0 |    — |       — |    — |   6 | B6 (dưới min, invalid), B7 (trên max, invalid)         |

### 3.2. Rating đánh giá sản phẩm

| Biến              | min | min+ | nominal | max- | max | Tag biên                                                  |
| ----------------- | --: | ---: | ------: | ---: | --: | --------------------------------------------------------- |
| rating            |   1 |    2 |       3 |    4 |   5 | B8 (min), B9 (min+), B10 (nominal), B11 (max-), B12 (max) |
| rating ngoài biên |   0 |    — |       — |    — |   6 | B13 (dưới min, invalid), B14 (trên max, invalid)          |

### 3.3. Độ dài `productId` (áp dụng lại quy tắc đã định nghĩa ở Feature 1)

| Biến             |         min | min+ | nominal | max- | max | Tag biên                                                |
| ---------------- | ----------: | ---: | ------: | ---: | --: | ------------------------------------------------------- |
| Độ dài productId | 24 (hợp lệ) |    — |      24 |   23 |  25 | B15 (=24, hợp lệ), B16 (23, invalid), B17 (25, invalid) |

---

## 4.Bảng test case

| STT | Tên test case                                | Input                                                      | Kết quả mong đợi                                                                  | Tag được bao phủ |
| --: | -------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------- |
|   1 | Xem danh sách sản phẩm – mặc định            | Không truyền tham số                                       | Trả về danh sách sản phẩm + thông tin phân trang — **Hợp lệ**                     | V2               |
|   2 | Xem danh sách – tìm kiếm theo keyword        | `keyword` khớp sản phẩm có sẵn                             | Trả về đúng các sản phẩm có tên khớp — **Hợp lệ**                                 | V1               |
|   3 | Xem chi tiết sản phẩm – tìm thấy             | `productId` hợp lệ, sản phẩm tồn tại                       | Trả về đúng thông tin sản phẩm — **Hợp lệ**                                       | V4               |
|   4 | Xem chi tiết sản phẩm – không tồn tại        | `productId` đúng định dạng nhưng không có trong hệ thống   | Từ chối, báo "không tìm thấy sản phẩm" — **Không hợp lệ**: sản phẩm không tồn tại | X5               |
|   5 | Tạo sản phẩm mới                             | Vai trò admin                                              | Tạo thành công sản phẩm mẫu, trả về dữ liệu vừa tạo — **Hợp lệ**                  | V5               |
|   6 | Cập nhật sản phẩm – thành công               | `productId` hợp lệ, dữ liệu cập nhật hợp lệ, vai trò admin | Sản phẩm được cập nhật, trả về dữ liệu mới — **Hợp lệ**                           | V4, V5           |
|   7 | Xoá sản phẩm – thành công                    | `productId` hợp lệ, vai trò admin                          | Xoá thành công, báo "đã xoá sản phẩm" — **Hợp lệ**                                | V4, V5           |
|   8 | Đánh giá sản phẩm – thành công               | `rating` và `comment` hợp lệ, chưa từng review             | Thêm đánh giá thành công, cập nhật rating trung bình — **Hợp lệ**                 | V6, V7, V8       |
|   9 | Đánh giá sản phẩm – trùng lặp                | Người dùng đã review sản phẩm này trước đó                 | Từ chối, báo "đã đánh giá sản phẩm này rồi" — **Không hợp lệ**: trùng review      | X10              |
|  10 | Lấy top sản phẩm                             | Không truyền tham số                                       | Trả về đúng 3 sản phẩm rating cao nhất, sắp giảm dần — **Hợp lệ**                 | —                |
|  11 | Upload ảnh sản phẩm                          | File ảnh hợp lệ, vai trò admin                             | Upload thành công, trả về đường dẫn ảnh — **Hợp lệ**                              | V5               |
|  12 | Xem danh sách – trang vượt quá tổng số trang | `pageNumber` vượt quá tổng số trang hiện có                | Trả về danh sách rỗng, không lỗi — **Không hợp lệ (biên)**: ngoài khoảng số trang | X2, B7           |
|  13 | Xem chi tiết sản phẩm – ID sai định dạng     | `productId = "abc123"`                                     | Từ chối, báo lỗi định danh sai định dạng — **Không hợp lệ**: sai định dạng ID     | X4, B16          |
|  14 | Đánh giá sản phẩm – rating ngoài khoảng      | `rating = 10`                                              | Từ chối, báo lỗi rating không hợp lệ — **Không hợp lệ**: rating ngoài khoảng 1–5  | X8, B14          |
|  15 | Đánh giá sản phẩm – thiếu comment            | Gửi `rating` hợp lệ nhưng thiếu `comment`                  | Từ chối, báo lỗi thiếu dữ liệu — **Không hợp lệ**: thiếu comment                  | X9               |

_Đã ≥8 test case, có cả hợp lệ/không hợp lệ, có test tại biên (TC12, TC13, TC14), expected result ghi rõ kèm lý do, mỗi TC có tag — đủ yêu cầu ._

---

## 5. Whitebox — CFG, Cyclomatic Complexity, Independent Path

> Control Flow Graph dưới đây được dựng lại từ luồng xử lý mô tả trong đặc tả (mục 1); khi triển khai thực tế, cần đối chiếu lại với luồng xử lý thật của mã nguồn để đảm bảo CFG khớp chính xác.

### 5.1. Chức năng "Xem chi tiết sản phẩm" — worked example đầy đủ

```
N1: Start
N2: Nhận productId từ URL; tìm sản phẩm theo ID
N3: [Decision] Sản phẩm có tồn tại?
N4:   Trả về thông tin sản phẩm            // nhánh True
N5:   Từ chối, báo "Product not found"     // nhánh False
N6: End
```

- Nodes N = 6, Edges E = 6 → **V(G) = 6 − 6 + 2 = 2** (1 quyết định → V(G) = 1+1 = 2)
- **Independent paths (2):**
  - P1: sản phẩm tồn tại → **TC3**
  - P2: sản phẩm không tồn tại → **TC4**

> Lưu ý: luồng này chưa tính riêng nhánh "ID sai định dạng" (TC13) — đây là một decision riêng nằm ở bước kiểm tra định dạng ID trước khi tra cứu (giống middleware kiểm tra ID đã mô tả ở Feature 1), nên được xem là 1 CFG độc lập, xem mục 6.5.

### 5.2. Chức năng "Đánh giá sản phẩm" (createReview)

```
N1: Start → N2: Nhận {rating, comment}; kiểm tra người dùng đã review sản phẩm này chưa
N3: [Decision 1] Đã review trước đó?  → N4: từ chối, "Product already reviewed"   (True)
                                       → N5: kiểm tra rating trong khoảng 1–5?     (False)
N5: [Decision 2] 1 ≤ rating ≤ 5?      → N6: kiểm tra comment có giá trị?           (True)
                                       → N9: từ chối, "Rating không hợp lệ"        (False)
N6: [Decision 3] comment có giá trị?  → N7: thêm review, cập nhật rating trung bình (True)
                                       → N8: từ chối, "Thiếu comment"               (False)
N10: End
```

- 3 điểm quyết định → **V(G) = 3 + 1 = 4**
- **Independent paths (4):**
  - P1: đã review trước đó → **TC9**
  - P2: chưa review, rating ngoài khoảng → **TC14**
  - P3: chưa review, rating hợp lệ, thiếu comment → **TC15**
  - P4: chưa review, rating hợp lệ, có comment → **TC8**

_Đây là ví dụ chức năng có nhiều điểm quyết định nhất trong Feature 2 — tất cả 4 path đều đã có test case tương ứng, không có gap._

### 5.3. Chức năng "Cập nhật / Xoá sản phẩm" (updateProduct, deleteProduct)

```
N1: Start → N2: kiểm tra vai trò người gọi có phải admin?
N3: [Decision 1] Vai trò = admin?     → N4: kiểm tra sản phẩm có tồn tại?    (True)
                                       → N7: từ chối, "Not authorized as admin" (False)
N4: [Decision 2] Sản phẩm tồn tại?    → N5: thực hiện cập nhật/xoá            (True)
                                       → N6: từ chối, "Product not found"      (False)
N8: End
```

- 2 điểm quyết định → **V(G) = 3**
- **Independent paths (3):**
  - P1: không phải admin → **cần bổ sung test case mới** (chưa có TC riêng cho trường hợp non-admin cố update/delete trong bộ 15 TC ở mục 4 — gap coverage cần bổ sung)
  - P2: là admin, sản phẩm tồn tại → **TC6 / TC7**
  - P3: là admin, sản phẩm không tồn tại → **cần bổ sung test case mới** — gap coverage cần bổ sung

### 5.4. Chức năng "Xem danh sách sản phẩm" (getProducts)

```
N1: Start → N2: đọc keyword, pageNumber từ query
N3: [Decision 1] Có keyword?         → N4: lọc sản phẩm theo keyword    (True)
                                      → N5: lấy toàn bộ sản phẩm          (False)
N4/N5 → N6: [Decision 2] pageNumber nằm trong khoảng hợp lệ?  → N7: trả về trang tương ứng   (True)
                                                                → N8: trả về danh sách rỗng    (False)
N9: End
```

- 2 điểm quyết định → **V(G) = 3**
- **Independent paths (3):**
  - P1: có keyword, pageNumber hợp lệ → **TC2**
  - P2: không có keyword, pageNumber hợp lệ → **TC1**
  - P3: pageNumber ngoài khoảng (không phân biệt có/không keyword) → **TC12**

### 5.5. Chức năng "Kiểm tra định dạng productId"

- Tái sử dụng cùng middleware kiểm tra định dạng ID đã phân tích ở Feature 1 (1 quyết định → V(G) = 2).
- Paths: P1 (đúng định dạng → cho qua, tiếp tục xử lý ở 6.1) = ngầm định trong TC3/TC4; P2 (sai định dạng → từ chối) = **TC13**

### 5.6. Chức năng "Lấy top sản phẩm" (getTopProducts)

- Không có điểm quyết định (truy vấn thẳng, sắp xếp theo rating, giới hạn 3 kết quả) → **V(G) = 1**
- 1 path duy nhất → **TC10**, không cần chia nhánh test.

### 5.7. Tổng hợp Cyclomatic Complexity

| Chức năng              |     Số quyết định | V(G) | Số path cần test | Đã có đủ TC?                                          |
| ---------------------- | ----------------: | ---: | ---------------: | ----------------------------------------------------- |
| Xem chi tiết sản phẩm  |                 1 |    2 |                2 | ✅                                                    |
| Đánh giá sản phẩm      |                 3 |    4 |                4 | ✅                                                    |
| Cập nhật/Xoá sản phẩm  |                 2 |    3 |                3 | ⚠️ thiếu path "non-admin" và "sản phẩm không tồn tại" |
| Xem danh sách sản phẩm |                 2 |    3 |                3 | ✅                                                    |
| Kiểm tra định dạng ID  |                 1 |    2 |                2 | ✅ (dùng chung phân tích với Feature 1)               |
| Lấy top sản phẩm       | 0 (straight-line) |    1 |                1 | ✅                                                    |

### 5.8. Bảng đo độ phủ (Coverage Metrics) — phần bắt buộc của Whitebox

> Câu trả lời cuối cùng của phần whitebox: sau khi đã vẽ CFG, tính V(G), liệt kê independent path (6.1–6.7), bảng này đo xem test case thật sự đã **chạy qua** bao nhiêu % số path/nhánh/dòng đó khi triển khai. 4 cột được thêm sau cột Metric: Total, Covered, Coverage %, Tool sử dụng.

<!-- COVERAGE_TABLE_START -->

| Metric (độ phủ)    | Total | Covered | Coverage % | Tool sử dụng                   |
| ------------------ | ----: | ------: | ---------: | ------------------------------ |
| Statement coverage |    73 |      62 |     84.93% | jest --coverage (Istanbul/nyc) |
| Branch coverage    |    26 |      21 |     80.76% | jest --coverage (Istanbul/nyc) |
| Function coverage  |    10 |       9 |        90% | jest --coverage (Istanbul/nyc) |
| Line coverage      |    73 |      62 |     84.93% | jest --coverage (Istanbul/nyc) |

<!-- COVERAGE_TABLE_END -->
