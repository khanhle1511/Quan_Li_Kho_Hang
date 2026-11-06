# language: vi
@nha-cung-cap
Tính năng: Nhà cung cấp
  Danh sách, popup, chi tiết, thêm/sửa, ghi chú, hồ sơ PDF, ẩn liên hệ theo vai trò.
  7 tính năng · 24 test case · Tham chiếu BR-15, BR-16, bảng phân quyền 4.2, RISK-15.

  Quy tắc: SUP-01 – Danh sách, thống kê, lối tắt lọc (UI · P3)
    Thẻ số liệu + nút lọc: còn trong kho / chờ duyệt / có PDF.

    @SUP-01 @TC-SUP-01-01 @P3 @after-reset
    Kịch bản: Lối tắt Có phiếu chờ duyệt
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Nhà cung cấp"
      Khi tôi bấm thẻ "Có phiếu chờ duyệt"
      Thì danh sách có 1 dòng NCC-02

  Quy tắc: SUP-02 – Popup khi rê chuột (UI · P2 · 4.2)
    Thống kê nhanh; liên hệ chỉ hiện cho Admin.

    @SUP-02 @TC-SUP-02-01 @P2 @smoke
    Kịch bản: Popup NCC hiển thị liên hệ với Admin
      Cho Admin đã đăng nhập
      Và tôi đang ở màn "Nhà cung cấp"
      Khi tôi rê chuột lên "[data-hp=NCC-01]"
      Thì "#hpop" có "0901 234 567" và email
      Và "#hpop" có số hồ sơ PDF

    @SUP-02 @P1 @smoke
    Khung kịch bản: Popup NCC ẩn liên hệ với <vai trò>
      Cho <vai trò> đã đăng nhập
      Và tôi đang ở màn "Nhà cung cấp"
      Khi tôi rê chuột lên "[data-hp=NCC-01]"
      Thì "#hpop" không có SĐT và email
      Và "#hpop" có dòng "được ẩn theo phân quyền"

      @TC-SUP-02-02
      Dữ liệu:
        | vai trò |
        | Manager |

      @TC-SUP-02-03
      Dữ liệu:
        | vai trò |
        | Staff   |

  Quy tắc: SUP-03 – Chi tiết & tab hàng hóa (UI · P2)
    Còn trong kho / Đã nhập / Chờ duyệt / Lịch sử phiếu.

    @SUP-03 @TC-SUP-03-01 @P2 @after-reset
    Kịch bản: Tab Còn trong kho của NCC-01
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở chi tiết NCC-01
      Thì tab "Còn trong kho" có 2 dòng:
        | hàng | kho | đã nhập | tồn |
        | P01  | HN  | 100     | 120 |
        | P02  | HN  | 50      | 80  |

    @SUP-03 @TC-SUP-03-02 @P3 @after-reset
    Kịch bản: Tab Đang chờ duyệt → Mở phiếu
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở chi tiết NCC-02 và chọn tab "Đang chờ duyệt"
      Thì tab có 2 dòng của PN-0002
      Khi tôi bấm "Mở phiếu"
      Thì tôi sang màn "Nhập kho" với bộ lọc "Chờ duyệt"

  Quy tắc: SUP-04 – Thêm / sửa nhà cung cấp (API · P1 · BR-15)
    Cần SĐT hoặc email; Manager sửa không đổi được liên hệ; Staff không được (403).

    @SUP-04 @TC-SUP-04-01 @P2 @regression
    Kịch bản: Thêm NCC hợp lệ
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/partners" với type "sup", name "[TEST] NCC <runId>", phone "0281234567"
      Thì mã phản hồi là 200
      Và id có dạng "NCC-xx" mới

    @SUP-04 @TC-SUP-04-02 @P2 @smoke
    Kịch bản: Thêm NCC thiếu liên hệ
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/partners" không có phone và email
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Cần ít nhất một thông tin liên hệ: số điện thoại hoặc email."

    @SUP-04 @TC-SUP-04-03 @P2 @smoke
    Khung kịch bản: <trường> sai định dạng
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/partners" với <trường> = "<giá trị>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      Dữ liệu:
        | trường | giá trị | thông báo                                                          |
        | email  | abc@    | Email không hợp lệ.                                                |
        | phone  | 12345   | Số điện thoại không hợp lệ (10–11 chữ số, bắt đầu bằng 0).         |

    @SUP-04 @TC-SUP-04-04 @P1 @regression
    Kịch bản: Manager sửa NCC không đổi được liên hệ
      Cho fixture [TEST] đã được tạo
      Và T_SUP có phone p0
      Khi Manager gọi PUT "/api/partners/T_SUP" với name mới, phone "0999999999", email "x@y.vn"
      Thì mã phản hồi là 200
      Và Admin đọc "/api/state" vẫn thấy phone p0 và email cũ của T_SUP

    @SUP-04 @TC-SUP-04-05 @P2 @regression
    Kịch bản: Admin sửa liên hệ NCC
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi PUT "/api/partners/T_SUP" với phone "0287654321"
      Thì mã phản hồi là 200
      Và "/api/state" hiển thị số mới của T_SUP

    @SUP-04 @TC-SUP-04-06 @P1 @smoke
    Kịch bản: Staff không thêm / sửa NCC
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/partners"
      Thì mã phản hồi là 403
      Khi tôi gọi PUT "/api/partners/NCC-01"
      Thì mã phản hồi là 403
      Và giao diện không có nút thêm NCC hay "Sửa thông tin"

  Quy tắc: SUP-05 – Ghi chú (API · P2)
    Lưu ghi chú, noteAt, noteBy. Staff không được (403).

    @SUP-05 @TC-SUP-05-01 @P2 @regression
    Kịch bản: Lưu ghi chú NCC
      Cho fixture [TEST] đã được tạo
      Khi Manager gọi PUT "/api/partners/T_SUP/note" với "[TEST] ghi chú"
      Thì mã phản hồi là 200
      Và noteBy là "Trần Thị Bình"
      Và noteAt có giá trị

    @SUP-05 @TC-SUP-05-02 @P2 @smoke
    Kịch bản: Staff không sửa ghi chú
      Cho Staff đã đăng nhập
      Khi tôi gọi PUT "/api/partners/NCC-01/note"
      Thì mã phản hồi là 403
      Và giao diện hiển thị ghi chú dạng chỉ đọc

  Quy tắc: SUP-06 – Hồ sơ PDF (API · P1 · BR-16)
    Tải lên / xem / tải về / xóa; ≤ 10 MB, đúng PDF. Chỉ Admin (Manager và Staff 403).

    @SUP-06 @TC-SUP-06-01 @P1 @regression
    Kịch bản: Tải lên PDF hợp lệ cho NCC
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi POST "/api/partners/T_SUP/files" với một PDF 50 KB
      Thì mã phản hồi là 200
      Và file xuất hiện trong "state.files"
      Và GET "/api/files/{id}" trả "application/pdf"

    @SUP-06 @TC-SUP-06-02 @P2 @smoke
    Khung kịch bản: Tải lên file không phải PDF (<file>)
      Cho Admin đã đăng nhập
      Khi tôi tải file "<file>" lên NCC-01 (request bị từ chối nên không ghi dữ liệu)
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<thông báo>"

      Dữ liệu:
        | file                       | thông báo                 |
        | test.txt                   | không phải file PDF.      |
        | test.txt đổi tên fake.pdf  | không phải file PDF hợp lệ. |

    @SUP-06 @TC-SUP-06-03 @P2 @smoke
    Kịch bản: Tải lên PDF lớn hơn 10 MB
      Cho Admin đã đăng nhập
      Khi tôi tải một PDF 11 MB lên NCC-01 (request bị từ chối nên không ghi dữ liệu)
      Thì mã phản hồi là 400
      Và thông báo lỗi là "File vượt quá 10 MB."

    @SUP-06 @TC-SUP-06-04 @P1 @smoke
    Kịch bản: Manager không xem / tải lên PDF NCC
      Cho Manager đã đăng nhập
      Khi tôi gọi GET "/api/files/{id của NCC-01}"
      Thì mã phản hồi là 403
      Khi tôi gọi POST "/api/partners/NCC-01/files"
      Thì mã phản hồi là 403

    @SUP-06 @TC-SUP-06-05 @P1 @smoke
    Kịch bản: Staff không xem PDF NCC
      Cho Staff đã đăng nhập
      Khi tôi gọi GET "/api/files/{id của NCC-01}"
      Thì mã phản hồi là 403

    @SUP-06 @TC-SUP-06-06 @P2 @regression @risk
    Khung kịch bản: Tên file <loại tên> được xử lý an toàn
      Cho fixture [TEST] đã được tạo
      Khi Admin tải lên T_SUP file PDF tên "<tên file>"
      Thì file bị từ chối hoặc được lưu an toàn
      Và không có phản hồi 500

      Dữ liệu:
        | loại tên        | tên file              |
        | chứa đường dẫn  | ../../aaaa.pdf        |
        | dài 255 ký tự   | aaaa…(255 ký tự).pdf  |
        | dài 256 ký tự   | aaaa…(256 ký tự).pdf  |
        | dài 300 ký tự   | aaaa…(300 ký tự).pdf  |

  Quy tắc: SUP-07 – Ẩn SĐT, email, PDF theo vai trò (API · P1 · 4.2)
    Lược bỏ ở /api/state, popup, chi tiết, màn Nhập kho.

    @SUP-07 @TC-SUP-07-01 @P1 @smoke
    Kịch bản: Admin thấy đủ liên hệ NCC
      Cho Admin đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì "suppliers[].phone" và "suppliers[].email" có giá trị
      Và "files" có file của NCC-01

    @SUP-07 @P1 @smoke
    Khung kịch bản: <vai trò> bị lược liên hệ NCC
      Cho <vai trò> đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì mọi "suppliers[].phone" là "" và "suppliers[].email" là ""
      Và "files" không có partnerId bắt đầu bằng "NCC-"

      @TC-SUP-07-02
      Dữ liệu:
        | vai trò |
        | Manager |

      @TC-SUP-07-03
      Dữ liệu:
        | vai trò |
        | Staff   |

    @SUP-07 @TC-SUP-07-04 @P2 @smoke
    Kịch bản: Màn Nhập kho không lộ SĐT NCC
      Cho Manager đã đăng nhập
      Khi tôi mở màn "Nhập kho" và đọc thẻ chọn NCC
      Thì thẻ chỉ hiện mã NCC
      Và không có SĐT
