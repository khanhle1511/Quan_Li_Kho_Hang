# language: vi
@canh-bao
Tính năng: Cảnh báo tồn thấp
  Danh sách cảnh báo, tạo phiếu nhập từ cảnh báo, kho tạm ngưng không bị cảnh báo.
  3 tính năng · 4 test case · Tham chiếu BR-24, F6, F9.

  Quy tắc: ALT-01 – Danh sách cảnh báo tồn thấp (UI + API · P2 · BR-24)
    Tồn ≤ min tại kho active, số thiếu, đề xuất nhập.

    @ALT-01 @TC-ALT-01-01 @P2 @after-reset
    Kịch bản: Danh sách cảnh báo ban đầu
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở màn "Cảnh báo tồn thấp"
      Thì danh sách có 4 dòng
      Và badge trên menu là 4
      Và dòng P04 tại HN đề xuất nhập 14 Hộp

    @ALT-01 @TC-ALT-01-02 @P2 @smoke
    Kịch bản: Số cảnh báo ở /api/public/summary khớp giao diện
      Cho tôi chưa đăng nhập
      Khi tôi gọi GET "/api/public/summary" và ghi nhận "low"
      Và tôi đăng nhập rồi mở màn "Cảnh báo tồn thấp"
      Thì số dòng cảnh báo bằng "low"

  Quy tắc: ALT-02 – Tạo phiếu nhập từ cảnh báo (UI · P2 · F9)
    Điền sẵn kho, hàng, số lượng = max(2×min − tồn, 1).

    @ALT-02 @TC-ALT-02-01 @P2 @regression
    Kịch bản: Tạo phiếu nhập từ cảnh báo rồi duyệt (F9)
      Cho fixture [TEST] đã được tạo
      Và tồn T_PROD tại HN đã được đưa về ≤ 10 ngay trong test này (lập PX rồi duyệt), không phụ thuộc TC khác
      Khi Staff bấm "Tạo phiếu nhập" ở dòng T_PROD
      Thì form điền sẵn số lượng = max(20 − tồn, 1)
      Khi Staff lưu phiếu và Manager duyệt
      Thì dòng T_PROD biến mất khỏi màn "Cảnh báo tồn thấp"

  Quy tắc: ALT-03 – Kho tạm ngưng không bị cảnh báo (API · P2 · BR-24, F6)
    Badge menu và /api/public/summary loại kho paused.

    @ALT-03 @TC-ALT-03-01 @P2 @regression
    Kịch bản: Kho mới tính cảnh báo, kho tạm ngưng thì không
      Cho Admin đã đăng nhập
      Và "/api/public/summary" có "low" = L và số hàng hóa = N
      Khi Admin tạo T_WH ở trạng thái active
      Thì "low" là L + N
      Khi Admin tạm ngưng T_WH
      Thì "low" trở lại L
