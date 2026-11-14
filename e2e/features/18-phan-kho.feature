# language: vi
@phan-kho
Tính năng: Phân kho cho Quản lý kho và Nhân viên kho
  Mỗi kho chỉ có một Quản lý kho và có thể có nhiều Nhân viên kho (BR-36). Quản lý kho và Nhân viên kho chỉ lập phiếu,
  duyệt, kiểm kê và xem số liệu của kho mình làm việc (BR-37). Admin thao tác mọi kho.
  Bổ sung 13/11/2026. 2 tính năng · 19 test case · Tham chiếu BR-36, BR-37.
  Tài khoản dữ liệu mẫu (mật khẩu 123456): Quản lý kho U2 (HN), U6 (HCM), U7 (DN); Nhân viên kho U3 (HN), U8 (HCM).
  Quy ước: "Manager"/"Staff" = kho HN; "Manager HCM", "Staff HCM", "Manager DN" = kho TP.HCM / Đà Nẵng.

  Quy tắc: WSTAFF-01 – Mỗi kho một Quản lý kho, nhiều Nhân viên kho (API + UI · P1 · BR-36)
    Gán Quản lý kho vào kho đã có người quản lý bị từ chối (409) kèm thông tin người đang quản lý để hiện popup.

    @WSTAFF-01 @TC-WSTAFF-01-01 @P1 @after-reset @seed-data
    Kịch bản: Dữ liệu mẫu: mỗi kho đúng một Quản lý kho
      Cho dữ liệu mẫu vừa được reset
      Thì Quản lý kho của các kho là:
        | kho | quản lý |
        | HN  | U2      |
        | HCM | U6      |
        | DN  | U7      |

    @WSTAFF-01 @TC-WSTAFF-01-02 @P1 @smoke
    Kịch bản: Tạo Quản lý kho vào kho đã có Quản lý kho bị từ chối kèm thông tin người đang quản lý
      Cho Admin đã đăng nhập
      Khi Admin gửi POST "/api/users" với JSON:
        """
        {"name":"[TEST] QL trùng ${runId}","phone":"${phone}","password":"Test1234","role":"manager","opened":"${today}","status":"active","warehouseId":"HN"}
        """
      Thì mã phản hồi là 409
      Và thông báo lỗi chứa "đã có Quản lý kho"
      Và trường "conflict.warehouse.id" của phản hồi là "HN"
      Và trường "conflict.manager.id" của phản hồi là "U2"
      Và trường "conflict.manager.name" của phản hồi là "Trần Thị Bình"
      Và trường "conflict.manager.phone" của phản hồi là "0902222222"
      Và trường "conflict.manager.email" của phản hồi là "binh.tran@qlkho.local"
      Và trường "conflict.manager.status" của phản hồi là "active"

    @WSTAFF-01 @TC-WSTAFF-01-03 @P1 @smoke
    Kịch bản: Chuyển Quản lý kho sang kho đã có Quản lý kho bị từ chối, kho cũ giữ nguyên
      Cho Admin đã đăng nhập
      Khi Admin gửi PUT "/api/users/U6" với JSON:
        """
        {"name":"Đỗ Quang Hải","phone":"0906666666","email":"hai.do@qlkho.local","password":"","warehouseId":"HN"}
        """
      Thì mã phản hồi là 409
      Và trường "conflict.warehouse.id" của phản hồi là "HN"
      Và Quản lý kho của kho "HCM" là "U6"
      Và Quản lý kho của kho "HN" là "U2"

    @WSTAFF-01 @TC-WSTAFF-01-04 @P1 @smoke
    Kịch bản: Form sửa kho gán Quản lý kho khác vào kho đã có Quản lý kho bị từ chối
      Cho Admin đã đăng nhập
      Và thông tin kho "HN" đã được đọc
      Khi Admin gửi PUT "/api/warehouses/HN" với JSON:
        """
        {"name":"${wh.name}","address":"${wh.address}","managerId":"U6","phone":"${wh.phone}","capacity":${wh.capacity},"status":"active"}
        """
      Thì mã phản hồi là 409
      Và trường "conflict.manager.id" của phản hồi là "U2"
      Và Quản lý kho của kho "HN" là "U2"

    @WSTAFF-01 @TC-WSTAFF-01-05 @P2 @smoke
    Kịch bản: Chọn Nhân viên kho làm Quản lý kho bị từ chối
      Cho Admin đã đăng nhập
      Và thông tin kho "HN" đã được đọc
      Khi Admin gửi PUT "/api/warehouses/HN" với JSON:
        """
        {"name":"${wh.name}","address":"${wh.address}","managerId":"U3","phone":"${wh.phone}","capacity":${wh.capacity},"status":"active"}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "Quản lý kho"
      Và Quản lý kho của kho "HN" là "U2"

    @WSTAFF-01 @TC-WSTAFF-01-06 @P1 @smoke
    Khung kịch bản: Quản lý kho / Nhân viên kho bắt buộc có kho làm việc hợp lệ (<trường hợp>)
      Cho Admin đã đăng nhập
      Khi Admin gửi POST "/api/users" với JSON:
        """
        {"name":"[TEST] <trường hợp> ${runId}","phone":"${phone}","password":"Test1234","role":"<vai trò>","opened":"${today}","status":"active"<kho>}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<thông báo>"

      Dữ liệu:
        | trường hợp               | vai trò | kho                         | thông báo                       |
        | Nhân viên thiếu kho      | staff   |                             | chọn kho làm việc               |
        | Quản lý thiếu kho        | manager |                             | chọn kho làm việc               |
        | Nhân viên kho không có   | staff   | ,"warehouseId":"ZZ"         | không còn tồn tại               |

    @WSTAFF-01 @TC-WSTAFF-01-07 @P1 @regression
    Kịch bản: Một kho có nhiều Nhân viên kho
      Cho Admin đã đăng nhập
      Và số nhân viên kho của kho "HN" được ghi nhận
      Khi Admin gửi POST "/api/users" với JSON:
        """
        {"name":"[TEST] NV một ${runId}","phone":"${phone}","password":"Test1234","role":"staff","opened":"${today}","status":"active","warehouseId":"HN"}
        """
      Thì mã phản hồi là 200
      Khi Admin gửi POST "/api/users" với JSON:
        """
        {"name":"[TEST] NV hai ${runId}","phone":"${phone2}","password":"Test1234","role":"staff","opened":"${today}","status":"active","warehouseId":"HN"}
        """
      Thì mã phản hồi là 200
      Và số nhân viên kho của kho "HN" tăng thêm 2

    @WSTAFF-01 @TC-WSTAFF-01-08 @P1 @regression @exclusive
    Kịch bản: Bỏ phân kho Quản lý cũ rồi gán Quản lý mới; Quản lý cũ không gán lại được
      Chạm vào Quản lý kho thật của kho HN nên chạy riêng; kịch bản tự trả U2 về kho HN khi kết thúc.
      Cho Admin đã đăng nhập
      Và Quản lý kho "U2" sẽ được trả về kho "HN" sau kịch bản
      Khi Admin bỏ phân kho của tài khoản "U2"
      Thì mã phản hồi là 200
      Khi Admin gửi POST "/api/users" với JSON:
        """
        {"name":"[TEST] QL mới ${runId}","phone":"${phone}","password":"Test1234","role":"manager","opened":"${today}","status":"active","warehouseId":"HN"}
        """
      Thì mã phản hồi là 200
      Và Quản lý kho của kho "HN" là tài khoản [TEST]
      Khi Admin gán tài khoản "U2" vào kho "HN"
      Thì mã phản hồi là 409
      Và trường "conflict.manager.name" của phản hồi chứa "[TEST] QL mới"

    @WSTAFF-01 @TC-WSTAFF-01-09 @P1 @smoke
    Kịch bản: Popup "Kho Hà Nội đã có Quản lý kho" khi tạo tài khoản Quản lý kho
      Admin chọn kho đã có Quản lý ngay trên form và thấy gợi ý; bấm tạo thì hiện popup thông tin người đang quản lý.
      Cho Admin đã đăng nhập
      Khi Admin mở form tạo tài khoản
      Và tôi điền họ tên "[TEST] QL popup <runId>", SĐT ngẫu nhiên và mật khẩu "Test1234"
      Và tôi chọn vai trò "Quản lý kho" và kho làm việc "Kho Hà Nội"
      Thì gợi ý kho làm việc chứa "Kho này đã có Quản lý kho: Trần Thị Bình"
      Khi tôi bấm nút "Tạo tài khoản" trên form
      Thì popup "Kho Hà Nội đã có Quản lý kho" hiện ra
      Và popup nêu Quản lý kho "Trần Thị Bình", SĐT "0902222222", email "binh.tran@qlkho.local" và kho đang quản lý "Kho Hà Nội"
      Khi tôi nhấn phím Esc
      Thì popup đóng và ô họ tên vẫn có "[TEST] QL popup <runId>"

    @WSTAFF-01 @TC-WSTAFF-01-10 @P1 @smoke
    Kịch bản: Popup khi chọn Quản lý kho khác trong form sửa kho đã có Quản lý
      Cho Admin đã đăng nhập
      Khi Admin mở form sửa kho "Kho TP.HCM"
      Và tôi mở bộ chọn Quản lý kho và chọn "Trần Thị Bình"
      Thì popup "Kho TP.HCM đã có Quản lý kho" hiện ra
      Và popup nêu Quản lý kho "Đỗ Quang Hải", SĐT "0906666666", email "hai.do@qlkho.local" và kho đang quản lý "Kho TP.HCM"

    @WSTAFF-01 @TC-WSTAFF-01-11 @P2 @smoke
    Kịch bản: Danh sách kho hiển thị Quản lý kho và số Nhân viên kho
      Cho Admin đã đăng nhập
      Khi tôi mở màn "Kho"
      Thì dòng kho "Kho TP.HCM" hiển thị Quản lý kho "Đỗ Quang Hải" và số nhân viên kho
      Và dòng kho "Kho Hà Nội" hiển thị Quản lý kho "Trần Thị Bình" và số nhân viên kho

  Quy tắc: SCOPE-01 – Phạm vi kho của Quản lý kho và Nhân viên kho (API + UI · P1 · BR-37)
    Máy chủ chỉ gửi số liệu của kho mình làm việc và từ chối thao tác ở kho khác (403).

    @SCOPE-01 @TC-SCOPE-01-01 @P1 @smoke
    Khung kịch bản: Chỉ nhận số liệu của kho mình làm việc (<vai trò> – <kho>)
      Khi <vai trò> lấy dữ liệu "/api/state"
      Thì dữ liệu trong state chỉ thuộc kho "<kho>"

      Dữ liệu:
        | vai trò     | kho |
        | Staff       | HN  |
        | Manager     | HN  |
        | Manager HCM | HCM |
        | Staff HCM   | HCM |
        | Manager DN  | DN  |

    @SCOPE-01 @TC-SCOPE-01-02 @P1 @smoke
    Kịch bản: Admin nhận số liệu của mọi kho; mã phiếu kế tiếp tính trên toàn hệ thống
      Khi Admin lấy dữ liệu "/api/state"
      Và Staff lấy dữ liệu "/api/state"
      Và Manager HCM lấy dữ liệu "/api/state"
      Thì mã phiếu kế tiếp của "Staff" bằng của "Admin"
      Và mã phiếu kế tiếp của "Manager HCM" bằng của "Admin"
      Khi Admin lấy dữ liệu "/api/state"
      Thì state có 3 kho

    @SCOPE-01 @TC-SCOPE-01-03 @P1 @smoke
    Khung kịch bản: Lập phiếu tại kho khác bị từ chối (<vai trò> lập phiếu <loại> tại <kho>)
      Cho hàng hóa [TEST] đã được tạo
      Khi <vai trò> gửi POST "/api/receipts" với JSON:
        """
        {"type":"<loại>","partnerId":"<đối tác>","warehouseId":"<kho>","note":"[TEST] ngoài kho","lines":[{"productId":"${prod.id}","qty":1}]}
        """
      Thì mã phản hồi là 403
      Và thông báo lỗi chứa "kho mình làm việc"

      Dữ liệu:
        | vai trò     | loại | đối tác | kho |
        | Staff       | in   | NCC-01  | HCM |
        | Manager     | out  | KH-01   | HCM |
        | Staff HCM   | in   | NCC-01  | HN  |
        | Manager HCM | out  | KH-01   | DN  |

    @SCOPE-01 @TC-SCOPE-01-04 @P1 @regression
    Kịch bản: Duyệt và từ chối phiếu của kho khác bị từ chối; Quản lý đúng kho duyệt được
      Cho phiếu nhập chờ duyệt [TEST] của kho "HCM" do Staff HCM lập
      Khi Manager gửi POST "/api/receipts/${receipt}/approve"
      Thì mã phản hồi là 403
      Và thông báo lỗi chứa "kho mình làm việc"
      Khi Manager gửi POST "/api/receipts/${receipt}/reject"
      Thì mã phản hồi là 403
      Khi Manager HCM gửi POST "/api/receipts/${receipt}/approve"
      Thì mã phản hồi là 200
      Và tồn của hàng hóa [TEST] tại kho "HCM" là 3
      Và tồn của hàng hóa [TEST] tại kho "HN" là 0

    @SCOPE-01 @TC-SCOPE-01-05 @P1 @smoke
    Kịch bản: Kiểm kê kho khác bị từ chối
      Cho hàng hóa [TEST] đã được tạo
      Khi Manager gửi POST "/api/stocktakes" với JSON:
        """
        {"warehouseId":"HCM","rows":[{"productId":"${prod.id}","actual":0,"system":0}]}
        """
      Thì mã phản hồi là 403
      Và thông báo lỗi chứa "kho mình làm việc"

    @SCOPE-01 @TC-SCOPE-01-06 @P1 @regression
    Kịch bản: Tài khoản chưa được phân kho không thấy số liệu và không thao tác được
      Cho tài khoản [TEST] Nhân viên kho tại kho "HN" đã được tạo
      Và tài khoản [TEST] đã bị bỏ phân kho
      Và hàng hóa [TEST] đã được tạo
      Khi Tài khoản [TEST] lấy dữ liệu "/api/state"
      Thì dữ liệu trong state không có kho, tồn, phiếu, thẻ kho, kiểm kê hay kế hoạch nào
      Khi Tài khoản [TEST] gửi POST "/api/receipts" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":1}]}
        """
      Thì mã phản hồi là 403
      Và thông báo lỗi chứa "chưa được phân kho"

    @SCOPE-01 @TC-SCOPE-01-07 @P1 @smoke
    Kịch bản: Nhân viên kho chỉ thấy kho của mình khi lập phiếu và xem báo cáo
      Cho Staff đã đăng nhập
      Khi tôi mở màn "Nhập kho"
      Thì thanh trên hiển thị "Nhân viên kho, Kho Hà Nội"
      Và màn hình không nhắc tới kho "Kho TP.HCM" và "Kho Đà Nẵng"
      Khi tôi chuyển sang màn "Báo cáo"
      Thì bộ lọc kho chỉ có "Kho Hà Nội"
      Khi tôi chuyển sang màn "Tồn kho"
      Thì màn hình không nhắc tới kho "Kho TP.HCM" và "Kho Đà Nẵng"

    @SCOPE-01 @TC-SCOPE-01-08 @P2 @regression
    Kịch bản: Tài khoản chưa được phân kho thấy thông báo trên giao diện
      Cho tài khoản [TEST] Nhân viên kho tại kho "HN" đã được tạo
      Và tài khoản [TEST] đã bị bỏ phân kho
      Và Tài khoản [TEST] đã đăng nhập
      Khi tôi mở màn "Tổng quan"
      Thì có thông báo chứa "chưa được phân kho"
