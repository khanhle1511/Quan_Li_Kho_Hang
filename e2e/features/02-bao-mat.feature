# language: vi
@bao-mat
Tính năng: Bảo mật
  Chặn API khi chưa đăng nhập, chống XSS, brute-force và mật khẩu dài.
  3 tính năng · 6 test case · Tham chiếu RISK-07, RISK-08, RISK-09.

  Quy tắc: SEC-01 – Chặn API khi chưa đăng nhập (API · P1)
    Mọi endpoint trừ /api/auth/* và /api/public/* trả 401.

    @SEC-01 @TC-SEC-01-01 @P1 @smoke
    Khung kịch bản: <phương thức> <đường dẫn> khi chưa đăng nhập trả 401
      Cho tôi không có cookie phiên
      Khi tôi gọi <phương thức> "<đường dẫn>"
      Thì mã phản hồi là 401

      Dữ liệu:
        | phương thức | đường dẫn              |
        | GET         | /api/state             |
        | POST        | /api/receipts          |
        | GET         | /api/files/{id bất kỳ} |

    @SEC-01 @TC-SEC-01-02 @P2 @smoke
    Kịch bản: API công khai vẫn trả dữ liệu
      Cho tôi không có cookie phiên
      Khi tôi gọi GET "/api/public/summary"
      Thì mã phản hồi là 200
      Khi tôi gọi GET "/api/auth/me"
      Thì mã phản hồi là 200
      Và phản hồi có "user" là null

  Quy tắc: SEC-02 – Chống XSS khi hiển thị dữ liệu (UI · P1 · RISK-09)
    Tên, ghi chú… được escape trên mọi màn hình và popup.

    @SEC-02 @TC-SEC-02-01 @P1 @regression @risk
    Kịch bản: Tên đối tác chứa HTML không bị thực thi
      Cho fixture [TEST] đã được tạo
      Và Manager đã đăng nhập
      Khi Manager tạo nhà cung cấp tên "[TEST] <img src=x onerror=alert(1)>"
      Và tôi mở danh sách NCC, chi tiết NCC, popup "#hpop" và màn "Nhập kho"
      Thì tên hiển thị nguyên văn dạng chữ ở mọi nơi
      Và không có hộp thoại alert nào xuất hiện

    @SEC-02 @TC-SEC-02-02 @P2 @regression @risk
    Kịch bản: Ghi chú phiếu / tên hàng chứa script
      Cho fixture [TEST] đã được tạo
      Khi Staff lập phiếu T_PROD với ghi chú "[TEST] <script>alert(1)</script>"
      Và Manager thêm hàng hóa tên "[TEST] <b>x</b>"
      Thì ghi chú và tên hàng hiển thị dạng chữ ở danh sách phiếu, thẻ kho và báo cáo
      Và không có script nào được thực thi

  Quy tắc: SEC-03 – Brute-force / mật khẩu dài (API · P2 · RISK-07, RISK-08)
    Khóa tạm sau 5 lần sai (đặc tả), mật khẩu > 72 byte.

    @SEC-03 @TC-SEC-03-01 @P2 @regression @risk
    Kịch bản: Đăng nhập sai liên tiếp 6 lần
      Cho fixture [TEST] đã được tạo
      Và T_USER đang hoạt động
      Khi tôi đăng nhập T_USER sai mật khẩu 6 lần liên tiếp
      Thì lần thứ 6 tài khoản bị khóa tạm theo đặc tả
      # Hiện chưa cài đặt khóa tạm ⇒ test thất bại thì ghi bug (RISK-07)

    @SEC-03 @TC-SEC-03-02 @P2 @regression @risk
    Kịch bản: Mật khẩu rất dài (> 72 byte)
      Cho fixture [TEST] đã được tạo
      Và Admin đã đăng nhập
      Khi Admin tạo user với mật khẩu dài 100 ký tự
      Và tôi đăng nhập user đó bằng 72 ký tự đầu nối thêm một chuỗi khác
      Thì việc tạo bị từ chối 400 rõ ràng, hoặc chỉ mật khẩu đúng mới đăng nhập được
      Và không có phản hồi 500
