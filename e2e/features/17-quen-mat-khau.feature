# language: vi
@quen-mat-khau
Tính năng: Quên mật khẩu, đặt lại bằng mã OTP gửi qua email
  Người dùng tự đặt lại mật khẩu: nhập SĐT → nhận mã 6 số qua email → nhập mã → đặt mật khẩu mới.
  Không lộ tài khoản nào có thật, giới hạn tần suất, hủy mọi phiên cũ sau khi đặt lại.
  1 tính năng · 21 test case · Tham chiếu AUTH-08 (docs/AUTH-08_quen-mat-khau.md), BR-27..BR-36, SEC-04..SEC-07.
  Cần Mailpit (MAILPIT_URL, mặc định http://localhost:8025, chạy với --enable-chaos). Không có Mailpit thì các test cần đọc mail tự bỏ qua.
  Nên chạy máy chủ với thời hạn rút ngắn để test hết hạn và gửi lại:
  RESET_OTP_TTL_SECONDS=20 RESET_TOKEN_TTL_SECONDS=20 RESET_RESEND_COOLDOWN_SECONDS=3 (test tự bỏ qua nếu phải chờ quá lâu).
  Mỗi kịch bản gửi yêu cầu từ một địa chỉ IP giả riêng (X-Forwarded-For) để không chạm giới hạn 20 lần/giờ/IP của kịch bản khác.

  Quy tắc: AUTH-08 – Quên mật khẩu (API + UI · P1 · BR-27..BR-36)
    Phản hồi chung cho mọi SĐT hợp lệ; OTP 6 số, sai 5 lần thì hủy; token dùng một lần; đặt lại xong thì hủy phiên cũ.

    @AUTH-08 @TC-AUTH-08-01 @P1 @smoke
    Kịch bản: Luồng chính trên giao diện: tự đặt lại mật khẩu bằng mã OTP
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Khi tôi mở màn đăng nhập và bấm "Quên mật khẩu?"
      Và tôi nhập SĐT của T_USER và bấm "Gửi mã xác nhận"
      Thì màn nhập mã hiển thị thông báo chung kèm SĐT của T_USER
      Khi tôi nhập mã trong email mới nhất và bấm "Xác nhận"
      Và tôi nhập mật khẩu mới "MoiMoi99" hai lần và bấm "Đặt lại mật khẩu"
      Thì toast hiển thị "Đặt lại mật khẩu thành công"
      Và form đăng nhập điền sẵn SĐT của T_USER và ô mật khẩu trống
      Và T_USER đăng nhập bằng "MoiMoi99" thành công
      Và T_USER đăng nhập bằng mật khẩu cũ thất bại

    @AUTH-08 @TC-AUTH-08-02 @P1 @smoke
    Khung kịch bản: Phản hồi giống hệt nhau, chỉ tài khoản đủ điều kiện mới nhận mail: <loại>
      Cho fixture [TEST] đã được tạo
      Và <loại>
      Khi tôi yêu cầu mã xác nhận cho tài khoản đó
      Thì phản hồi là phản hồi chung
      Và hộp thư của tài khoản đó có <số mail> mail mã xác nhận

      Dữ liệu:
        | loại                                    | số mail |
        | T_USER có email riêng                   | 1       |
        | SĐT không thuộc tài khoản nào           | 0       |
        | tài khoản [TEST] bị khóa có email       | 0       |
        | tài khoản [TEST] nháp có email          | 0       |
        | tài khoản [TEST] đang hoạt động chưa có email | 0 |

    @AUTH-08 @TC-AUTH-08-03 @P2 @regression
    Kịch bản: Thời gian phản hồi không lộ SĐT nào có tài khoản
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Khi tôi đo thời gian yêu cầu mã cho T_USER và cho SĐT không tồn tại, mỗi loại 4 lần
      Thì chênh lệch trung vị nhỏ hơn 50 ms

    @AUTH-08 @TC-AUTH-08-04 @P1 @regression
    Kịch bản: Nhập sai mã 5 lần thì mã bị hủy, nhập đúng sau đó cũng không được
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã yêu cầu mã xác nhận
      Khi tôi nhập sai mã 5 lần
      Thì cả 5 lần đều trả 400 với thông báo "Mã xác nhận không đúng hoặc đã hết hạn."
      Khi tôi nhập mã thứ 1 trong email
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Mã xác nhận không đúng hoặc đã hết hạn."
      Và lịch sử của T_USER có hành động "PWD_RESET_OTP_LOCKED"

    @AUTH-08 @TC-AUTH-08-05 @P1 @regression
    Kịch bản: Gửi mã mới thì mã cũ mất hiệu lực
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã yêu cầu mã xác nhận
      Khi T_USER yêu cầu mã lần nữa sau thời gian chờ gửi lại
      Và tôi nhập mã thứ 2 trong email
      Thì mã phản hồi là 400
      Khi tôi nhập mã thứ 1 trong email
      Thì mã phản hồi là 200 và có reset token

    @AUTH-08 @TC-AUTH-08-06 @P1 @regression
    Kịch bản: Giới hạn gửi mã theo SĐT: chờ giữa hai lần, tối đa 5 lần mỗi giờ, áp dụng cả SĐT không tồn tại
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã yêu cầu mã xác nhận
      Khi tôi yêu cầu mã xác nhận cho T_USER ngay lập tức
      Thì mã phản hồi là 429 kèm retryAfter và header Retry-After
      Và thông báo lỗi bắt đầu bằng "Vui lòng đợi"
      Cho SĐT không thuộc tài khoản nào
      Khi tôi yêu cầu mã xác nhận cho tài khoản đó 2 lần liên tiếp
      Thì mã phản hồi là 429 kèm retryAfter và header Retry-After
      Và thông báo lỗi bắt đầu bằng "Vui lòng đợi"
      Khi T_USER yêu cầu mã thêm 4 lần, mỗi lần sau thời gian chờ gửi lại
      Thì mã phản hồi là 200
      Khi T_USER yêu cầu mã lần nữa sau thời gian chờ gửi lại
      Thì mã phản hồi là 429 kèm retryAfter và header Retry-After
      Và thông báo lỗi bắt đầu bằng "Bạn đã yêu cầu mã quá nhiều lần"

    @AUTH-08 @TC-AUTH-08-07 @P1 @regression
    Kịch bản: Reset token chỉ dùng được một lần
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã có reset token
      Khi tôi đặt mật khẩu mới "MoiMoi99" bằng token đó
      Thì mã phản hồi là 200
      Khi tôi đặt mật khẩu mới "MoiMoi98" bằng token đó
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu."

    @AUTH-08 @TC-AUTH-08-08 @P1 @regression
    Kịch bản: Đặt lại mật khẩu thì mọi phiên đang mở của tài khoản bị hủy
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đang đăng nhập ở một phiên khác
      Và T_USER đã có reset token
      Khi tôi đặt mật khẩu mới "MoiMoi99" bằng token đó
      Thì phiên khác của T_USER nhận 401 "Phiên đăng nhập không còn hiệu lực"

    @AUTH-08 @TC-AUTH-08-09 @P1 @regression
    Kịch bản: Đặt lại mật khẩu gỡ khóa tạm do đăng nhập sai nhiều lần
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Khi tôi đăng nhập T_USER sai mật khẩu 5 lần liên tiếp
      Thì T_USER đăng nhập bằng mật khẩu cũ bị khóa tạm
      Khi T_USER đặt lại mật khẩu thành "MoiMoi99" bằng mã OTP
      Thì T_USER đăng nhập bằng "MoiMoi99" thành công

    @AUTH-08 @TC-AUTH-08-10 @P1 @regression
    Kịch bản: Tài khoản bị khóa không nhận mã, không đặt lại được và vẫn bị khóa
      Cho fixture [TEST] đã được tạo
      Và tài khoản [TEST] bị khóa có email
      Khi tôi yêu cầu mã xác nhận cho tài khoản đó
      Thì phản hồi là phản hồi chung
      Và hộp thư của tài khoản đó có 0 mail mã xác nhận
      Khi tôi nhập mã "123456" cho tài khoản đó
      Thì mã phản hồi là 400
      Và tài khoản đó vẫn ở tình trạng "locked"

    @AUTH-08 @TC-AUTH-08-11 @P2 @regression
    Kịch bản: Mật khẩu mới phải đúng quy tắc, sai thì token vẫn còn dùng được
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã có reset token
      Khi tôi đặt mật khẩu bằng token đó với các giá trị sau thì đều nhận 400:
        | mật khẩu   | nhập lại   | thông báo                                |
        | abc12      | abc12      | Mật khẩu phải có ít nhất 6 ký tự.        |
        | abc 1234   | abc 1234   | Mật khẩu không được chứa khoảng trắng.   |
        | <73 ký tự> | <73 ký tự> | Mật khẩu quá dài                         |
        | Test1234   | Test1234   | Mật khẩu mới phải khác mật khẩu hiện tại. |
        | MoiMoi99   | MoiMoi98   | Mật khẩu nhập lại không khớp.            |
      Khi tôi đặt mật khẩu mới "MoiMoi99" bằng token đó
      Thì mã phản hồi là 200

    @AUTH-08 @TC-AUTH-08-12 @P2 @regression @short-ttl
    Kịch bản: Mã OTP và reset token hết hạn
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đã yêu cầu mã xác nhận
      Khi tôi chờ mã hết hạn rồi nhập mã thứ 1 trong email
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Mã xác nhận không đúng hoặc đã hết hạn."
      Khi T_USER yêu cầu mã lần nữa sau thời gian chờ gửi lại
      Và tôi nhập mã thứ 1 trong email
      Thì mã phản hồi là 200 và có reset token
      Khi tôi chờ token hết hạn rồi đặt mật khẩu mới "MoiMoi99"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu."

    @AUTH-08 @TC-AUTH-08-13 @P2 @regression
    Kịch bản: Màn nhập mã: đồng hồ đếm ngược, khóa gửi lại, chỉ nhận chữ số
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Khi tôi mở màn đăng nhập và bấm "Quên mật khẩu?"
      Và tôi nhập SĐT của T_USER và bấm "Gửi mã xác nhận"
      Thì đồng hồ "Mã hết hạn sau" đang đếm ngược
      Và nút gửi lại mã bị khóa kèm số giây chờ
      Và nút "Xác nhận" của khung quên mật khẩu bị vô hiệu hóa
      Khi tôi dán "123 456" vào ô mã xác nhận
      Thì ô mã xác nhận có giá trị "123456"
      Và nút "Xác nhận" của khung quên mật khẩu được bật
      Khi tôi chờ hết thời gian chờ gửi lại rồi bấm "Gửi lại mã"
      Thì toast hiển thị "Đã gửi lại mã xác nhận."
      Và hộp thư của T_USER có 2 mail mã xác nhận

    @AUTH-08 @TC-AUTH-08-14 @P2 @regression
    Kịch bản: Điều hướng trong luồng quên mật khẩu không mất SĐT đã nhập
      Cho tôi chưa đăng nhập
      Khi tôi mở màn đăng nhập, gõ "0912 000 111" vào ô SĐT rồi bấm "Quên mật khẩu?"
      Thì ô SĐT của khung quên mật khẩu có giá trị "0912 000 111"
      Khi tôi gõ "123" vào ô SĐT của khung quên mật khẩu và bấm "Gửi mã xác nhận"
      Thì khung quên mật khẩu báo lỗi "Số điện thoại không hợp lệ"
      Khi tôi gõ một SĐT ngẫu nhiên vào ô SĐT của khung quên mật khẩu và bấm "Gửi mã xác nhận"
      Và tôi bấm "Đổi số điện thoại" trong khung quên mật khẩu
      Thì ô SĐT của khung quên mật khẩu có SĐT vừa nhập
      Khi tôi bấm "← Quay lại đăng nhập" trong khung quên mật khẩu
      Thì ô SĐT của form đăng nhập có SĐT vừa nhập
      Khi tôi bấm "Quên mật khẩu?" trong khung đăng nhập rồi nhấn phím Escape
      Thì form đăng nhập hiển thị
      Và không có lỗi JavaScript nào

    @AUTH-08 @TC-AUTH-08-15 @P1 @regression
    Kịch bản: Admin nhập email cho tài khoản: chuẩn hóa chữ thường, chặn trùng và sai định dạng
      Cho fixture [TEST] đã được tạo
      Khi Admin mở "Sửa" ở dòng T_USER
      Và tôi gõ " T_User.<runId>@QLKHO.Test " vào ô Email của form tài khoản
      Và tôi bấm "Lưu thay đổi"
      Thì toast hiển thị "Đã cập nhật tài khoản"
      Và "state.users" có T_USER với email "t_user.<runId>@qlkho.test"
      Khi Admin đặt email của T_USER trùng email của một tài khoản [TEST] khác
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Email đã được dùng cho tài khoản khác."
      Khi Admin đặt email của T_USER thành "khong-hop-le"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Email không hợp lệ."
      Khi Admin đặt email của T_USER thành ""
      Thì mã phản hồi là 200
      Và "state.users" có T_USER không có email

    @AUTH-08 @TC-AUTH-08-16 @P1 @regression
    Kịch bản: Chỉ Admin thấy email của tài khoản
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Thì "state.users" của Admin có email của T_USER
      Và "state.users" của Manager không có email nào
      Và "state.users" của Staff không có email nào

    @AUTH-08 @TC-AUTH-08-17 @P2 @regression
    Kịch bản: Lịch sử hoạt động ghi nhận đặt lại mật khẩu, không chứa mã
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đặt lại mật khẩu thành "MoiMoi99" bằng mã OTP
      Khi Admin mở lịch sử của T_USER trên giao diện
      Thì bảng lịch sử có dòng "Yêu cầu đặt lại mật khẩu" và dòng "Đặt lại mật khẩu"
      Và bảng lịch sử không chứa mã OTP hay reset token đã dùng

    @AUTH-08 @TC-AUTH-08-18 @P2 @regression
    Kịch bản: Nội dung email mã xác nhận và email thông báo đổi mật khẩu
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đặt lại mật khẩu thành "MoiMoi99" bằng mã OTP
      Thì mail mã xác nhận gửi T_USER có họ tên, mã 6 số, thời hạn và không có liên kết
      Và mail thông báo đổi mật khẩu gửi T_USER có thời điểm, địa chỉ IP và không có liên kết

    @AUTH-08 @TC-AUTH-08-19 @P2 @regression @requires-log
    Kịch bản: Log máy chủ không chứa mã OTP, reset token hay mật khẩu mới
      Cho log máy chủ đọc được qua biến APP_LOG
      Và fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và T_USER đặt lại mật khẩu thành "MoiMoi99" bằng mã OTP
      Thì log máy chủ không chứa mã OTP, reset token hay mật khẩu mới đã dùng

    @AUTH-08 @TC-AUTH-08-20 @P3 @regression
    Kịch bản: Giới hạn 20 lần gửi mã mỗi giờ từ một địa chỉ IP
      Khi tôi yêu cầu mã cho 20 SĐT ngẫu nhiên khác nhau từ cùng một IP
      Thì cả 20 lần đều trả 200
      Khi tôi yêu cầu mã cho 1 SĐT ngẫu nhiên nữa từ IP đó
      Thì mã phản hồi là 429 kèm retryAfter và header Retry-After
      Và yêu cầu mã từ một IP khác vẫn trả 200

    @AUTH-08 @TC-AUTH-08-21 @P2 @regression
    Kịch bản: Dịch vụ mail lỗi thì người dùng vẫn nhận phản hồi chung, lỗi được ghi nhật ký
      Cho fixture [TEST] đã được tạo
      Và T_USER có email riêng
      Và Mailpit đang giả lập lỗi người nhận
      Khi tôi yêu cầu mã xác nhận cho T_USER
      Thì phản hồi là phản hồi chung
      Và lịch sử của T_USER có hành động "PWD_RESET_MAIL_FAIL"
