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
| USR-07 | Lịch sử hoạt động của tài khoản **đã xóa**: API `/api/users/{id}/activity` trả 404 dù nhật ký vẫn còn trong CSDL (TC-USR-07-10) | Đúng như đặc tả USR-07 mục 6 | Cân nhắc cho Admin xem lịch sử tài khoản đã xóa (tra theo user_id, bỏ kiểm tra tồn tại). |
| USR-07 | Lịch sử **suy ra** từ chứng từ cũ dò người duyệt/xác nhận/tải hồ sơ theo **tên**; hai tài khoản trùng tên có thể bị gán nhầm. Thao tác chỉ ở trình duyệt (mở phiên kiểm kê) không được ghi | Đúng như đặc tả USR-07 mục 6 | Dòng suy ra có nhãn "Suy ra từ chứng từ". |
| RCPT-10 | Thẻ kho qua API: `/api/state.history[]` vẫn trả delta/after của phiếu do Admin lập cho Quản lý kho (chỉ che trên giao diện) (TC-RCPT-10-13) | Đúng như đặc tả RCPT-10 mục 5 | Cân nhắc che ở máy chủ; lưu ý tồn hiện tại vẫn hiển thị nên chênh lệch tồn cũng suy ra được. |
| RCPT-10 | Phiếu do tài khoản Admin **đã xóa** lập không tra được vai trò nên **không bị che** với Quản lý kho | Đúng như đặc tả RCPT-10 mục 5 | Liên quan việc xóa cứng tài khoản (xem thêm BUG-011). |
| AUTH-08 | Giới hạn 20 lần gửi mã/giờ **theo IP** đọc IP từ header `X-Forwarded-For` (cần khi chạy sau proxy của Render). Header này do client gửi nên **giả được**: kẻ tấn công đổi IP giả để vượt giới hạn theo IP | Đúng như đặc tả AUTH-08 (SEC-06) | Giới hạn chính vẫn giữ: theo SĐT (60 giây, 5 mã/giờ) và 5 lần nhập sai mỗi mã. Muốn chặt hơn: chỉ tin địa chỉ do proxy Render thêm vào (phần tử cuối của `X-Forwarded-For`). Bộ e2e dựa vào đặc điểm này để mỗi kịch bản có IP riêng. |
| AUTH-08 | Giới hạn số lần **kiểm tra mã** theo IP (30/giờ) lưu trong bộ nhớ, mất khi khởi động lại máy chủ | Đúng như code | Giới hạn gửi mã theo SĐT/IP lưu trong CSDL nên không mất. Mỗi mã vẫn chỉ được nhập sai 5 lần (lưu trong CSDL). |
| RCPT-10 | Phiếu **xuất** do Admin lập chỉ một Admin khác duyệt được (BR-09 + BR-26); hệ thống chỉ có một Admin thì phiếu đó không ai duyệt được | Đúng như đặc tả RCPT-10 mục 3 | Có thể nới cho Admin tự duyệt phiếu của mình nếu nghiệp vụ cho phép. |

Các RISK chưa kiểm tra: 01, 02, 03 (đồng thời), 05, 08, 09, 13, 14, 15, 16, 18, 19, 20, 21. Viết test `risk_…` trong `e2e/tests/` cho từng mục.
