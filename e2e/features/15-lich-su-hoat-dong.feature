# language: vi
@lich-su-hoat-dong
Tính năng: Lịch sử hoạt động của nhân viên
  Admin bấm tên một tài khoản ở màn Người dùng để xem mọi thao tác của người đó: thống kê, lọc theo nhóm,
  tìm kiếm, dòng thời gian nhóm theo ngày. Lịch sử cũ được suy ra từ chứng từ đang có (inferred = true).
  1 tính năng · 10 test case · Tham chiếu USR-07 (spec/USR-07_CHANGELOG.md, spec/USR-07_testcases.pdf) · GET /api/users/{id}/activity.
  Chỉ Admin xem được; Manager và Staff bị chặn ở API (403).

  Quy tắc: USR-07 – Lịch sử hoạt động của nhân viên (API + UI · P1)
    Bấm tên → bảng trượt .drawer. Thao tác mới ghi ngay; thao tác quản trị ghi cho cả Admin và tài khoản bị tác động.

    @USR-07 @TC-USR-07-01 @P2 @smoke
    Kịch bản: Mở lịch sử từ tên nhân viên
      Cho Admin đã đăng nhập
      Khi tôi mở màn "Người dùng" và bấm tên "Lê Minh Cường"
      Thì bảng lịch sử hiển thị tên "Lê Minh Cường", vai trò "Nhân viên kho", tình trạng "Hoạt động" và SĐT "0903 333 333"
      Và bảng lịch sử có thống kê "Tổng hoạt động", "Đăng nhập gần nhất", "Phiếu đã lập"
      Và các hoạt động được nhóm theo ngày, mới nhất ở trên

    @USR-07 @TC-USR-07-02 @P1 @smoke
    Kịch bản: Manager không xem được lịch sử
      Cho Manager đã đăng nhập
      Thì GET "/api/users/U3/activity" trả mã 403

    @USR-07 @TC-USR-07-03 @P1 @smoke
    Kịch bản: Staff không xem được lịch sử
      Cho Staff đã đăng nhập
      Thì GET "/api/users/U3/activity" trả mã 403

    @USR-07 @TC-USR-07-04 @P2 @after-reset
    Kịch bản: Lịch sử cũ được suy ra từ chứng từ
      Cho dữ liệu mẫu vừa được reset
      Và Admin đã đăng nhập
      Khi tôi đọc lịch sử hoạt động của "U2" và "U3"
      Thì lịch sử của "U2" có đúng 2 "Duyệt phiếu", 1 "Xác nhận kiểm kê", 4 "Tải lên hồ sơ" và 3 "Cập nhật ghi chú" suy ra từ chứng từ
      Và lịch sử của "U3" có đúng 4 "Lập phiếu" suy ra từ chứng từ
      Và không có dòng suy ra nào khác

    @USR-07 @TC-USR-07-05 @P1 @regression
    Kịch bản: Thao tác mới được ghi ngay
      Cho fixture [TEST] đã được tạo
      Khi T_USER đăng nhập và lập 1 phiếu xuất T_PROD
      Và Admin mở lịch sử của T_USER trên giao diện
      Thì bảng lịch sử có dòng "Đăng nhập" và dòng "Lập phiếu" kèm mã phiếu vừa lập, không có nhãn "Suy ra từ chứng từ"
      Và hai dòng đó ghi đúng thời điểm hôm nay

    @USR-07 @TC-USR-07-06 @P2 @regression
    Kịch bản: Đăng nhập sai được ghi nhận
      Cho fixture [TEST] đã được tạo
      Và T_USER đang hoạt động
      Và tôi đọc stats.failedLogins của T_USER
      Khi T_USER đăng nhập sai mật khẩu 1 lần
      Thì lịch sử của T_USER có dòng LOGIN_FAIL với chi tiết chứa "sai mật khẩu"
      Và stats.failedLogins của T_USER tăng 1

    @USR-07 @TC-USR-07-07 @P2 @regression
    Kịch bản: Sự kiện do Admin thực hiện hiển thị trên tài khoản bị tác động
      Cho fixture [TEST] đã được tạo
      Và T_USER đang hoạt động
      Khi Admin khóa T_USER
      Thì lịch sử của T_USER có dòng USER_STATUS do "Nguyễn Văn An" thực hiện
      Và lịch sử của Admin có dòng USER_STATUS với targetId là mã T_USER
      Khi Admin mở lịch sử của T_USER trên giao diện
      Thì bảng lịch sử có dòng "Đổi trạng thái tài khoản" kèm nhãn "Do Nguyễn Văn An thực hiện"

    @USR-07 @TC-USR-07-08 @P3 @smoke
    Kịch bản: Lọc theo nhóm và tìm kiếm trong lịch sử
      Cho Admin đã đăng nhập
      Khi tôi mở màn "Người dùng" và bấm tên "Lê Minh Cường"
      Và tôi chọn nhóm "Nhập/Xuất kho" và gõ "PX-" vào ô tìm kiếm lịch sử
      Thì chỉ còn các dòng thuộc nhóm "RECEIPT" và chứa "PX-"
      Và số trên nút lọc "Nhập/Xuất kho" bằng số dòng đang hiển thị

    @USR-07 @TC-USR-07-09 @P3 @smoke
    Kịch bản: Đóng bảng lịch sử
      Cho Admin đã đăng nhập
      Khi tôi mở màn "Người dùng" và bấm tên "Lê Minh Cường"
      Và tôi nhấn phím Escape
      Thì bảng lịch sử đóng lại
      Khi tôi bấm tên "Lê Minh Cường" ở bảng người dùng
      Và tôi bấm vào vùng tối bên ngoài bảng lịch sử
      Thì bảng lịch sử đóng lại

    @USR-07 @TC-USR-07-10 @P3 @regression @risk
    Kịch bản: Lịch sử của tài khoản đã xóa
      Cho fixture [TEST] đã được tạo
      Và T_USER đã bị khóa và xóa
      Khi Admin gọi GET lịch sử của T_USER
      Thì mã phản hồi là 404
      # Hạn chế đã biết: nhật ký của tài khoản đã xóa vẫn còn trong CSDL nhưng API chưa cho xem (bugs/known-limitations.md)
