# Đi qua toàn bộ giao diện và luồng F1–F10 – 07/11/2026

- **Môi trường**: local, H2 mới nạp dữ liệu mẫu, cổng 8099, commit `aaaf02b`, Chromium headless (Playwright 1.50.1), viewport 1400×900.
- **Kịch bản**: `scripts/flows.js` (71 bước F1–F10) và `scripts/lockcheck.js` (RISK-17), là node thuần dùng Playwright; cách chạy ghi ở đầu mỗi file. Ảnh 01–20 chụp bằng một kịch bản khám phá đơn giản, nay đã thay bằng test "mở 12 màn hình" trong `e2e/tests/smoke.spec.ts`.
- **Kết quả**: 71/71 bước đạt, không lỗi JavaScript, không ghi nhận bug. Chi tiết từng bước trong `results.json`.

## Ảnh chụp

| Ảnh | Nội dung |
| --- | --- |
| 01–02 | Trang chủ, trang đăng nhập (thẻ tài khoản demo) |
| 03–14 | 12 màn hình với vai trò admin: Tổng quan, Nhập kho, Xuất kho, Kiểm kê, Tồn kho, Cảnh báo, Báo cáo, Hàng hóa, NCC, Khách hàng, Kho, Người dùng |
| 15–18 | Form thêm hàng hóa, thêm NCC, thêm kho (chọn thủ kho), tạo tài khoản |
| 19 | Chi tiết NCC-01: liên hệ, thống kê, hồ sơ PDF, ghi chú |
| 20 | Phiên kiểm kê đang mở (bảng đối chiếu) |
| 21 | Đăng nhập sai: thông báo trong form |
| 22–23 | Staff: dashboard, danh sách NCC bị ẩn liên hệ và hồ sơ |
| 24–25 | F1: staff lập PX-0003; BR-07 xuất quá tồn bị chặn |
| 26 | F3: hai phiếu xuất cùng mặt hàng đều tạo được (chưa giữ chỗ tồn) |
| 27 | F9: từ Cảnh báo → form nhập điền sẵn 14 |
| 28 | F4: staff đếm kiểm kê, không có nút xác nhận |
| 29–31 | Manager: dashboard; phiên kiểm kê vẫn còn sau khi đổi người; KK-0002 hoàn tất |
| 32 | F1: manager duyệt PX-0003, cảnh báo tồn thấp tăng 4 → 5 |
| 33 | F3: duyệt phiếu thứ hai bị chặn "chỉ còn 0 Cái" |
| 34 | F2: phiếu do manager lập không có nút Duyệt |
| 35–36 | F7: manager thấy NCC bị ẩn liên hệ/PDF, khách hàng thì thấy |
| 37 | F8: manager tải PDF cho KH-02 |
| 38 | Thêm hàng hóa P09 (danh mục mặc định "Khác") |
| 39 | F9: admin duyệt PN-0003, cảnh báo giảm 1 |
| 40 | F8: admin tải PDF cho NCC-03 |
| 41–44 | F5: tạo U6 nháp, U6 đăng nhập sau kích hoạt, U6 bị khóa → phiên hết hiệu lực, hộp thoại xóa tài khoản |
| 45–47 | F6: chọn thủ kho, tạo KHO-DN, tạm ngưng |
| 48 | F10: thủ kho bị khóa hiện cảnh báo trong danh sách kho |
| 49–52 | Tồn kho tìm kiếm, thẻ kho, báo cáo, dashboard cuối |
| 53 | Đăng xuất |
| 99 | RISK-17: tài khoản bị khóa trong lúc thao tác → về trang đăng nhập với thông báo |

## Số liệu kiểm chứng qua API

| Bước | Trước | Sau |
| --- | --- | --- |
| F1 duyệt PX-0003 (P02×60, HN) | tồn 80, cảnh báo 4 | tồn 20, cảnh báo 5, thẻ kho −60 |
| F3 duyệt PX-0004 rồi PX-0005 (P06×4, HCM, tồn 4) | | phiếu 1 → tồn 0; phiếu 2 bị từ chối, vẫn pending; từ chối → cancelled |
| F4 kiểm kê HN, P01 = 119 | tồn 120 | KK-0002, tồn 119, thẻ kho "Kiểm kê −1" |
| F9 duyệt PN-0003 (P04×14, HN) | tồn 6, cảnh báo 7 | tồn 20, cảnh báo 6 |
| F6 tạo KHO-DN | cảnh báo 6 | 15 (9 mặt hàng tồn 0); tạm ngưng → 6; xóa được |
