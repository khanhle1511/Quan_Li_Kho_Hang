# language: vi
@so-phieu
Tính năng: Sổ phiếu nhập/xuất và popup chi tiết
  Tab Phiếu nhập/xuất (Admin, Quản lý kho): danh sách toàn bộ phiếu, tìm kiếm, lọc, popup đầy đủ chi tiết.
  Phiếu do Quản trị viên lập bị che số liệu với Quản lý kho (BR-25) và Quản lý kho không xử lý được (BR-26).
  Mở phiếu từ lịch sử hoạt động (USR-07).
  1 tính năng · 15 test case · Tham chiếu RCPT-10 (spec/RCPT-10_CHANGELOG.md, spec/RCPT-10_testcases.pdf), BR-25, BR-26.
  Lưu ý theo CR-01: phiếu NHẬP do Admin lập được duyệt ngay, nên "phiếu Admin chờ duyệt" trong các kịch bản là phiếu XUẤT.

  Quy tắc: RCPT-10 – Sổ phiếu nhập/xuất & popup chi tiết (API + UI · P1 · BR-25, BR-26)
    Admin thấy đầy đủ; Quản lý kho thấy phiếu của Admin dạng che; Nhân viên kho không có tab.

    @RCPT-10 @TC-RCPT-10-01 @P1 @smoke
    Kịch bản: Tab Phiếu nhập/xuất liệt kê toàn bộ phiếu
      Cho Admin đã đăng nhập
      Khi tôi mở tab "Phiếu nhập/xuất"
      Thì số dòng trong sổ phiếu bằng số phiếu trong "/api/state"
      Và có các thẻ số liệu "Tổng số phiếu", "Chờ duyệt", "Đã duyệt", "Đã từ chối"

    @RCPT-10 @TC-RCPT-10-02 @P1 @smoke
    Kịch bản: Staff không thấy tab và không vào được
      Cho Staff đã đăng nhập
      Khi tôi mở ứng dụng
      Thì menu không có mục "Phiếu nhập/xuất"
      Và màn hình đang ở "Tổng quan"

    @RCPT-10 @TC-RCPT-10-03 @P1 @smoke
    Kịch bản: Popup chi tiết phiếu đầy đủ
      Cho Admin đã đăng nhập
      Khi tôi mở tab "Phiếu nhập/xuất"
      Và tôi bấm mã phiếu "PN-0001"
      Thì popup phiếu hiển thị loại "PHIẾU NHẬP KHO", mã "PN-0001" và chip trạng thái
      Và popup phiếu có "Ngày lập", "Nhà cung cấp", "Nhập vào kho", "Người lập", "Người duyệt"
      Và popup phiếu có bảng dòng hàng với cột "SKU", "Hàng hóa", "ĐVT", "Số lượng", "Giá vốn", "Thành tiền" và dòng "Tổng cộng"
      Và popup phiếu có mục "Biến động thẻ kho"

    @RCPT-10 @TC-RCPT-10-04 @P2 @smoke
    Kịch bản: Tìm kiếm và lọc phiếu
      Cho Admin đã đăng nhập
      Khi tôi mở tab "Phiếu nhập/xuất"
      Và tôi gõ "Minh An" vào ô tìm phiếu
      Thì mọi dòng trong sổ phiếu đều chứa "Minh An"
      Khi tôi bỏ mọi bộ lọc sổ phiếu và chọn "Xuất" ở nhóm "Loại"
      Thì mọi dòng trong sổ phiếu đều chứa "Xuất"
      Khi tôi bỏ mọi bộ lọc sổ phiếu và chọn "Kho TP.HCM" ở nhóm "Kho"
      Thì mọi dòng trong sổ phiếu đều chứa "Kho TP.HCM"
      Khi tôi bỏ mọi bộ lọc sổ phiếu và bấm thẻ "Chờ duyệt"
      Thì mọi dòng trong sổ phiếu đều chứa "Chờ duyệt"
      Khi tôi bấm thẻ "Chờ duyệt"
      Thì số dòng trong sổ phiếu bằng số phiếu trong "/api/state"

    @RCPT-10 @TC-RCPT-10-05 @P1 @regression
    Kịch bản: Phiếu do Admin lập bị che số liệu
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu xuất T_PROD chờ duyệt
      Khi Manager đọc phiếu đó trong "/api/state"
      Thì phiếu đó có masked = true, lines rỗng và note rỗng
      Khi Manager mở tab "Phiếu nhập/xuất"
      Thì dòng phiếu đó hiển thị "•••" và chip "Admin cập nhật phiếu"
      Và thẻ "Phiếu do Admin lập" bằng số phiếu bị che trong "/api/state" của Manager

    @RCPT-10 @TC-RCPT-10-06 @P1 @regression
    Kịch bản: Popup phiếu bị che không có nút Duyệt / Từ chối
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu xuất T_PROD chờ duyệt
      Khi Manager mở tab "Phiếu nhập/xuất"
      Và tôi bấm mã phiếu đó
      Thì popup phiếu hiển thị cảnh báo "Phiếu do Quản trị viên lập"
      Và popup phiếu có ô "Mặt hàng" bằng 1, ô "Tổng số lượng" và "Giá trị" là "•••"
      Và popup phiếu không có nút "Duyệt phiếu" và "Từ chối"

    @RCPT-10 @TC-RCPT-10-07 @P1 @regression
    Kịch bản: API chặn Manager xử lý phiếu của Admin
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu xuất T_PROD chờ duyệt
      Khi Manager gọi POST approve và reject phiếu đó
      Thì cả hai trả mã 403 với thông báo "Phiếu … do Quản trị viên lập; Quản lý kho không được xử lý."
      Và phiếu ở trạng thái "pending"

    @RCPT-10 @TC-RCPT-10-08 @P1 @regression
    Kịch bản: Admin thấy đầy đủ mọi phiếu
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu xuất T_PROD chờ duyệt
      Và Staff đã lập 1 phiếu T_PROD
      Khi Admin đọc "/api/state"
      Thì không có phiếu nào masked = true
      Và cả hai phiếu đều có đủ dòng hàng

    @RCPT-10 @TC-RCPT-10-09 @P1 @regression
    Kịch bản: Mở phiếu từ lịch sử hoạt động
      Cho fixture [TEST] đã được tạo
      Và T_USER đăng nhập và lập 1 phiếu xuất T_PROD
      Khi Admin mở lịch sử của T_USER trên giao diện
      Và tôi bấm dòng "Lập phiếu" của phiếu đó trong lịch sử
      Thì bảng lịch sử đóng lại
      Và màn hình đang ở "Phiếu nhập/xuất"
      Và popup phiếu hiển thị đúng mã phiếu đó

    @RCPT-10 @TC-RCPT-10-10 @P2 @regression
    Kịch bản: Duyệt ngay trong popup
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập 1 phiếu T_PROD
      Khi Admin mở tab "Phiếu nhập/xuất"
      Và tôi bấm mã phiếu đó
      Và tôi bấm "Duyệt phiếu" trong popup
      Thì toast hiển thị "Đã duyệt"
      Và popup phiếu cập nhật chip "Đã duyệt", người duyệt "Nguyễn Văn An" và có biến động thẻ kho

    @RCPT-10 @TC-RCPT-10-11 @P3 @smoke
    Kịch bản: Đóng popup
      Cho Admin đã đăng nhập
      Khi tôi mở tab "Phiếu nhập/xuất"
      Và tôi bấm mã phiếu "PN-0001"
      Và tôi nhấn phím Escape
      Thì popup phiếu đóng lại
      Khi tôi bấm mã phiếu "PN-0001"
      Và tôi bấm vào vùng tối bên ngoài popup phiếu
      Thì popup phiếu đóng lại
      Và màn hình đang ở "Phiếu nhập/xuất"

    @RCPT-10 @TC-RCPT-10-12 @P2 @regression
    Kịch bản: Thẻ kho và Tổng quan che số liệu phiếu Admin
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu nhập T_PROD được duyệt ngay
      Khi Manager mở thẻ kho của T_PROD
      Thì dòng thẻ kho tham chiếu phiếu đó hiển thị "•••"
      Khi tôi mở màn "Tổng quan"
      Thì dòng "Hoạt động gần đây" tham chiếu phiếu đó hiển thị "•••"

    @RCPT-10 @TC-RCPT-10-14 @P2 @regression
    Kịch bản: Sổ phiếu hiển thị tối đa 10 phiếu mỗi trang (bổ sung 07/11/2026)
      Cho fixture [TEST] đã được tạo
      Và sổ phiếu có hơn 20 phiếu
      Khi Admin mở tab "Phiếu nhập/xuất"
      Thì trang 1 có đúng 10 dòng và tiêu đề ghi "Hiển thị 1–10 / <tổng> phiếu"
      Và thanh chuyển trang hiển thị số trang đúng
      Khi tôi bấm "Sau" ở thanh chuyển trang
      Thì trang 2 hiển thị các phiếu tiếp theo, không trùng trang 1
      Khi tôi bấm trang cuối ở thanh chuyển trang
      Thì trang cuối có số dòng còn lại và nút "Sau" bị vô hiệu hóa
      Khi tôi bấm thẻ "Chờ duyệt"
      Thì sổ phiếu quay về trang 1

    @RCPT-10 @TC-RCPT-10-15 @P2 @regression
    Kịch bản: Thời gian duyệt phiếu, chưa duyệt thì "Đợi duyệt" (bổ sung 07/11/2026)
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập 1 phiếu T_PROD
      Khi Admin mở tab "Phiếu nhập/xuất"
      Thì dòng phiếu đó có thời gian duyệt "Đợi duyệt"
      Khi tôi bấm mã phiếu đó
      Thì popup phiếu có "Thời gian duyệt" là "Đợi duyệt"
      Khi tôi bấm "Duyệt phiếu" trong popup
      Và tôi đóng popup phiếu
      Thì dòng phiếu đó có thời gian duyệt là thời điểm vừa duyệt
      Khi tôi bấm mã phiếu đó
      Thì popup phiếu có "Thời gian duyệt" đúng thời điểm vừa duyệt

    @RCPT-10 @TC-RCPT-10-13 @P2 @regression @risk
    Kịch bản: Rò rỉ qua API thẻ kho
      Cho fixture [TEST] đã được tạo
      Và Admin đã lập 1 phiếu nhập T_PROD được duyệt ngay
      Khi Manager đọc "history[]" của phiếu đó trong "/api/state"
      Thì delta và after của phiếu đó vẫn được trả về
      # Hạn chế đã biết (RCPT-10 mục 5): thẻ kho chỉ che trên giao diện; cân nhắc che ở máy chủ (bugs/known-limitations.md)
