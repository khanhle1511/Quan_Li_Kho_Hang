# language: vi
@bao-cao-admin
Tính năng: Quản trị viên xuất báo cáo và xem lịch sử báo cáo
  Admin xuất báo cáo nhập – xuất – tồn ra file Excel (.xlsx) theo kho hoặc tất cả kho; mỗi lần xuất được lưu vào lịch sử
  (mã BC-0001…) để tải lại đúng số liệu tại thời điểm xuất. Quản lý kho và Nhân viên kho không có chức năng này.
  Bổ sung 13/11/2026. 2 tính năng · 10 test case. Kịch bản so tồn cuối với tồn hiện tại là @exclusive (số liệu toàn cục).
  Các nút "Xuất Excel/PDF" mô phỏng trước đây đã được thay bằng nút "Xuất báo cáo Excel" (chỉ Admin).

  Quy tắc: REP-04 – Xuất báo cáo Excel (API · P1)

    @REP-04 @TC-REP-04-01 @P1 @regression
    Kịch bản: Admin xuất báo cáo tất cả kho và tải file Excel
      Cho Admin đã đăng nhập
      Khi Admin xuất báo cáo kho "all"
      Thì mã phản hồi là 200
      Và tên file trả về khi xuất khớp "^BaoCao_NXT_TatCaKho_T\d{2}-\d{4}_BC-\d{4}\.xlsx$"
      Khi Admin tải file của báo cáo vừa xuất
      Thì phản hồi là file Excel hợp lệ
      Và tên file tải về khớp "BaoCao_NXT_TatCaKho_T\d{2}-\d{4}_BC-\d{4}\.xlsx"

    @REP-04 @TC-REP-04-02 @P1 @regression @exclusive
    Khung kịch bản: Xuất báo cáo theo từng kho (<kho>)
      Cho Admin đã đăng nhập
      Khi Admin xuất báo cáo kho "<kho>"
      Thì mã phản hồi là 200
      Và tên file trả về khi xuất khớp "^BaoCao_NXT_KHO-<kho>_T\d{2}-\d{4}_BC-\d{4}\.xlsx$"
      Và bản ghi báo cáo vừa xuất có:
        | trường   | giá trị     |
        | wh       | <kho>       |
        | whLabel  | <tên kho>   |
        | by       | Nguyễn Văn An |
      Và tồn cuối của báo cáo vừa xuất bằng tổng tồn hiện tại của kho "<kho>"

      Dữ liệu:
        | kho | tên kho     |
        | HN  | Kho Hà Nội  |
        | HCM | Kho TP.HCM  |
        | DN  | Kho Đà Nẵng |

    @REP-04 @TC-REP-04-03 @P1 @regression @exclusive
    Kịch bản: Báo cáo tất cả kho: tồn cuối bằng tổng tồn mọi kho, bản ghi có trong lịch sử
      Cho Admin đã đăng nhập
      Khi Admin xuất báo cáo kho "all"
      Thì bản ghi báo cáo vừa xuất có trong lịch sử báo cáo trong state của Admin
      Và bản ghi báo cáo vừa xuất có:
        | trường   | giá trị     |
        | whLabel  | Tất cả kho  |
        | period   | Tháng ${month}/${year} |
      Và tồn cuối của báo cáo vừa xuất bằng tổng tồn hiện tại của mọi kho

    @REP-04 @TC-REP-04-04 @P1 @smoke
    Khung kịch bản: Chỉ Admin xuất và tải báo cáo (<vai trò>)
      Khi <vai trò> gửi POST "/api/reports" với JSON:
        """
        {"warehouseId":"all"}
        """
      Thì mã phản hồi là 403
      Khi <vai trò> gửi GET "/api/reports/BC-0001/file"
      Thì mã phản hồi là 403

      Dữ liệu:
        | vai trò     |
        | Manager     |
        | Staff       |
        | Manager HCM |

    @REP-04 @TC-REP-04-05 @P1 @smoke
    Kịch bản: Chưa đăng nhập không xuất và không tải được báo cáo
      Cho tôi chưa đăng nhập
      Khi tôi gửi POST "/api/reports" với JSON:
        """
        {"warehouseId":"all"}
        """
      Thì mã phản hồi là 401
      Khi tôi gửi GET "/api/reports/BC-0001/file"
      Thì mã phản hồi là 401

    @REP-04 @TC-REP-04-06 @P2 @smoke
    Kịch bản: Xuất báo cáo cho kho không tồn tại và tải file không tồn tại
      Cho Admin đã đăng nhập
      Khi Admin gửi POST "/api/reports" với JSON:
        """
        {"warehouseId":"ZZ"}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "Không tìm thấy kho"
      Khi Admin gửi GET "/api/reports/BC-9999/file"
      Thì mã phản hồi là 404

  Quy tắc: REP-05 – Lịch sử báo cáo (API + UI · P1)

    @REP-05 @TC-REP-05-01 @P1 @smoke
    Khung kịch bản: Quản lý kho và Nhân viên kho không nhận lịch sử báo cáo (<vai trò>)
      Thì lịch sử báo cáo trong state của <vai trò> trống

      Dữ liệu:
        | vai trò     |
        | Manager     |
        | Staff       |
        | Manager HCM |

    @REP-05 @TC-REP-05-02 @P1 @regression @exclusive
    Kịch bản: Báo cáo đã xuất giữ số liệu tại thời điểm xuất; báo cáo mới phản ánh biến động sau đó
      Cho Admin đã đăng nhập
      Và hàng hóa [TEST] đang có tồn 10 tại kho "HN"
      Khi Admin xuất báo cáo kho "HN"
      Thì mã phản hồi là 200
      Cho tồn cuối của báo cáo vừa xuất được ghi nhận
      Khi hàng hóa [TEST] được nhập thêm 5 tại kho "HN"
      Thì tồn cuối của báo cáo đã xuất không đổi
      Khi Admin xuất báo cáo kho "HN"
      Thì tồn cuối của báo cáo mới lớn hơn báo cáo cũ 5 đơn vị

    @REP-05 @TC-REP-05-03 @P1 @regression
    Kịch bản: Giao diện: Admin xuất báo cáo, thấy bản ghi trong lịch sử và tải lại được
      Cho Admin đã đăng nhập
      Khi tôi mở màn "Báo cáo"
      Thì trang Báo cáo có nút "Xuất báo cáo Excel" và bảng "Lịch sử báo cáo"
      Khi tôi chọn kho "Kho TP.HCM" ở bộ lọc của trang Báo cáo
      Và tôi ấn nút "Xuất báo cáo Excel"
      Thì trình duyệt tải về file "^BaoCao_NXT_KHO-HCM_T\d{2}-\d{4}_BC-\d{4}\.xlsx$"
      Và toast hiển thị "Đã xuất báo cáo"
      Và dòng đầu của lịch sử báo cáo ghi kho "Kho TP.HCM" và người xuất "Nguyễn Văn An"
      Khi tôi bấm "Tải lại" ở dòng đầu của lịch sử báo cáo
      Thì trình duyệt tải về file "\.xlsx$"

    @REP-05 @TC-REP-05-04 @P1 @smoke
    Khung kịch bản: Giao diện: <vai trò> không thấy nút xuất, lịch sử báo cáo hay nút xuất mô phỏng
      Cho <vai trò> đã đăng nhập
      Khi tôi mở màn "Báo cáo"
      Thì trang Báo cáo không có nút "Xuất báo cáo Excel", không có "Lịch sử báo cáo" và không còn nút xuất mô phỏng

      Dữ liệu:
        | vai trò |
        | Manager |
        | Staff   |
