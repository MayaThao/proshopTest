# Feature 5 — Admin Management: Test Design (EP + BVA + Test Case + Whitebox + Coverage + Automation)

**Mô tả:** Tài liệu này trình bày thiết kế test case cho chức năng Quản trị hệ thống (Admin Management) — bao gồm các thao tác quản trị viên trên đơn hàng, kiểm soát quyền truy cập route quản trị, xử lý lỗi hệ thống ở tầng middleware, và xác thực giao dịch thanh toán PayPal — theo đúng phương pháp luận: Equivalence Partitioning → Boundary Value Analysis → Test case design → Unit test tự động → Whitebox testing → Đo độ phủ → Automation. Cấu trúc tài liệu bám theo mẫu chung đã áp dụng cho Feature 1–4.

---

## 1. Đặc tả chức năng

| Chức năng | Input | Điều kiện xử lý | Output |
|---|---|---|---|
| **Xem tất cả đơn hàng (admin)** | Vai trò quản trị viên | Người gọi phải có vai trò admin | Trả về danh sách toàn bộ đơn hàng trong hệ thống |
| **Đánh dấu đơn hàng đã giao** | `orderId`, vai trò admin | Đơn hàng phải tồn tại VÀ đã được thanh toán (`isPaid = true`) | Đánh dấu `isDelivered = true`, ghi thời điểm giao hàng |
| **Kiểm soát quyền truy cập route quản trị sản phẩm** | Vai trò người gọi | Áp dụng cho các route tạo/sửa/xoá sản phẩm — người gọi phải có vai trò admin | Cho qua nếu là admin; từ chối nếu là người dùng thường |
| **Xử lý route không tồn tại** | Đường dẫn (URL) không khớp bất kỳ route nào đã đăng ký | Không có điều kiện — áp dụng cho mọi request không khớp route | Trả về lỗi 404 "not found" |
| **Xử lý lỗi hệ thống chung** | Lỗi phát sinh trong quá trình xử lý request | Phân biệt lỗi định dạng ID (CastError của tầng dữ liệu) với các lỗi khác | Nếu là lỗi định dạng ID: trả về thông báo rõ ràng "Resource not found". Nếu là lỗi khác: trả về lỗi hệ thống kèm mã lỗi phù hợp |
| **Xác thực giao dịch PayPal** | Thông tin giao dịch (`orderID`/`transactionId`) | Giao dịch phải thực sự tồn tại và hợp lệ trên hệ thống PayPal | Xác nhận giao dịch hợp lệ để tiếp tục xử lý thanh toán; từ chối nếu không tìm thấy/không hợp lệ |
| **Phát hiện giao dịch trùng lặp** | `transactionId` | Kiểm tra `transactionId` đã từng được dùng để thanh toán 1 đơn hàng khác trong hệ thống hay chưa | Cho phép tiếp tục nếu là giao dịch mới; từ chối nếu giao dịch đã được dùng trước đó |
| **Cập nhật thông tin người dùng (admin)** | `userId`, dữ liệu cập nhật (bao gồm `email`, vai trò), vai trò admin | Nếu đổi email: email mới không được trùng với người dùng khác | Cập nhật thành công; từ chối nếu trùng email |

**Công thức logic tổng quát:**

```
AdminOrdersValid   = (vai trò = admin)
DeliverValid       = (vai trò = admin) AND (đơn hàng tồn tại) AND (đơn hàng đã thanh toán)
AdminProductValid  = (vai trò = admin)   // áp dụng cho create/update/delete product
ErrorHandled       = (lỗi là CastError → thông báo rõ ràng) OR (lỗi khác → mã lỗi hệ thống phù hợp)
PayPalVerifyValid  = (giao dịch tồn tại và hợp lệ trên PayPal)
NewTransactionValid = (transactionId chưa từng được dùng trong hệ thống)
AdminUpdateUserValid = (vai trò = admin) AND (email mới, nếu có, không trùng người dùng khác)
```

**Giả định của bài toán:**
1. Các quy tắc kiểm soát quyền admin (`AdminOrdersValid`, `AdminProductValid`) dùng chung 1 cơ chế xác thực vai trò đã được phân tích chi tiết ở Feature 1 (mục 6.4 của tài liệu Feature 1) — tài liệu này không lặp lại toàn bộ CFG của cơ chế đó, chỉ liệt kê các route áp dụng.
2. `checkIfNewTransaction` (phát hiện giao dịch trùng) có liên quan trực tiếp đến chức năng "Xác nhận thanh toán đơn hàng" đã mô tả ở Feature 4 — ở đây được xem như 1 hàm tiện ích dùng chung, kiểm thử độc lập với ngữ cảnh của 1 đơn hàng cụ thể.
3. Định dạng `orderId`/`userId` áp dụng cùng quy tắc đã nêu ở Feature 1 (24 ký tự hex).

---

## 2. Câu 1 — Phân hoạch lớp tương đương (Equivalence Partitioning)

| Biến đầu vào | Lớp hợp lệ | Tag | Lớp không hợp lệ | Tag |
|---|---|---|---|---|
| **Vai trò người gọi (mọi route admin)** | Vai trò = admin | V1 | Vai trò = người dùng thường | X1 |
| **Trạng thái thanh toán đơn hàng (khi giao hàng)** | Đã thanh toán (`isPaid = true`) | V2 | Chưa thanh toán (`isPaid = false`) | X2 |
| **orderId (giao hàng)** | Đúng định dạng, tồn tại | V3 | Đúng định dạng nhưng không tồn tại | X3 |
| **Đường dẫn request** | Khớp với 1 route đã đăng ký | V4 | Không khớp bất kỳ route nào | X4 |
| **Loại lỗi phát sinh** | — (không có "lỗi hợp lệ", chỉ phân loại) | | Lỗi định dạng ID (CastError) | X5 |
| | | | Lỗi hệ thống khác | X6 |
| **Giao dịch PayPal** | Tồn tại, hợp lệ trên PayPal | V5 | Không tồn tại/không hợp lệ | X7 |
| **transactionId (phát hiện trùng)** | Chưa từng được dùng | V6 | Đã được dùng trước đó | X8 |
| **Email cập nhật bởi admin** | Không đổi, hoặc đổi sang email chưa ai dùng | V7 | Đổi sang email đã có người khác dùng | X9 |

*Mỗi biến đều có ≥1 lớp hợp lệ và ≥2 lớp không hợp lệ khi bản chất biến cho phép; riêng "loại lỗi phát sinh" mang tính phân loại (không có lớp "hợp lệ" theo nghĩa thông thường) nên chỉ liệt kê các lớp phân loại tương ứng.*

---

## 3. Câu 2 — Phân tích giá trị biên (Boundary Value Analysis)

Feature 5 không phát sinh biến số học mới ngoài định dạng ID đã thiết lập từ Feature 1 — hầu hết input của các chức năng quản trị mang tính trạng thái/phân loại (vai trò, đã thanh toán hay chưa, route có khớp hay không) hơn là giá trị số liên tục. Áp dụng lại đúng 1 quy tắc boundary đã có:

### 3.1. Độ dài `orderId` khi đánh dấu giao hàng (áp dụng lại quy tắc đã định nghĩa ở Feature 1)

| Biến | min | min+ | nominal | max- | max | Tag biên |
|---|---:|---:|---:|---:|---:|---|
| Độ dài orderId | 24 (hợp lệ) | — | 24 | 23 | 25 | B1 (=24, hợp lệ), B2 (23, invalid), B3 (25, invalid) |

> Ghi chú: khác với Feature 1/2/4 (nơi sai định dạng ID dẫn tới lỗi 404 "Invalid ObjectId" ở tầng middleware), ở đây trọng tâm kiểm thử là trường hợp **đúng định dạng nhưng không tồn tại** (X3, dẫn tới TC12) — vì sai định dạng đã được middleware `checkObjectId` chặn từ trước, không đi tới logic nghiệp vụ của `updateOrderToDelivered` nữa.

---

## 4. Câu 3 — Bảng test case

| STT | Tên test case | Input | Kết quả mong đợi | Tag được bao phủ |
|---:|---|---|---|---|
| 1 | Xem tất cả đơn hàng (admin) | Vai trò admin | Trả về danh sách toàn bộ đơn hàng — **Hợp lệ** | V1 |
| 2 | Xem tất cả đơn hàng – bị từ chối | Vai trò người dùng thường | Từ chối truy cập — **Không hợp lệ**: không có quyền | X1 |
| 3 | Đánh dấu đã giao hàng – thành công | `orderId` hợp lệ, đơn đã thanh toán, vai trò admin | Đánh dấu đã giao, ghi thời điểm — **Hợp lệ** | V1, V2, V3 |
| 4 | Đánh dấu đã giao hàng – đơn chưa thanh toán | Đơn hàng có `isPaid = false` | Từ chối, báo "đơn chưa thanh toán" — **Không hợp lệ**: chưa thanh toán | X2 |
| 5 | Xoá sản phẩm – bị từ chối | Vai trò người dùng thường | Từ chối truy cập — **Không hợp lệ**: không có quyền | X1 |
| 6 | Tạo sản phẩm – bị từ chối | Vai trò người dùng thường | Từ chối truy cập — **Không hợp lệ**: không có quyền | X1 |
| 7 | Cập nhật sản phẩm – bị từ chối | Vai trò người dùng thường | Từ chối truy cập — **Không hợp lệ**: không có quyền | X1 |
| 8 | Route không tồn tại | Gọi 1 đường dẫn không được đăng ký | Trả về lỗi 404 "not found" — **Không hợp lệ**: route không khớp | X4 |
| 9 | Xử lý lỗi hệ thống chung | Một lỗi runtime không thuộc loại CastError | Trả về lỗi hệ thống kèm mã lỗi phù hợp — **Hợp lệ (xử lý đúng)** | X6 |
| 10 | Xác thực giao dịch PayPal – hợp lệ | Giao dịch tồn tại và hợp lệ trên PayPal | Xác nhận hợp lệ, cho tiếp tục xử lý — **Hợp lệ** | V5 |
| 11 | Phát hiện giao dịch trùng | `transactionId` đã được dùng để thanh toán 1 đơn khác | Từ chối, báo "giao dịch đã được sử dụng" — **Không hợp lệ**: giao dịch trùng | X8 |
| 12 | Đánh dấu đã giao hàng – ID không tồn tại | `orderId` đúng định dạng nhưng không có trong hệ thống, vai trò admin | Từ chối, báo "không tìm thấy đơn hàng" — **Không hợp lệ**: đơn không tồn tại | X3, B2/B3 (đối chiếu quy tắc định dạng) |
| 13 | Cập nhật người dùng (admin) – email trùng | `userId` hợp lệ, `email` mới trùng với người dùng khác | Từ chối, báo lỗi trùng email — **Không hợp lệ**: trùng email | X9 |
| 14 | Xử lý lỗi định dạng ID (CastError) | Request với ID sai định dạng gây lỗi ở tầng dữ liệu | Trả về thông báo rõ ràng "Resource not found" thay vì lỗi hệ thống chung — **Không hợp lệ (được xử lý đúng cách)** | X5 |

*Đã ≥8 test case, có cả hợp lệ/không hợp lệ, có test tại biên (TC12), expected result ghi rõ kèm lý do, mỗi TC có tag — đủ yêu cầu Câu 3.*


## 5. Whitebox — CFG, Cyclomatic Complexity, Independent Path

> Control Flow Graph dưới đây được dựng lại từ luồng xử lý mô tả trong đặc tả (mục 1); khi triển khai thực tế, cần đối chiếu lại với luồng xử lý thật của mã nguồn để đảm bảo CFG khớp chính xác.

### 5.1. Chức năng "Đánh dấu đơn hàng đã giao" (updateOrderToDelivered) — worked example đầy đủ

```
N1: Start → N2: tìm đơn hàng theo orderId
N3: [Decision 1] Đơn hàng có tồn tại?
N4:   Từ chối, "Order not found"                       // False
N5:   [Decision 2] Đơn hàng đã thanh toán (isPaid)?      // True (tồn tại), tiếp tục
N6:     Từ chối, "đơn chưa thanh toán"                    // False
N7:     Đánh dấu isDelivered = true, ghi thời điểm         // True
N8: End
```

- 2 điểm quyết định → **V(G) = 2 + 1 = 3**
- **Independent paths (3):**
  - P1: không tồn tại → **TC12**
  - P2: tồn tại, chưa thanh toán → **TC4**
  - P3: tồn tại, đã thanh toán → **TC3**

### 5.2. Kiểm soát quyền truy cập route quản trị (áp dụng cho nhiều route)

> Đây **không phải** 1 CFG mới — cơ chế kiểm tra vai trò admin đã được phân tích đầy đủ ở Feature 1 (mục 6.4): 1 điểm quyết định, V(G) = 2, 2 independent path (admin/không phải admin). Điểm đáng lưu ý ở Feature 5 là **cùng 1 path "không phải admin" được kiểm thử lại trên nhiều route khác nhau** (xem tất cả đơn hàng, tạo/sửa/xoá sản phẩm):

| Route áp dụng | Test case tương ứng |
|---|---|
| Xem tất cả đơn hàng | TC2 |
| Tạo sản phẩm | TC6 |
| Cập nhật sản phẩm | TC7 |
| Xoá sản phẩm | TC5 |

> Về mặt whitebox, TC2/TC5/TC6/TC7 **không tạo thêm independent path mới** so với CFG đã phân tích ở Feature 1 — chúng là 4 lần lặp lại cùng 1 path trên 4 endpoint khác nhau. Đây là kiểm thử cần thiết ở mức **tích hợp** (integration — đảm bảo middleware được gắn đúng vào từng route) chứ không phải để tăng độ phủ nhánh logic (branch coverage đã đạt 100% cho middleware này chỉ với 1 cặp TC ở Feature 1).

### 5.3. Xử lý lỗi hệ thống (errorHandler)

```
N1: Start → N2: nhận lỗi phát sinh từ tầng xử lý trước đó
N3: [Decision] Lỗi có phải CastError (sai định dạng ID ở tầng dữ liệu)?
N4:   Chuyển thành thông báo rõ ràng "Resource not found"   // True
N5:   Trả về lỗi hệ thống kèm mã lỗi gốc                      // False
N6: End
```

- 1 điểm quyết định → **V(G) = 2**
- **Independent paths (2):** P1 (là CastError) = **TC14**; P2 (lỗi khác) = **TC9**

### 5.4. Xử lý route không tồn tại (notFound middleware)

- Không có điểm quyết định — mọi request không khớp route đã đăng ký đều đi qua đúng 1 nhánh xử lý duy nhất → **V(G) = 1**
- 1 path duy nhất → **TC8**

### 5.5. Xác thực giao dịch PayPal (verifyPayPalPayment)

```
N1: Start → N2: gửi yêu cầu xác thực giao dịch tới PayPal
N3: [Decision] Giao dịch có tồn tại và hợp lệ trên PayPal?
N4:   Xác nhận hợp lệ, cho tiếp tục xử lý     // True
N5:   Từ chối, báo giao dịch không hợp lệ      // False
N6: End
```

- 1 điểm quyết định → **V(G) = 2**
- **Independent paths (2):**
  - P1: hợp lệ → **TC10**
  - P2: không hợp lệ/không tìm thấy → **cần bổ sung test case mới, chưa có trong bộ 14 TC ở mục 4 — gap coverage cần bổ sung**

### 5.6. Phát hiện giao dịch trùng lặp (checkIfNewTransaction)

```
N1: Start → N2: tra cứu transactionId trong hệ thống
N3: [Decision] transactionId đã tồn tại (từng được dùng)?
N4:   Trả về "không phải giao dịch mới", chặn xử lý tiếp    // True
N5:   Trả về "là giao dịch mới", cho phép tiếp tục            // False
N6: End
```

- 1 điểm quyết định → **V(G) = 2**
- **Independent paths (2):**
  - P1: đã tồn tại (trùng) → **TC11**
  - P2: chưa tồn tại (mới) → không có TC riêng trong bộ 14 TC của Feature 5, nhưng path này **đã được kiểm thử gián tiếp** thông qua TC5 của Feature 4 (Xác nhận thanh toán – thành công, dùng transactionId mới). Không tính là gap nếu 2 tài liệu được xem là 1 bộ test tổng thể; nếu chấm điểm độc lập theo từng file thì nên bổ sung 1 TC riêng cho path này ở Feature 5.

### 5.7. Cập nhật người dùng bởi admin (updateUser — admin)

```
N1: Start → N2: nhận dữ liệu cập nhật (bao gồm email mới, nếu có)
N3: [Decision] Email mới có trùng với người dùng khác?
N4:   Từ chối, báo lỗi trùng email     // True
N5:   Cập nhật thành công               // False
N6: End
```

- 1 điểm quyết định → **V(G) = 2**
- **Independent paths (2):**
  - P1: trùng email → **TC13**
  - P2: không trùng, cập nhật thành công → **cần bổ sung test case mới** — path này chưa được kiểm thử ở cả Feature 3 (chỉ có "xem chi tiết" và "xoá") lẫn Feature 5 (chỉ có trường hợp trùng email) — **gap xuyên feature cần bổ sung**

### 5.8. Tổng hợp Cyclomatic Complexity

| Chức năng | Số quyết định | V(G) | Số path cần test | Đã có đủ TC? |
|---|---:|---:|---:|---|
| Đánh dấu đã giao hàng | 2 | 3 | 3 | ✅ |
| Kiểm soát quyền route admin | 1 (dùng chung Feature 1) | 2 | 2 (đã đủ từ Feature 1) | ✅ (TC2/5/6/7 là kiểm thử tích hợp bổ sung, không phải path mới) |
| Xử lý lỗi hệ thống | 1 | 2 | 2 | ✅ |
| Route không tồn tại | 0 | 1 | 1 | ✅ |
| Xác thực giao dịch PayPal | 1 | 2 | 2 | ⚠️ thiếu path "giao dịch không hợp lệ" |
| Phát hiện giao dịch trùng | 1 | 2 | 2 | ⚠️ thiếu TC riêng cho path "giao dịch mới" trong phạm vi Feature 5 |
| Cập nhật user bởi admin | 1 | 2 | 2 | ⚠️ thiếu path "cập nhật thành công" (gap xuyên feature) |

### 5.9. Bảng đo độ phủ (Coverage Metrics) — phần bắt buộc của Whitebox

> Câu trả lời cuối cùng của phần whitebox: sau khi đã vẽ CFG, tính V(G), liệt kê independent path (6.1–6.8), bảng này đo xem test case thật sự đã **chạy qua** bao nhiêu % số path/nhánh/dòng đó khi triển khai. 4 cột được thêm sau cột Metric: Total, Covered, Coverage %, Tool sử dụng.

<!-- COVERAGE_TABLE_START -->
| Metric (độ phủ) | Total | Covered | Coverage % | Tool sử dụng |
|---|---:|---:|---:|---|
| Statement coverage | 102 | 31 | 30.39% | jest --coverage (Istanbul/nyc) |
| Branch coverage | 41 | 8 | 19.51% | jest --coverage (Istanbul/nyc) |
| Function coverage | 15 | 4 | 26.66% | jest --coverage (Istanbul/nyc) |
| Line coverage | 102 | 31 | 30.39% | jest --coverage (Istanbul/nyc) |
<!-- COVERAGE_TABLE_END -->


