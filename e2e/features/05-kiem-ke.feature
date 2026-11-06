# language: vi
@kiem-ke
Tính năng: Kiểm kê
  Mở phiên, nhập số thực tế, xác nhận điều chỉnh tồn, bàn giao Staff → Manager, lịch sử.
  4 tính năng · 12 test case · Tham chiếu BR-13, F4, F6, RISK-04, RISK-12.

  Quy tắc: STK-01 – Mở phiên & nhập số thực tế (UI · P2)
    Chốt tồn hệ thống, nút −/+, tô vàng dòng lệch.

    @STK-01 @TC-STK-01-01 @P2 @smoke
    Kịch bản: Mở phiên kiểm kê
      Cho Staff đã đăng nhập
      Khi tôi mở màn "Kiểm kê"
      Và tôi chọn "Kho Hà Nội" và bấm "Bắt đầu kiểm kê"
      Thì phiên có 8 dòng, số thực tế bằng tồn hệ thống
      Và mọi dòng có chip "Khớp"
      Và thanh trạng thái hiển thị "ĐANG KIỂM KÊ"

    @STK-01 @TC-STK-01-02 @P3 @smoke
    Kịch bản: Nút −/+ cập nhật chênh lệch (không xác nhận)
      Cho Staff đang mở phiên kiểm kê "Kho Hà Nội"
      Khi tôi bấm "−" ở dòng 1
      Và tôi bấm "+" ở dòng 3
      Thì dòng 1 có chip "−1" và dòng 3 có chip "+1"
      Và cả 2 dòng được tô ".trow.hl"
      Và tổng kết hiển thị Thiếu 1, Thừa 1

    @STK-01 @TC-STK-01-03 @P3 @regression
    Kịch bản: Kho tạm ngưng không có trong danh sách chọn kho (F6)
      Cho fixture [TEST] đã được tạo
      Và T_WH đang tạm ngưng
      Khi Staff mở màn "Kiểm kê"
      Thì không có thẻ kho của T_WH

  Quy tắc: STK-02 – Xác nhận & điều chỉnh tồn (API · P1 · BR-13)
    Ghi thẻ kho "Kiểm kê", tạo KK-xxxx. Staff không được xác nhận (403).

    @STK-02 @TC-STK-02-01 @P1 @regression
    Kịch bản: Xác nhận kiểm kê có chênh lệch
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager gọi POST "/api/stocktakes" kho HN với T_PROD actual = t − 1
      Thì mã phản hồi là 200
      Và code có dạng "KK-xxxx" và diff là −1
      Và tồn T_PROD tại HN là t − 1
      Và thẻ kho có dòng "Kiểm kê" −1

    @STK-02 @TC-STK-02-02 @P2 @regression
    Kịch bản: Xác nhận không chênh lệch
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager gọi POST "/api/stocktakes" kho HN với T_PROD actual = t
      Thì mã phản hồi là 200
      Và diff là 0 và vẫn tạo mã "KK-xxxx"
      Và thẻ kho không có dòng mới

    @STK-02 @TC-STK-02-03 @P2 @smoke
    Khung kịch bản: Số thực tế <actual> bị từ chối
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/stocktakes" kho HN với một dòng actual = <actual>
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "phải là số nguyên ≥ 0."

      Dữ liệu:
        | actual |
        | -1     |
        | null   |

    @STK-02 @TC-STK-02-04 @P1 @smoke
    Kịch bản: Staff không xác nhận được
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/stocktakes"
      Thì mã phản hồi là 403
      Và trên giao diện Staff chỉ thấy thông báo cần Quản lý kho xác nhận

    @STK-02 @TC-STK-02-05 @P3 @regression
    Kịch bản: Kiểm kê kho tạm ngưng
      Cho fixture [TEST] đã được tạo
      Và T_WH đang tạm ngưng
      Khi Manager gọi POST "/api/stocktakes" với warehouseId = T_WH
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<tên T_WH> đang tạm ngưng, không thể kiểm kê."

    @STK-02 @TC-STK-02-06 @P2 @regression @risk
    Kịch bản: Biến động xảy ra trong lúc kiểm kê
      Cho fixture [TEST] đã được tạo
      Và Staff đang mở phiên kiểm kê HN trên giao diện
      Khi Admin duyệt 1 phiếu nhập T_PROD × 5 vào HN
      Và Manager xác nhận phiên kiểm kê mà không sửa số
      Thì cần quyết định nghiệp vụ về tồn T_PROD
      # Đã chốt ở BUG-008 (RISK-04): điều chỉnh theo chênh lệch thực tế − số hệ thống lúc mở phiên, nên +5 được giữ nguyên

  Quy tắc: STK-03 – Bàn giao Staff → Manager (UI · P1 · F4, RISK-12)
    Phiên giữ trong trang khi đổi người đăng nhập.

    @STK-03 @TC-STK-03-01 @P1 @regression
    Kịch bản: Bàn giao phiên kiểm kê (F4)
      Cho fixture [TEST] đã được tạo
      Và Staff mở phiên kiểm kê HN
      Và Staff chỉ sửa dòng T_PROD thành tồn − 1
      Khi Staff đăng xuất và Manager đăng nhập cùng tab
      Và Manager bấm xác nhận
      Thì phiên vẫn còn nguyên trước khi xác nhận
      Và sau khi xác nhận chỉ T_PROD tại HN giảm 1
      Và các mặt hàng khác không đổi

    @STK-03 @TC-STK-03-02 @P3 @smoke @risk
    Kịch bản: Tải lại trang làm mất phiên kiểm kê
      Cho Staff đang mở phiên kiểm kê và đã sửa số
      Khi tôi tải lại trang
      Thì phiên kiểm kê bị mất
      # Hạn chế đã biết (RISK-12) – chỉ ghi nhận

  Quy tắc: STK-04 – Lịch sử kiểm kê (UI · P3)
    Danh sách KK, kết quả Khớp / Lệch.

    @STK-04 @TC-STK-04-01 @P3 @after-reset
    Kịch bản: Lịch sử kiểm kê ban đầu
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở màn "Kiểm kê"
      Thì lịch sử có KK-0001 của "Kho Hà Nội" với 8 mặt hàng
      Và chip "Khớp hoàn toàn"
