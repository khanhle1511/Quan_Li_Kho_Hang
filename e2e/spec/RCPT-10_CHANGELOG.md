# RCPT-10 – Tab "Phiếu nhập/xuất" và popup chi tiết phiếu

**Phạm vi:** Quản trị viên và Quản lý kho có thêm tab **Phiếu nhập/xuất** liệt kê toàn bộ phiếu, tìm kiếm, lọc và bấm vào từng phiếu để xem chi tiết dạng popup. Phiếu do Quản trị viên lập bị **che số liệu** với Quản lý kho. Từ *Lịch sử hoạt động* (USR-07), bấm vào dòng "Lập/Duyệt phiếu …" sẽ chuyển sang tab này và mở đúng phiếu.

## 1. File thay đổi (`RCPT-10_code.zip`) – 4 file, không có file mới

| File | Thay đổi |
| --- | --- |
| `src/main/java/com/qlkho/service/StateService.java` | `receipts[]` thêm `creatorRole`, `masked`, `lineCount`. Với người xem là Quản lý kho và người lập là Admin: `masked = true`, `lines = []`, `note = ""` |
| `src/main/java/com/qlkho/service/InventoryService.java` | Thêm `checkCanDecide()`: Quản lý kho duyệt/từ chối phiếu do Admin lập → **403** `"Phiếu <mã> do Quản trị viên lập; Quản lý kho không được xử lý."` |
| `src/main/resources/static/index.html` | Tab mới, popup chi tiết, che số liệu ở mọi chỗ hiển thị phiếu, liên kết từ lịch sử hoạt động |
| `README.md` | Thêm quy tắc che phiếu của Admin vào mục 8 |

Giải nén, chép đè `qlkho-web/` vào repo, `git push`. **Không có thay đổi CSDL, không có API mới**, không cần reset.

## 2. Giao diện

**Tab Phiếu nhập/xuất** (menu *Nghiệp vụ*, chỉ Admin và Quản lý kho; Nhân viên kho không thấy và không vào được)
- 4 thẻ số liệu bấm để lọc: Tổng số phiếu, Chờ duyệt, Đã duyệt, Đã từ chối. Quản lý kho có thêm thẻ **Phiếu do Admin lập**.
- Tìm theo mã phiếu, đối tác, kho, hàng hóa (tên/SKU), người lập, người duyệt, ghi chú. Lọc theo Loại (Nhập/Xuất), Trạng thái, Kho.
- Bảng: mã phiếu (bấm được), loại, ngày lập + người lập (ghi "(Admin)" nếu Admin lập), đối tác, kho, hàng hóa, tổng số lượng, trạng thái, cột "Xử lý" (Cần duyệt / Phiếu của bạn / Chỉ Admin xem).

**Popup chi tiết phiếu** (selector `#rcv-title`)
- Đầu phiếu: loại, mã, chip trạng thái, chip "Admin lập", ngày lập.
- Thông tin: đối tác (kèm SĐT nếu vai trò được xem), kho, người lập (vai trò), người duyệt / người từ chối.
- Bảng dòng hàng: STT, SKU, tên, ĐVT, số lượng, giá vốn hiện tại, thành tiền, dòng tổng cộng; ghi chú; danh sách biến động thẻ kho của phiếu (nếu đã duyệt).
- Nút: **Xem đối tác**, **Duyệt phiếu / Từ chối** (chỉ khi pending, người xem có quyền, không phải người lập, không bị che), **Đóng**. Đóng bằng Esc hoặc bấm nền.
- Mã phiếu ở màn Nhập kho / Xuất kho cũng bấm được để mở popup. Nút "Mở" trong khối *Phiếu chờ duyệt* ở Tổng quan mở popup (với Admin/Manager).

**Che số liệu với Quản lý kho** (phiếu có `masked = true`)
- Danh sách: cột Hàng hóa và Tổng SL hiển thị `•••`, trạng thái thay bằng chip **"Admin cập nhật phiếu"**.
- Popup: cảnh báo "Phiếu do Quản trị viên lập…", chỉ hiện số mặt hàng; số lượng, giá trị, ghi chú = `•••`; không có nút Duyệt / Từ chối.
- Thẻ kho (Tồn kho), Biến động gần đây (Tổng quan), lịch sử phiếu của đối tác: dòng tham chiếu phiếu bị che hiển thị `•••`.
- Quản trị viên thấy đầy đủ mọi phiếu.

**Liên kết từ Lịch sử hoạt động (USR-07):** dòng có `targetType = receipt` trở thành nút; bấm → đóng bảng lịch sử, chuyển tab Phiếu nhập/xuất, mở popup phiếu đó.

## 3. Quy tắc nghiệp vụ mới

| Mã | Quy tắc | Kiểm soát |
| --- | --- | --- |
| BR-25 | Quản lý kho không xem được số liệu phiếu do Quản trị viên lập (dòng hàng, số lượng, giá trị, ghi chú) | Máy chủ lược dữ liệu trong `/api/state`; giao diện che hiển thị |
| BR-26 | Quản lý kho không duyệt / từ chối phiếu do Quản trị viên lập | API 403 + giao diện ẩn nút |

**Hệ quả cần biết:** phiếu do Admin lập chỉ có thể được duyệt bởi **một Admin khác** (vì BR-09 không cho tự duyệt). Nếu hệ thống chỉ có một tài khoản Admin thì phiếu đó sẽ không ai duyệt được. Nếu muốn, có thể nới quy tắc để Admin tự duyệt phiếu của mình.

## 4. Test case (`RCPT-10_testcases.xlsx`)

1 tính năng `RCPT-10`, 13 test case `TC-RCPT-10-01` → `-13`.

| Đợt | Số TC |
| --- | --- |
| 1 – Smoke (chỉ đọc) | 5 |
| 3 – Regression (fixture [TEST]) | 8 |

Dán nối vào cuối sheet *Features* và *Test Cases* của `QLKho_Test_Tracker.xlsx`.

## 5. Hạn chế đã biết

- **Thẻ kho qua API:** `history[]` trong `/api/state` vẫn chứa số lượng của phiếu bị che (chỉ che trên giao diện). Đã ghi thành `TC-RCPT-10-13` mức Risk.
- **Tài khoản Admin đã bị xóa:** phiếu do tài khoản đó lập không còn tra được vai trò nên **không bị che**.
- **Chưa chạy trên Spring Boot thật:** backend chỉ mới biên dịch. Sau khi deploy, kiểm tra nhanh: Admin lập 1 phiếu → đăng nhập Quản lý kho → tab Phiếu nhập/xuất phải hiện chip "Admin cập nhật phiếu" và popup không có số liệu.
