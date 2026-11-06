# language: vi
@khach-hang
Tính năng: Khách hàng
  Danh sách, popup, chi tiết, thêm/sửa, ghi chú, hồ sơ PDF, ẩn liên hệ theo vai trò.
  7 tính năng · 13 test case · Tham chiếu BR-15, BR-16, bảng phân quyền 4.2.
  Khác NCC: Manager thấy liên hệ và được quản lý PDF khách hàng; chỉ Staff bị lược.

  Quy tắc: CUS-01 – Danh sách, thống kê, lối tắt lọc (UI · P3)
    Thẻ số liệu + nút lọc: đã nhận hàng / chờ duyệt / có PDF.

    @CUS-01 @TC-CUS-01-01 @P3 @after-reset
    Kịch bản: Lối tắt Đã nhận hàng
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Khách hàng"
      Khi tôi bấm thẻ "Đã nhận hàng"
      Thì danh sách có 1 dòng KH-01

  Quy tắc: CUS-02 – Popup khi rê chuột (UI · P2 · 4.2)
    Thống kê nhanh; liên hệ ẩn với Staff.

    @CUS-02 @TC-CUS-02-01 @P2 @smoke
    Kịch bản: Popup khách hàng hiển thị liên hệ với Manager
      Cho Manager đã đăng nhập
      Và tôi đang ở màn "Khách hàng"
      Khi tôi rê chuột lên "[data-hp=KH-01]"
      Thì "#hpop" có "0243 111 222"

    @CUS-02 @TC-CUS-02-02 @P1 @smoke
    Kịch bản: Popup khách hàng ẩn liên hệ với Staff
      Cho Staff đã đăng nhập
      Và tôi đang ở màn "Khách hàng"
      Khi tôi rê chuột lên "[data-hp=KH-01]"
      Thì "#hpop" không có SĐT và email

  Quy tắc: CUS-03 – Chi tiết & tab hàng hóa (UI · P2)
    Đã xuất / Chờ duyệt / Lịch sử phiếu.

    @CUS-03 @TC-CUS-03-01 @P2 @after-reset
    Kịch bản: Tab Đã xuất thành công của KH-01
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở chi tiết KH-01
      Thì tab "Đã xuất thành công" có 2 dòng:
        | hàng | kho | số lượng | chứng từ |
        | P01  | HN  | 30       | PX-0001  |
        | P03  | HN  | 40       | PX-0001  |

  Quy tắc: CUS-04 – Thêm / sửa khách hàng (API · P1 · BR-15)
    Cần SĐT hoặc email. Staff không được (403).

    @CUS-04 @TC-CUS-04-01 @P2 @regression
    Kịch bản: Thêm khách hàng hợp lệ
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/partners" với type "cus", name "[TEST] KH <runId>", email "a@b.vn"
      Thì mã phản hồi là 200
      Và id có dạng "KH-xx" mới

    @CUS-04 @TC-CUS-04-02 @P1 @smoke
    Kịch bản: Staff không thêm khách hàng
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/partners" với type "cus"
      Thì mã phản hồi là 403

  Quy tắc: CUS-05 – Ghi chú (API · P2)
    Lưu ghi chú. Staff không được (403).

    @CUS-05 @TC-CUS-05-01 @P3 @regression
    Kịch bản: Lưu ghi chú khách hàng
      Cho fixture [TEST] đã được tạo
      Khi Manager gọi PUT "/api/partners/T_CUS/note"
      Thì mã phản hồi là 200
      Và noteBy là "Trần Thị Bình"

  Quy tắc: CUS-06 – Hồ sơ PDF (API · P1 · BR-16)
    Tải lên / xem / tải về / xóa. Admin và Manager được; Staff 403.

    @CUS-06 @TC-CUS-06-01 @P1 @regression
    Kịch bản: Manager tải lên và xem PDF khách hàng
      Cho fixture [TEST] đã được tạo
      Khi Manager gọi POST "/api/partners/T_CUS/files" với một PDF hợp lệ
      Thì mã phản hồi là 200
      Khi Manager gọi GET "/api/files/{id}"
      Thì mã phản hồi là 200

    @CUS-06 @TC-CUS-06-02 @P1 @smoke
    Kịch bản: Staff không xem PDF khách hàng
      Cho Staff đã đăng nhập
      Khi tôi gọi GET "/api/files/{id của KH-01}"
      Thì mã phản hồi là 403

    @CUS-06 @TC-CUS-06-03 @P2 @regression
    Kịch bản: Manager xóa PDF khách hàng
      Cho fixture [TEST] đã được tạo
      Và T_CUS có 1 file test
      Khi Manager gọi DELETE "/api/files/{id}"
      Thì mã phản hồi là 200
      Và file không còn trong "state.files"
      Và GET "/api/files/{id}" trả mã 404

  Quy tắc: CUS-07 – Ẩn SĐT, email, PDF theo vai trò (API · P1 · 4.2)
    Lược bỏ ở /api/state, popup, chi tiết, màn Xuất kho (chỉ với Staff).

    @CUS-07 @TC-CUS-07-01 @P1 @smoke
    Kịch bản: Manager thấy liên hệ khách hàng
      Cho Manager đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì "customers[].phone" và "customers[].email" có giá trị

    @CUS-07 @TC-CUS-07-02 @P1 @smoke
    Kịch bản: Staff bị lược liên hệ khách hàng
      Cho Staff đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì mọi "customers[].phone" là "" và "customers[].email" là ""
      Và "files" không có partnerId bắt đầu bằng "KH-"

    @CUS-07 @TC-CUS-07-03 @P2 @smoke
    Kịch bản: Màn Xuất kho không lộ SĐT khách hàng
      Cho Staff đã đăng nhập
      Khi tôi mở màn "Xuất kho" và đọc thẻ chọn khách hàng
      Thì thẻ chỉ hiện mã KH
      Và không có SĐT
