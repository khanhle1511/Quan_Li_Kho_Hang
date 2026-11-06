# Hạn chế đã biết (không tính là bug)

Những điểm quan sát được khi đi qua toàn bộ luồng ngày 07/11/2026, trùng với các RISK trong đặc tả mục 11. Ghi lại để không tạo bug trùng và để có cơ sở nếu sau này muốn thay đổi thiết kế.

| Mã | Quan sát | Hiện trạng | Ghi chú |
| --- | --- | --- | --- |
| RISK-04 | Kiểm kê so với tồn **lúc xác nhận**, không phải tồn lúc bắt đầu phiên | Đúng như code | Nếu có phiếu được duyệt trong lúc đang đếm, số đếm sẽ ghi đè biến động đó. Cần quyết định nghiệp vụ trước khi coi là bug. |
| RISK-06 | Manager nhận SĐT của mọi người dùng (kể cả admin) trong `/api/state.users` | Đúng như code (`Rules.HIDE_CONTACT.wh` chỉ ẩn với staff) | Nếu yêu cầu bảo mật chặt hơn, đổi quy tắc ẩn SĐT người dùng sang chỉ admin thấy. |
| RISK-07 | Chưa khóa tạm sau 5 lần sai mật khẩu | Chưa cài đặt | Đặc tả UC01 có yêu cầu; cần thêm bộ đếm theo SĐT ở `AuthService`. |
| RISK-10 | Không có CSRF token; SameSite=Lax chỉ ở profile prod | Đúng như code | Ứng dụng demo nội bộ; ghi nhận mức rủi ro. |
| RISK-11 | Báo cáo: nhãn kỳ cố định "Tháng 11/2026", tồn đầu kỳ tính từ toàn bộ thẻ kho; Xuất Excel/PDF chỉ là thông báo mô phỏng | Đúng như code | Thấy rõ ở ảnh `51-VIEW-reports.png`. |
| RISK-12 | Phiên kiểm kê chỉ lưu trong bộ nhớ trang; tải lại trang là mất số đã đếm | Đúng như code | Đổi người cùng tab thì vẫn giữ (F4 đạt). |
| RISK-17 | Phiên đăng nhập lưu trong bộ nhớ máy chủ; Render khởi động lại là mọi người phải đăng nhập lại | Đúng như code | Giao diện xử lý đúng: về trang đăng nhập với thông báo rõ (ảnh `99-F5-locked-session-expired.png`). |
| — | Seeder chạy **sau** khi Tomcat mở cổng, nên request đầu tiên ngay lúc khởi động lần đầu có thể thấy số 0 | Đúng như code | Chỉ ảnh hưởng lần chạy đầu với CSDL trống; test nên đợi `/api/public/summary` trả `warehouses > 0`. |

Các RISK chưa kiểm tra: 01, 02, 03 (đồng thời), 05, 08, 09, 13, 14, 15, 16, 18, 19, 20, 21. Viết test `risk_…` trong `e2e/tests/` cho từng mục.
