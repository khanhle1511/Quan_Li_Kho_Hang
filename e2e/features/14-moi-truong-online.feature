# language: vi
@moi-truong-online
Tính năng: Môi trường online
  Vận hành trên Render + CSDL Aiven: thức dậy, HTTPS, pool kết nối, hiệu năng, file lớn, tiếng Việt.
  1 tính năng · 6 test case · Tham chiếu mục 2.5, RISK-16..RISK-21.
  Bộ này chỉ có ý nghĩa trên bản online; chỉ chạy sau khi đã deploy theo yêu cầu.

  Quy tắc: ENV-01 – Vận hành trên Render + Aiven (Hạ tầng · P2 · RISK-16 → RISK-21)

    @ENV-01 @TC-ENV-01-01 @P2 @smoke @risk
    Kịch bản: Máy chủ thức dậy sau khi ngủ
      Cho bản online không được truy cập trong hơn 15 phút
      Khi tôi gọi GET "/api/public/summary" và đo thời gian
      Thì nhận được 200 trong vòng 90 giây
      # Có thể nhận 502 tạm thời trước đó

    @ENV-01 @TC-ENV-01-02 @P3 @smoke @risk
    Kịch bản: Truy cập bằng http thay vì https
      Cho bản online, hoặc local chạy profile prod
      Khi tôi mở ứng dụng bằng "http://", đăng nhập và thao tác
      Thì tôi được chuyển hướng sang https hoặc thấy thông báo rõ ràng
      Và không bị vòng lặp đăng nhập

    @ENV-01 @TC-ENV-01-03 @P2 @exclusive @risk
    Kịch bản: Nhiều người dùng đồng thời với pool 4 kết nối
      Cho nhóm đã được báo trước về khung giờ chạy
      Khi tôi gửi song song 20 request GET "/api/state" bằng 3 phiên
      Thì không có phản hồi 500
      Và thời gian phản hồi được ghi lại

    @ENV-01 @TC-ENV-01-04 @P3 @exclusive @risk
    Kịch bản: Hiệu năng /api/state khi dữ liệu lớn
      Cho dữ liệu mẫu vừa được reset
      Và nhóm đã được báo trước về khung giờ chạy
      Khi tôi tạo và duyệt 300 phiếu [TEST] với T_PROD
      Và tôi đo thời gian GET "/api/state" và thời gian vẽ màn "Tổng quan"
      Thì cả hai dưới 2 giây
      # Vượt ngưỡng ⇒ ghi vấn đề hiệu năng. Reset CSDL sau khi đo.

    @ENV-01 @TC-ENV-01-05 @P2 @regression @risk
    Kịch bản: Upload PDF gần 10 MB
      Cho fixture [TEST] đã được tạo
      Khi Manager tải PDF 9,9 MB lên T_CUS rồi bấm "Xem"
      Thì thao tác thành công hoặc có lỗi rõ ràng
      Và máy chủ không khởi động lại (exit 137)

    @ENV-01 @TC-ENV-01-06 @P2 @regression @risk
    Kịch bản: Lưu tiếng Việt có dấu và emoji
      Cho fixture [TEST] đã được tạo
      Khi tôi lưu ghi chú T_SUP là "[TEST] Giao hàng 🚚 – Đà Nẵng, Hội An"
      Và tôi đọc lại "/api/state"
      Thì ghi chú trả về nguyên văn
      Và không có lỗi 500 "Incorrect string value"
