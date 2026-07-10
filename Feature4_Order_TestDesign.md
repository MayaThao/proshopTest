# Feature 4 — Order & Payment: Test Design (EP + BVA + Test Case + Whitebox + Coverage + Automation)

**Mô tả:** Tài liệu này trình bày thiết kế test case cho chức năng Đơn hàng & Thanh toán (Order & Payment) — bao gồm tạo đơn hàng, xem chi tiết/danh sách đơn hàng, xử lý thanh toán qua cổng thanh toán bên thứ ba, và các hàm tính toán giá trị đơn hàng — theo đúng phương pháp luận: Equivalence Partitioning → Boundary Value Analysis → Test case design → Unit test tự động → Whitebox testing → Đo độ phủ → Automation. Cấu trúc tài liệu bám theo mẫu chung đã áp dụng cho Feature 1–3.

---

## 1. Đặc tả chức năng

| Chức năng | Input | Điều kiện xử lý | Output |
|---|---|---|---|
| **Tạo đơn hàng** | `orderItems`, `shippingAddress`, `paymentMethod`, token hiện tại | `orderItems` không được rỗng VÀ `shippingAddress` phải có giá trị | Tạo đơn hàng thành công, trả về thông tin đơn; từ chối nếu thiếu dữ liệu |
| **Xem chi tiết đơn hàng** | `orderId`, token hiện tại | Đơn hàng phải tồn tại VÀ người gọi phải là chủ đơn (hoặc admin) | Trả về thông tin đầy đủ của đơn hàng; từ chối nếu không tìm thấy hoặc không có quyền |
| **Xem danh sách đơn hàng của tôi** | Token hiện tại | Người dùng đã đăng nhập | Trả về danh sách đơn hàng thuộc về người dùng hiện tại |
| **Xác nhận thanh toán đơn hàng** | `orderId`, thông tin giao dịch thanh toán (`transactionId`...) | Đơn hàng chưa được thanh toán trước đó VÀ giao dịch (`transactionId`) chưa từng được dùng để thanh toán đơn khác | Đánh dấu đơn hàng đã thanh toán, lưu thời điểm thanh toán; từ chối nếu đã thanh toán hoặc giao dịch bị trùng |
| **Lấy Client ID cổng thanh toán** | — | Cấu hình hệ thống phải có Client ID hợp lệ | Trả về Client ID để frontend khởi tạo giao dịch |
| **Tính giá đơn hàng** | Danh sách sản phẩm trong giỏ (`items`) | Không có điều kiện chặn; áp dụng công thức tính giá + quy tắc miễn phí vận chuyển khi tổng tiền hàng vượt ngưỡng | `itemsPrice`, `shippingPrice`, `taxPrice`, `totalPrice` được tính chính xác, làm tròn đúng 2 chữ số thập phân |
| **Làm tròn số thập phân** | 1 số thực | Không có điều kiện chặn | Số đã làm tròn đúng 2 chữ số thập phân |
| **Cập nhật giỏ hàng** | Danh sách sản phẩm trong giỏ (thêm/bớt/đổi số lượng) | Không có điều kiện chặn | Giỏ hàng được cập nhật, tổng tiền được tính lại theo hàm tính giá |

**Công thức logic tổng quát:**

```
CreateOrderValid = (orderItems không rỗng) AND (shippingAddress có giá trị)
ViewOrderValid   = (đơn hàng tồn tại) AND (người gọi là chủ đơn HOẶC là admin)
PayOrderValid    = (đơn hàng chưa thanh toán) AND (transactionId chưa từng được dùng) AND (PayPal xác thực thành công) AND (Số tiền thanh toán đúng)
FreeShipping     = (itemsPrice > ngưỡng miễn phí vận chuyển, giả định 100)
```

**Giả định của bài toán:**
1. Chỉ xét dữ liệu đầu vào hợp lệ về kiểu dữ liệu (mảng cho `orderItems`, chuỗi cho địa chỉ/mã giao dịch, số cho giá).
2. Định dạng `orderId` áp dụng cùng quy tắc đã nêu ở Feature 1 (24 ký tự hex).
3. Ngưỡng miễn phí vận chuyển được giả định là 100 (đơn vị tiền tệ hệ thống) — cần xác nhận với người ra đề nếu đặc tả gốc có ngưỡng khác.
4. Việc tính giá phải xử lý đúng vấn đề sai số dấu phẩy động (floating-point precision) khi cộng các số thập phân — đây là một rủi ro kỹ thuật cần kiểm thử riêng, không chỉ kiểm thử đúng-sai logic thông thường.

---

## 2. Phân hoạch lớp tương đương (Equivalence Partitioning)

| Biến đầu vào | Lớp hợp lệ | Tag | Lớp không hợp lệ | Tag |
|---|---|---|---|---|
| **orderItems** | Mảng có ít nhất 1 sản phẩm | V1 | Mảng rỗng | X1 |
| **shippingAddress** | Có giá trị đầy đủ | V2 | Thiếu/rỗng | X2 |
| **Quyền xem đơn hàng** | Người gọi là chủ đơn | V3 | Người gọi không phải chủ đơn (và không phải admin) | X3 |
| **orderId** | Đúng định dạng, tồn tại | V4 | Sai định dạng | X4 |
| | | | Đúng định dạng nhưng không tồn tại | X5 |
| **Trạng thái thanh toán đơn hàng** | Chưa thanh toán (`isPaid = false`) | V5 | Đã thanh toán trước đó (`isPaid = true`) | X6 |
| **Trạng thái giao dịch (transactionId)** | Chưa từng được dùng | V6 | Đã được dùng để thanh toán 1 đơn khác | X7 |
| **Giá trị thanh toán (payment value)** | Khớp totalPrice | V7 | Sai totalPrice | X8 |
| **Giỏ hàng khi tính giá** | Có ≥1 sản phẩm | V8 | Rỗng (không sản phẩm nào) | X9 |
| **itemsPrice so với ngưỡng miễn phí ship** | > ngưỡng (được miễn phí ship) | V9 | ≤ ngưỡng (vẫn tính phí ship) | (thuộc miền hợp lệ khác, không phải lớp lỗi — xem ghi chú) |

> Ghi chú: dòng cuối (`itemsPrice` so với ngưỡng) không phải là cặp hợp lệ/không hợp lệ theo nghĩa "input sai" — cả 2 phía đều là input hợp lệ, chỉ khác **nhánh xử lý** được kích hoạt. Trường hợp này được xử lý như 1 quyết định (decision) trong phần Whitebox (mục 6.4) thay vì như 1 lớp lỗi.

---

## 3. Phân tích giá trị biên (Boundary Value Analysis)

### 3.1. Ngưỡng miễn phí vận chuyển (`itemsPrice`, giả định ngưỡng = 100)

| Biến | Giá trị | Ý nghĩa | Tag biên |
|---|---:|---|---|
| itemsPrice | 0 | giỏ hàng rỗng (biên dưới tuyệt đối) | B1 |
| itemsPrice | 99.99 | ngay dưới ngưỡng — vẫn tính phí ship | B2 |
| itemsPrice | 100.00 | Vẫn tính phí ship | B3 |
| itemsPrice | 100.01 | Miễn phí ship | B4 |


### 3.2. Độ chính xác làm tròn số thập phân (rủi ro sai số dấu phẩy động)

| Giá trị test | Lý do chọn | Kết quả mong đợi | Tag biên |
|---|---|---|---|
| `0.1 + 0.2` | Phép cộng số thập phân kinh điển gây sai số nhị phân (`0.30000000000000004` nếu không xử lý đúng) | `0.30` | B5 |
| `1.005` | Giá trị nằm đúng tại ranh giới làm tròn, dễ phát sinh lỗi biểu diễn số thực | 1.01 | B6 |
| `-5.555` | Số âm — kiểm tra hàm làm tròn xử lý đúng dấu âm | Đúng 2 chữ số thập phân, giữ dấu âm | B7 |

> Đây không phải BVA trên khoảng `[min, max]` mà là kiểm thử các giá trị "rủi ro cao" đặc trưng cho bài toán làm tròn số — tương tự tinh thần của BVA (chọn giá trị dễ gây lỗi nhất) nhưng áp dụng cho vấn đề độ chính xác số học thay vì ranh giới miền hợp lệ.

### 3.3. Độ dài `orderId` (áp dụng lại quy tắc đã định nghĩa ở Feature 1)

| Biến | min | min+ | nominal | max- | max | Tag biên |
|---|---:|---:|---:|---:|---:|---|
| Độ dài orderId | 24 (hợp lệ) | — | 24 | 23 | 25 | B8 (=24, hợp lệ), B9 (23, invalid), B10 (25, invalid) |

---

## 4. Bảng test case

| STT | Tên test case | Input | Kết quả mong đợi | Tag được bao phủ |
|---:|---|---|---|---|
| 1 | Tạo đơn hàng thành công | `orderItems` hợp lệ, `shippingAddress` đầy đủ | Tạo đơn hàng thành công, trả về thông tin đơn — **Hợp lệ** | V1, V2 |
| 2 | Tạo đơn hàng – giỏ hàng rỗng | `orderItems = []` | Từ chối, báo "No order items" — **Không hợp lệ**: giỏ hàng rỗng | X1 |
| 3 | Tạo đơn hàng – chưa đăng nhập | Không gửi token xác thực | Từ chối, báo "Not authorized" — **Không hợp lệ**: thiếu quyền truy cập | — |
| 4 | Xem danh sách đơn hàng của tôi | Token hợp lệ | Trả về danh sách đơn hàng thuộc về người dùng hiện tại — **Hợp lệ** | V3 |
| 5 | Xem chi tiết đơn hàng – chủ đơn | `orderId` hợp lệ, người gọi là chủ đơn | Trả về đầy đủ thông tin đơn hàng — **Hợp lệ** | V3, V4 |
| 6 | Xem chi tiết đơn hàng – không tồn tại | `orderId` đúng định dạng nhưng không có trong DB | Từ chối, báo "Order not found" — **Không hợp lệ**: đơn không tồn tại | X5 |
| 7 | Giao đơn hàng chưa thanh toán | `orderId` hợp lệ, đơn hàng có `isPaid = false` | Từ chối, báo "Order not paid" — **Không hợp lệ**: đơn chưa thanh toán | — |
| 8 | Truy cập route Admin bằng User thường | Gọi API của Admin (VD: PUT deliver) với token user thường | Từ chối, báo "Not authorized as an admin" — **Không hợp lệ**: sai quyền | X3 |
| 9 | Xác nhận thanh toán – thành công | `orderId` hợp lệ, giao dịch mới, đơn chưa thanh toán | Đánh dấu đã thanh toán, ghi nhận thời điểm — **Hợp lệ** | V4, V5, V6 |
| 10 | Xác nhận thanh toán – giao dịch trùng | `transactionId` đã được dùng thanh toán đơn khác | Từ chối, báo "Transaction has been used before" — **Không hợp lệ**: trùng giao dịch | X7 |
| 11 | Tạo đơn hàng – thiếu địa chỉ giao hàng | `orderItems` hợp lệ, thiếu `shippingAddress` | Từ chối, báo lỗi "Shipping address is required" — **Không hợp lệ**: thiếu shippingAddress | X2 |
| 12 | Lấy Client ID cổng thanh toán | Không truyền tham số | Trả về Client ID không rỗng — **Hợp lệ** | — |
| 13 | Xem danh sách toàn bộ đơn hàng (Admin) | Token Admin hợp lệ | Trả về danh sách toàn bộ đơn hàng hệ thống — **Hợp lệ** | — |
| 14 | Chặn xem danh sách đơn hàng (User thường) | Token user thường hợp lệ | Từ chối, báo "Not authorized as an admin" — **Không hợp lệ**: không có quyền Admin | X3 |
| 15 | Tính giá đơn hàng – trường hợp thông thường | `items` hợp lệ, itemsPrice dưới ngưỡng miễn phí ship | `itemsPrice`, `shippingPrice`, `taxPrice`, `totalPrice` đúng công thức — **Hợp lệ** | V7, B2 |
| 16 | Tính giá đơn hàng – sai số thập phân | `items` với giá trị `0.1 × 3` | Kết quả đúng `0.30`, không lỗi sai số dấu phẩy động — **Hợp lệ (biên)** | V7, B5 |
| 17 | Tính giá đơn hàng – giỏ hàng rỗng | `items = []` | `itemsPrice = 0`, `totalPrice = shippingPrice` — **Hợp lệ (biên)** | X8, B1 |
| 18 | Làm tròn số thập phân – số dương | Số thực bất kỳ (VD `1.005`) | Trả về đúng 2 chữ số thập phân — **Hợp lệ (biên)** | B6 |
| 19 | Làm tròn số thập phân – số âm | Số âm (VD `-5.555`) | Trả về đúng 2 chữ số thập phân, giữ dấu âm — **Hợp lệ (biên)** | B7 |

*Đã 19 test case, có cả hợp lệ/không hợp lệ, có test tại biên (TC10, TC11, TC16, TC17), expected result ghi rõ kèm lý do, mỗi TC có tag — đủ yêu cầu Câu 3.*

---

## 5. Whitebox — CFG, Cyclomatic Complexity, Independent Path

> Control Flow Graph dưới đây được dựng lại từ luồng xử lý mô tả trong đặc tả (mục 1); khi triển khai thực tế, cần đối chiếu lại với luồng xử lý thật của mã nguồn để đảm bảo CFG khớp chính xác.

### 5.1. Chức năng "Tạo đơn hàng" (addOrderItems) — worked example đầy đủ

```
N1: Start → N2: Nhận {orderItems, shippingAddress, paymentMethod}
N3: [Decision 1] shippingAddress thiếu/rỗng?   // False, tiếp tục
N4: Từ chối, báo lỗi thiếu địa chỉ                   // True
N5: [Decision 2] orderItems rỗng?  
N6: Từ chối, "No order items"           // True
N7: Tạo đơn hàng thành công                   // False
N8: End
```

- 2 điểm quyết định → **V(G) = 2 + 1 = 3**
- **Independent paths (3):**
  - P1: orderItems rỗng → **TC2**
  - P2: orderItems hợp lệ, thiếu shippingAddress → **TC11**
  - P3: orderItems hợp lệ, shippingAddress đầy đủ → **TC1**

### 5.2. Chức năng "Xem chi tiết đơn hàng" (getOrderById)

```
N1: Start → N2: tìm đơn hàng theo orderId
N3: [Decision 1] Đơn hàng có tồn tại?
N4: Từ chối, "Order not found"                          // False
N5: [Decision 2] Người gọi có phải chủ đơn (hoặc admin)?  // True (tồn tại), tiếp tục
N6: Từ chối, không có quyền                             // False
N7: Trả về thông tin đơn hàng                            // True
N8: End
```

- 2 điểm quyết định → **V(G) = 3**
- **Independent paths (3):**
  - P1: không tồn tại → **TC6**
  - P2: tồn tại, không có quyền → **(Chưa có TC)**
  - P3: tồn tại, có quyền → **TC5**

### 5.3. Chức năng "Xác nhận thanh toán đơn hàng" (updateOrderToPaid)
```
N1: Start → N2: tìm đơn hàng theo orderId
N3: [Decision 1] Đơn hàng có tồn tại?
N4:   Từ chối, "Order not found"                               // False
N5:   [Decision 2] Đơn hàng đã thanh toán trước đó (isPaid)?    // True, tiếp tục
N6:     Từ chối, ngăn thanh toán lần 2                          // True
N7:     [Decision 3] PayPal xác thực thành công?                // False, tiếp tục
N8:       Từ chối, "Payment not verified"                       // False
N9:       [Decision 4] Transaction đã được dùng trước đó?       // True, tiếp tục
N10:        Từ chối, "Transaction has been used before"         // True
N11:        [Decision 5] Số tiền thanh toán đúng?               // False, tiếp tục
N12:          Từ chối, "Incorrect amount paid"                  // False
N13:          Đánh dấu đã thanh toán, lưu thông tin giao dịch   // True
N14: End
```
- 5 điểm quyết định → V(G) = 5 + 1 = 6
- **Independent paths (6):**
- P1: Đơn hàng không tồn tại → **TC6**
- P2: Đơn hàng đã thanh toán → **(Chưa có TC)**
- P3: PayPal xác thực thất bại → **(Chưa có TC)**
- P4: Transaction đã được sử dụng → **TC10**
- P5: Thanh toán sai số tiền → **(Chưa có TC)**
- P6: Thanh toán thành công → **TC9**

### 5.4. Chức năng "Tính giá đơn hàng" (calcPrices)

```
N1: Start → N2: Nhận danh sách items
N3: [Decision 1] Giỏ hàng rỗng?
N4:   itemsPrice = 0, chỉ tính shippingPrice cố định       // True
N5:   Tính itemsPrice = tổng (price × qty)                  // False, tiếp tục
N6: [Decision 2] itemsPrice > ngưỡng miễn phí ship (100)?
N7:   shippingPrice = 0                                      // True
N8:   shippingPrice = giá trị mặc định                        // False
N9: Tính taxPrice, totalPrice; làm tròn 2 chữ số thập phân
N10: End
```

- 2 điểm quyết định → **V(G) = 3**
- **Independent paths (3):**
  - P1: giỏ hàng rỗng → **TC17**
  - P2: không rỗng, itemsPrice ≤ ngưỡng → **TC15 / TC16**
  - P3: không rỗng, itemsPrice > ngưỡng (miễn phí ship) → **cần bổ sung test case mới, chưa có trong bộ 20 TC ở mục 4 — gap coverage cần bổ sung** (đây là path dễ bị bỏ sót nhất vì không xuất hiện lỗi rõ ràng nếu bỏ qua, chỉ sai số tiền)

### 5.5. Chức năng "Làm tròn số thập phân" (addDecimals) và các hàm không phân nhánh

- `addDecimals`: chỉ thực hiện phép toán làm tròn, không có điểm quyết định → **V(G) = 1**, 1 path duy nhất. **TC18** và **TC19** cùng đi qua 1 path này — không tạo thêm path mới, nhưng vẫn cần thiết vì đây là kiểm thử giá trị biên trên cùng 1 path (giá trị dễ gây lỗi làm tròn khác nhau), không phải kiểm thử nhánh khác nhau.
- `getMyOrders`, `getPaypalClientId`, `updateCart`: đều là luồng xử lý thẳng, không có điểm quyết định trong phạm vi đặc tả → **V(G) = 1** mỗi hàm, tương ứng **TC4**, **TC12**, **TC20**.
- `updateCart`: V(G) = 1. (Ghi chú: Hàm này xử lý state giỏ hàng bên Frontend nên không đưa vào phạm vi thiết kế Test Case của báo cáo Backend này).

### 5.6. Tổng hợp Cyclomatic Complexity

| Chức năng | Số quyết định | V(G) | Số path cần test | Đã có đủ TC? |
|---|---:|---:|---:|---|
| Tạo đơn hàng | 2 | 3 | 3 | ✅ |
| Xem chi tiết đơn hàng | 2 | 3 | 3 | ⚠️ thiếu path "không có quyền" |
| Xác nhận thanh toán | 5 | 6 | 6 | ⚠️ thiếu 3 path lỗi thanh toán |
| Tính giá đơn hàng | 2 | 3 | 3 | ⚠️ thiếu path "itemsPrice > ngưỡng, miễn phí ship" |
| Làm tròn số thập phân | 0 | 1 | 1 | ✅ |
| Danh sách đơn/Client ID/Cập nhật giỏ | 0 (mỗi hàm) | 1 (mỗi hàm) | 1 (mỗi hàm) | ✅ |

### 5.7. Bảng đo độ phủ (Coverage Metrics) — phần bắt buộc của Whitebox

> Câu trả lời cuối cùng của phần whitebox: sau khi đã vẽ CFG, tính V(G), liệt kê independent path (5.1–5.6), bảng này đo xem test case thật sự đã **chạy qua** bao nhiêu % số path/nhánh/dòng đó khi triển khai. 4 cột được thêm sau cột Metric: Total, Covered, Coverage %, Tool sử dụng.

<!-- COVERAGE_TABLE_START -->
| Metric (độ phủ) | Total | Covered | Coverage % | Tool sử dụng |
|---|---:|---:|---:|---|
| Statement coverage | 75 | 59 | 78.66% | jest --coverage (Istanbul/nyc) |
| Branch coverage | 26 | 17 | 65.38% | jest --coverage (Istanbul/nyc) |
| Function coverage | 12 | 12 | 100% | jest --coverage (Istanbul/nyc) |
| Line coverage | 75 | 59 | 78.66% | jest --coverage (Istanbul/nyc) |
<!-- COVERAGE_TABLE_END -->

---

