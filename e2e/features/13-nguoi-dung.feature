# language: vi
@nguoi-dung
Tính năng: Người dùng
  Danh sách, tạo tài khoản, sửa họ tên/SĐT/mật khẩu, kích hoạt/khóa, xóa, quyền riêng tư.
  6 tính năng · 25 test case · Tham chiếu BR-03, BR-04, BR-17..BR-19, CR-02, F5, RISK-05, RISK-06.
  Chỉ Admin quản lý người dùng; Manager và Staff không thấy menu và bị chặn ở API (403).

  Quy tắc: USR-01 – Danh sách, thống kê, lọc (UI · P3)
    Thẻ số liệu bấm lọc theo tình trạng; tìm theo tên/SĐT.

    @USR-01 @TC-USR-01-01 @P3 @after-reset
    Kịch bản: Thẻ Đã khóa lọc danh sách
      Cho dữ liệu mẫu vừa được reset
      Và Admin đã đăng nhập
      Và tôi đang ở màn "Người dùng"
      Khi tôi bấm thẻ "Đã khóa"
      Thì danh sách có 1 dòng "Phạm Thu Dung"
      Và pill "Đã khóa (1)" được chọn

    @USR-01 @P1 @smoke
    Khung kịch bản: <vai trò> không thấy menu Người dùng
      Khi <vai trò> đăng nhập
      Thì menu trái không có mục "Người dùng"

      @TC-USR-01-02
      Dữ liệu:
        | vai trò |
        | Manager |

      @TC-USR-01-03
      Dữ liệu:
        | vai trò |
        | Staff   |

  Quy tắc: USR-02 – Tạo tài khoản (API · P1 · BR-17)
    Họ tên, SĐT, mật khẩu, vai trò, ngày mở, tình trạng.

    @USR-02 @TC-USR-02-01 @P1 @regression
    Kịch bản: Tạo tài khoản hợp lệ
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/users" với:
        | name                 | phone                  | password | role  | opened  | status |
        | [TEST] User <runId>  | 09xxxxxxxx ngẫu nhiên  | Test1234 | staff | hôm nay | active |
      Thì mã phản hồi là 200
      Và đăng nhập bằng SĐT đó với mật khẩu "Test1234" thành công

    @USR-02 @TC-USR-02-02 @P2 @smoke
    Khung kịch bản: SĐT <trường hợp>
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/users" với phone "<sđt>"
      Thì mã phản hồi là 400
      Và thông báo lỗi bắt đầu bằng "<thông báo>"

      Dữ liệu:
        | trường hợp    | sđt        | thông báo                                           |
        | trùng         | 0902222222 | Số điện thoại 0902222222 đã được dùng               |
        | sai định dạng | 0123456789 | Số điện thoại không hợp lệ: cần 10 số               |

    @USR-02 @TC-USR-02-03 @P2 @smoke
    Khung kịch bản: Mật khẩu <trường hợp>
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/users" với password "<mật khẩu>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      Dữ liệu:
        | trường hợp      | mật khẩu | thông báo                                |
        | quá ngắn        | 12345    | Mật khẩu phải có ít nhất 6 ký tự.        |
        | có khoảng trắng | abc 123  | Mật khẩu không được chứa khoảng trắng.   |

    @USR-02 @TC-USR-02-04 @P3 @smoke
    Khung kịch bản: Dữ liệu tài khoản không hợp lệ: <trường hợp>
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/users" với <trường> = <giá trị>
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<từ khóa>"

      Dữ liệu:
        | trường hợp    | trường | giá trị | từ khóa |
        | thiếu họ tên  | name   | ""      | họ tên  |
        | thiếu ngày mở | opened | ""      | ngày    |
        | vai trò sai   | role   | "boss"  | vai trò |

    @USR-02 @TC-USR-02-05 @P1 @smoke
    Kịch bản: Manager không tạo tài khoản
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/users"
      Thì mã phản hồi là 403

  Quy tắc: USR-03 – Sửa họ tên / SĐT / mật khẩu (API + UI · P1 · BR-18, CR-02)
    Admin sửa được họ tên (bổ sung CR-02 ngày 07/11/2026), SĐT và mật khẩu của mọi tài khoản;
    mật khẩu để trống = giữ nguyên; không gửi họ tên = giữ nguyên; vai trò, ngày mở, tình trạng không đổi.

    @USR-03 @TC-USR-03-01 @P1 @regression
    Kịch bản: Đổi mật khẩu người dùng
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi PUT "/api/users/T_USER" với phone cũ và password "newpass1"
      Thì mã phản hồi là 200
      Và T_USER đăng nhập bằng mật khẩu cũ thất bại
      Và T_USER đăng nhập bằng "newpass1" thành công

    @USR-03 @TC-USR-03-02 @P2 @regression
    Kịch bản: Đổi SĐT người dùng
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi PUT "/api/users/T_USER" với phone mới ngẫu nhiên và password rỗng
      Thì mã phản hồi là 200
      Và T_USER đăng nhập bằng SĐT mới với mật khẩu cũ thành công

    @USR-03 @TC-USR-03-03 @P3 @smoke
    Kịch bản: Không có thay đổi
      Cho Admin đã đăng nhập
      Khi tôi gọi PUT "/api/users/U3" với phone "0903333333" và password rỗng
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Chưa có thay đổi nào để lưu."

    @USR-03 @TC-USR-03-04 @P1 @regression
    Kịch bản: Admin đổi họ tên, SĐT và mật khẩu cùng lúc (CR-02)
      Cho fixture [TEST] đã được tạo
      Khi Admin sửa T_USER với họ tên "[TEST] Tên mới", phone mới ngẫu nhiên và password "newpass2"
      Thì mã phản hồi là 200
      Và "state.users" có T_USER với họ tên mới
      Và T_USER đăng nhập bằng SĐT mới và mật khẩu mới thành công
      Và vai trò, ngày mở và tình trạng của T_USER không đổi

    @USR-03 @TC-USR-03-05 @P2 @regression
    Khung kịch bản: Họ tên không hợp lệ khi sửa (CR-02)
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi PUT "/api/users/T_USER" với họ tên "<họ tên>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      Dữ liệu:
        | họ tên  | thông báo                 |
        |         | Vui lòng nhập họ tên.     |
        | A×101   | Họ tên tối đa 100 ký tự.  |

    @USR-03 @TC-USR-03-06 @P2 @regression
    Kịch bản: Sửa họ tên trên giao diện (CR-02)
      Cho fixture [TEST] đã được tạo
      Khi Admin mở "Sửa" ở dòng T_USER
      Thì ô "Họ tên" điền sẵn họ tên hiện tại của T_USER
      Khi tôi đổi họ tên thành "[TEST] Tên sửa trên UI" và bấm "Lưu thay đổi"
      Thì toast vừa hiện có "Đã cập nhật tài khoản [TEST] Tên sửa trên UI"
      Và bảng người dùng hiển thị họ tên mới của T_USER

    @USR-03 @TC-USR-03-07 @P2 @regression
    Kịch bản: Manager không sửa được họ tên người dùng
      Cho fixture [TEST] đã được tạo
      Khi Manager gọi PUT "/api/users/T_USER" với họ tên "[TEST] Manager đổi"
      Thì mã phản hồi là 403

  Quy tắc: USR-04 – Kích hoạt / khóa / mở khóa (API · P1 · BR-04)
    Không tự đổi trạng thái của mình.

    @USR-04 @TC-USR-04-01 @P1 @regression
    Kịch bản: Khóa tài khoản
      Cho fixture [TEST] đã được tạo
      Và T_USER đang active
      Khi Admin gọi PUT "/api/users/T_USER/status" với "locked"
      Thì mã phản hồi là 200
      Và T_USER đăng nhập bị từ chối

    @USR-04 @TC-USR-04-02 @P2 @smoke
    Kịch bản: Không tự đổi trạng thái của mình
      Cho Admin đã đăng nhập
      Khi tôi gọi PUT "/api/users/U1/status" với "locked"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Bạn không thể đổi trạng thái tài khoản của chính mình."

    @USR-04 @TC-USR-04-03 @P1 @regression
    Kịch bản: Vòng đời tài khoản (F5)
      Cho fixture [TEST] đã được tạo
      Và Admin tạo T_USER2 ở tình trạng "draft"
      Khi T_USER2 đăng nhập
      Thì bị từ chối với thông báo "chưa được kích hoạt"
      Khi Admin kích hoạt T_USER2
      Và T_USER2 đăng nhập
      Thì T_USER2 vào được ứng dụng
      Khi Admin khóa T_USER2 trong lúc T_USER2 đang dùng
      Và T_USER2 thao tác có gọi API
      Thì T_USER2 bị đẩy về trang đăng nhập

  Quy tắc: USR-05 – Xóa tài khoản (API + UI · P1 · BR-19)
    Phải khóa trước; popup đếm chứng từ; giữ lịch sử.

    @USR-05 @TC-USR-05-01 @P1 @smoke
    Kịch bản: Xóa tài khoản chưa khóa
      Cho Admin đã đăng nhập
      Khi tôi gọi DELETE "/api/users/U3"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Hãy khóa tài khoản Lê Minh Cường trước, sau đó mới có thể xóa."

    @USR-05 @TC-USR-05-02 @P1 @regression
    Kịch bản: Xóa tài khoản đã khóa, giữ lịch sử
      Cho fixture [TEST] đã được tạo
      Và T_USER đã lập 1 phiếu và đã bị khóa
      Khi Admin gọi DELETE "/api/users/T_USER"
      Thì mã phản hồi là 200
      Và T_USER không còn trong "state.users"
      Và phiếu của T_USER trong "state.receipts" vẫn giữ tên người lập

    @USR-05 @TC-USR-05-03 @P2 @smoke
    Kịch bản: Không tự xóa chính mình
      Cho Admin đã đăng nhập
      Khi tôi gọi DELETE "/api/users/U1"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Bạn không thể xóa tài khoản của chính mình."

    @USR-05 @TC-USR-05-04 @P3 @regression
    Kịch bản: Popup xóa đếm đúng chứng từ
      Cho fixture [TEST] đã được tạo
      Và T_USER đã lập 1 phiếu nhập và đã bị khóa
      Khi Admin bấm "Xóa" ở dòng T_USER
      Thì popup ghi "1 chứng từ (1 phiếu nhập)"
      Và nút "Xóa tài khoản" bị vô hiệu hóa
      Khi tôi tích "del-ack"
      Thì nút "Xóa tài khoản" được bật

    @USR-05 @TC-USR-05-05 @P2 @regression @risk
    Kịch bản: Xóa tài khoản đang là thủ kho
      Cho fixture [TEST] đã được tạo
      Và T_USER là thủ kho của T_WH và đã bị khóa
      Khi Admin xóa T_USER
      Và tôi gọi GET "/api/state" rồi mở màn "Kho"
      Thì không có lỗi 500
      Và T_WH hiển thị "Tài khoản đã xóa – Cần chọn thủ kho mới"

    @USR-05 @TC-USR-05-06 @P1 @regression @risk
    Kịch bản: Mã tài khoản không cấp lại sau khi xóa (BUG-011)
      Cho fixture [TEST] đã được tạo
      Và T_USER đã lập 1 phiếu nhập và đã bị khóa
      Khi Admin xóa T_USER
      Và Admin tạo tài khoản Quản lý kho mới
      Thì tài khoản mới có mã khác mã của T_USER
      Và tài khoản mới duyệt được phiếu của T_USER

  Quy tắc: USR-06 – Quyền riêng tư danh sách người dùng (API · P2 · RISK-06)
    SĐT người dùng trong /api/state.

    @USR-06 @TC-USR-06-01 @P2 @smoke @risk
    Kịch bản: Manager nhận SĐT mọi người dùng
      Cho Manager đã đăng nhập
      Khi tôi gọi GET "/api/state" và đọc "users[].phone"
      Thì theo quyền riêng tư chỉ Admin nên thấy SĐT người dùng
      # Đã sửa ở BUG-010 (RISK-06): users[].phone chỉ trả cho Admin
