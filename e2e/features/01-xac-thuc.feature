# language: vi
@xac-thuc
Tính năng: Xác thực
  Đăng nhập bằng SĐT + mật khẩu, đăng xuất, giữ phiên, xử lý hết phiên.
  7 tính năng · 17 test case · Tham chiếu BR-01..BR-04, F5, RISK-17.

  Quy tắc: AUTH-01 – Trang chủ → trang đăng nhập (UI · P3)
    Vuốt/kéo lên, nhấn phím, cuộn hoặc bấm để vào trang đăng nhập; kéo chưa đủ thì bật lại.

    @AUTH-01 @TC-AUTH-01-01 @P2 @smoke
    Kịch bản: Nhấn phím mũi tên lên ở trang chủ để vào trang đăng nhập
      Cho tôi chưa đăng nhập và đang ở trang chủ
      Khi tôi nhấn phím "ArrowUp"
      Thì trang chủ "#home" biến mất
      Và tôi thấy ô "login-user"

    @AUTH-01 @TC-AUTH-01-02 @P3 @smoke
    Kịch bản: Kéo chuột lên chưa đủ 70px thì trang chủ bật lại
      Cho tôi chưa đăng nhập và đang ở trang chủ
      Khi tôi giữ chuột kéo lên 40px rồi thả
      Thì trang chủ "#home" vẫn hiển thị

  Quy tắc: AUTH-02 – Đăng nhập bằng SĐT + mật khẩu (API · P1 · BR-01, BR-02)
    Chuẩn hóa SĐT, kiểm tra định dạng, thông báo lỗi chung không lộ tài khoản.

    @AUTH-02 @P1 @smoke
    Khung kịch bản: Đăng nhập <vai trò> thành công
      Cho tài khoản <vai trò> lấy từ biến môi trường
      Khi tôi gọi POST "/api/auth/login" với phone "<sđt>" và password "123456"
      Thì mã phản hồi là 200
      Và role trả về là "<role>"

      @TC-AUTH-02-01
      Dữ liệu:
        | vai trò | sđt        | role  |
        | Admin   | 0901111111 | admin |

      @TC-AUTH-02-02
      Dữ liệu:
        | vai trò | sđt        | role    |
        | Manager | 0902222222 | manager |

      @TC-AUTH-02-03
      Dữ liệu:
        | vai trò | sđt        | role  |
        | Staff   | 0903333333 | staff |

    @AUTH-02 @TC-AUTH-02-04 @P2 @smoke
    Kịch bản: SĐT có khoảng trắng / dấu chấm vẫn đăng nhập được
      Khi tôi gọi POST "/api/auth/login" với phone "0902 222.222" và password "123456"
      Thì mã phản hồi là 200
      Và role trả về là "manager"

    @AUTH-02 @P1 @smoke
    Khung kịch bản: Sai thông tin đăng nhập trả cùng một thông báo (<trường hợp>)
      Khi tôi gọi POST "/api/auth/login" với phone "<sđt>" và password "<mật khẩu>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Sai số điện thoại hoặc mật khẩu."

      @TC-AUTH-02-05
      Dữ liệu:
        | trường hợp   | sđt        | mật khẩu |
        | sai mật khẩu | 0902222222 | 000000   |

      @TC-AUTH-02-06
      Dữ liệu:
        | trường hợp        | sđt        | mật khẩu |
        | SĐT không tồn tại | 0999999999 | 123456   |

    @AUTH-02 @TC-AUTH-02-07 @P2 @smoke
    Khung kịch bản: SĐT sai định dạng "<sđt>"
      Khi tôi gọi POST "/api/auth/login" với phone "<sđt>" và password "123456"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)."

      Dữ liệu:
        | sđt        |
        | 0123       |
        | 0102222222 |

    @AUTH-02 @TC-AUTH-02-08 @P2 @smoke
    Khung kịch bản: Bỏ trống <trường trống>
      Khi tôi gọi POST "/api/auth/login" với phone "<sđt>" và password "<mật khẩu>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Vui lòng nhập số điện thoại và mật khẩu."

      Dữ liệu:
        | trường trống | sđt        | mật khẩu |
        | SĐT          |            | 123456   |
        | mật khẩu     | 0902222222 |          |

  Quy tắc: AUTH-03 – Chặn tài khoản Nháp / Đã khóa (API · P1 · BR-03)

    @AUTH-03 @P1 @after-reset
    Khung kịch bản: Tài khoản <tình trạng> không đăng nhập được
      Cho dữ liệu mẫu vừa được reset
      Và tài khoản <user> đang ở tình trạng "<tình trạng>"
      Khi tôi gọi POST "/api/auth/login" với phone "<sđt>" và password "123456"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      @TC-AUTH-03-01
      Dữ liệu:
        | user | tình trạng | sđt        | thông báo                                             |
        | U4   | locked     | 0904444444 | Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên. |

      @TC-AUTH-03-02
      Dữ liệu:
        | user | tình trạng | sđt        | thông báo                                                      |
        | U5   | draft      | 0905555555 | Tài khoản chưa được kích hoạt. Vui lòng liên hệ Quản trị viên. |

  Quy tắc: AUTH-04 – Đăng xuất (API · P1)

    @AUTH-04 @TC-AUTH-04-01 @P1 @smoke
    Kịch bản: Đăng xuất hủy phiên
      Cho tôi đã đăng nhập
      Khi tôi bấm "Đăng xuất"
      Thì tôi về trang đăng nhập
      Và GET "/api/state" trả mã 401

  Quy tắc: AUTH-05 – Giữ phiên khi tải lại trang (API · P2)

    @AUTH-05 @TC-AUTH-05-01 @P2 @smoke
    Kịch bản: Tải lại trang vẫn giữ đăng nhập
      Cho tôi đã đăng nhập
      Khi tôi tải lại trang
      Thì tôi vẫn ở trong ứng dụng
      Và menu trái hiển thị

  Quy tắc: AUTH-06 – Hết phiên / bị khóa giữa phiên (API + UI · P1 · BR-04, RISK-17)
    Request tiếp theo trả 401, giao diện về trang đăng nhập.

    @AUTH-06 @TC-AUTH-06-01 @P1 @regression
    Kịch bản: Bị khóa giữa phiên thì về trang đăng nhập (F5)
      Cho fixture [TEST] đã được tạo
      Và T_USER (staff) đã đăng nhập ở context A
      Khi Admin ở context B khóa T_USER
      Và T_USER làm một thao tác có gọi API ở context A (ví dụ lưu phiếu; chỉ chuyển màn thì không gọi API)
      Thì API trả 401 với thông báo bắt đầu bằng "Phiên đăng nhập không còn hiệu lực"
      Và giao diện của T_USER về trang đăng nhập

    @AUTH-06 @TC-AUTH-06-02 @P2 @exclusive @risk
    Kịch bản: Máy chủ khởi động lại thì phiên mất, giao diện xử lý êm
      Cho nhóm đã được báo trước vì mọi người sẽ bị đăng xuất
      Và tôi đã đăng nhập
      Khi máy chủ được khởi động lại
      Và tôi thao tác tiếp có gọi API
      Thì tôi thấy thông báo phiên hết hạn và về trang đăng nhập
      Và đăng nhập lại thì dùng bình thường

  Quy tắc: AUTH-07 – Thẻ tài khoản demo (UI · P3)

    @AUTH-07 @TC-AUTH-07-01 @P3 @smoke
    Kịch bản: Thẻ demo điền đúng SĐT và mật khẩu
      Cho tôi đang ở trang đăng nhập
      Khi tôi bấm thẻ ".rolecard" thứ 2 (nth=1, thẻ Manager)
      Thì ô "login-user" có giá trị "0902222222"
      Và ô "login-pass" có giá trị "123456"
      Và thẻ đó có viền chọn
