# language: vi
@kho
Tính năng: Kho
  Danh sách kho, thêm/sửa, chọn thủ kho, tạm ngưng/mở lại, xóa, ẩn SĐT theo vai trò.
  7 tính năng · 19 test case · Tham chiếu BR-20..BR-23, F6, F10, bảng phân quyền 4.2.
  Chỉ Admin quản lý kho; Manager và Staff bị chặn ở API (403).

  Quy tắc: WH-01 – Danh sách, thống kê, lọc (UI · P3)
    Sức chứa đã dùng, số mặt hàng, tồn thấp, trạng thái.

    @WH-01 @TC-WH-01-01 @P3 @after-reset
    Kịch bản: Danh sách kho và sức chứa
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở màn "Kho"
      Thì danh sách có 2 kho
      Và "Kho Hà Nội" hiển thị "415 / 2.000 (21%)"

  Quy tắc: WH-02 – Thêm kho (API · P1 · BR-20)
    Mã KHO-XXX duy nhất, tên duy nhất, địa chỉ, sức chứa.

    @WH-02 @TC-WH-02-01 @P1 @regression
    Kịch bản: Thêm kho hợp lệ
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi POST "/api/warehouses" với:
        | code          | name               | address | keeperId | capacity | opened   | status |
        | kho-t<runId>  | [TEST] Kho <runId> | địa chỉ | T_USER   | 800      | hôm nay  | paused |
      Thì mã phản hồi là 200
      Và code được lưu dạng "KHO-T…" (tự in hoa)
      Và trạng thái là "Tạm ngưng"

    @WH-02 @TC-WH-02-02 @P2 @smoke
    Khung kịch bản: Mã kho sai / trùng, tên trùng (<trường hợp>)
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/warehouses" với <trường> = "<giá trị>"
      Thì mã phản hồi là 400
      Và thông báo lỗi bắt đầu bằng "<thông báo>"

      Dữ liệu:
        | trường hợp   | trường | giá trị    | thông báo                                |
        | mã sai dạng  | code   | KHO-1      | Mã kho phải có dạng                      |
        | mã trùng     | code   | KHO-HN     | Mã kho KHO-HN đã tồn tại.                |
        | tên trùng    | name   | kho hà nội | Tên kho “kho hà nội” đã được dùng.       |

    @WH-02 @TC-WH-02-03 @P3 @smoke
    Khung kịch bản: Thiếu <trường hợp>
      Cho Admin đã đăng nhập
      Khi tôi gọi POST "/api/warehouses" với <trường> = <giá trị>
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<nội dung>"

      Dữ liệu:
        | trường hợp         | trường   | giá trị | nội dung                |
        | địa chỉ            | address  | ""      | địa chỉ                 |
        | ngày đưa vào dùng  | opened   | ""      | ngày đưa vào sử dụng    |
        | sức chứa hợp lệ    | capacity | -1      | sức chứa                |

    @WH-02 @TC-WH-02-04 @P1 @smoke
    Kịch bản: Manager không thêm kho
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/warehouses"
      Thì mã phản hồi là 403
      Và màn "Kho" không có nút "+ Thêm kho"

    @WH-02 @TC-WH-02-05 @P1 @smoke
    Kịch bản: Staff không thêm kho
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/warehouses"
      Thì mã phản hồi là 403

  Quy tắc: WH-03 – Sửa kho (API · P2 · BR-20)
    Không sửa mã/ngày; sức chứa ≥ tồn.

    @WH-03 @TC-WH-03-01 @P2 @smoke @seed-data
    Kịch bản: Sức chứa nhỏ hơn tồn hiện tại
      Cho Admin đã đăng nhập
      Khi tôi gọi PUT "/api/warehouses/HN" với capacity 100
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Sức chứa (100) không được nhỏ hơn số lượng đang tồn (415)."

    @WH-03 @TC-WH-03-02 @P3 @regression
    Kịch bản: Sửa kho không đổi được mã
      Cho fixture [TEST] đã được tạo
      Khi Admin gọi PUT "/api/warehouses/T_WH" với code "KHO-XX"
      Thì mã của T_WH không đổi

  Quy tắc: WH-04 – Chọn thủ kho (popup) (API + UI · P2 · BR-21, F10)
    Tìm theo tên/SĐT; chỉ manager/staff đang hoạt động.

    @WH-04 @TC-WH-04-01 @P2 @after-reset
    Kịch bản: Popup chọn thủ kho và tìm kiếm
      Cho dữ liệu mẫu vừa được reset
      Và Admin bấm "Thêm kho"
      Khi tôi mở ".keeperbox" và gõ "0903" vào ô "kp-q"
      Thì có 1 kết quả "Lê Minh Cường" kèm "Đang phụ trách: Kho TP.HCM"
      Khi tôi chọn kết quả đó
      Thì ô "wf-phone" có giá trị "0903333333"

    @WH-04 @TC-WH-04-02 @P2 @after-reset
    Khung kịch bản: Thủ kho không hợp lệ (<trường hợp>)
      Cho dữ liệu mẫu vừa được reset
      Và Admin đã đăng nhập
      Khi tôi lưu kho với keeperId = "<keeperId>"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      Dữ liệu:
        | trường hợp        | keeperId | thông báo                                                  |
        | là Admin          | U1       | Thủ kho phải là Quản lý kho hoặc Nhân viên kho.            |
        | tài khoản đã khóa | U4       | Chỉ chọn được tài khoản đang hoạt động làm thủ kho.        |

    @WH-04 @TC-WH-04-03 @P2 @regression
    Kịch bản: Giữ nguyên thủ kho đã bị khóa (F10)
      Cho fixture [TEST] đã được tạo
      Và T_WH có thủ kho là T_USER
      Và T_USER đã bị khóa
      Khi Admin gọi PUT "/api/warehouses/T_WH" giữ keeperId = T_USER
      Thì mã phản hồi là 200
      Và màn "Kho" hiện cảnh báo "Tài khoản đã khóa" ở T_WH

  Quy tắc: WH-05 – Tạm ngưng / mở lại kho (API + UI · P1 · BR-22, F6)
    Không còn phiếu chờ; còn ≥ 1 kho active; kho tạm ngưng bị ẩn khỏi lập phiếu/kiểm kê.

    @WH-05 @TC-WH-05-01 @P1 @regression
    Kịch bản: Không tạm ngưng kho còn phiếu chờ
      Cho fixture [TEST] đã được tạo
      Và T_WH đang active và có 1 phiếu [TEST] chờ duyệt
      Khi Admin gọi PUT "/api/warehouses/T_WH/status" với "paused"
      Thì mã phản hồi là 400
      Và thông báo lỗi bắt đầu bằng "Không thể tạm ngưng <T_WH>: còn 1 phiếu chờ duyệt"

    @WH-05 @TC-WH-05-02 @P2 @exclusive
    Kịch bản: Không tạm ngưng kho active cuối cùng
      Cho nhóm đã được báo trước
      Và mọi kho đã tạm ngưng trừ 1 kho
      Khi Admin tạm ngưng kho còn lại
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Phải có ít nhất một kho đang hoạt động."
      # Sau khi chạy: reset CSDL

    @WH-05 @TC-WH-05-03 @P2 @regression
    Kịch bản: Kho tạm ngưng bị ẩn khỏi lập phiếu (F6)
      Cho fixture [TEST] đã được tạo
      Và T_WH đang active
      Khi Admin tạm ngưng T_WH
      Và Staff mở các màn "Nhập kho", "Xuất kho", "Kiểm kê"
      Thì không màn nào có thẻ kho T_WH

  Quy tắc: WH-06 – Xóa kho (API + UI · P1 · BR-23)
    Phải tạm ngưng + hết hàng + không phiếu chờ; popup xác nhận.

    @WH-06 @TC-WH-06-01 @P1 @regression
    Kịch bản: Xóa kho chưa tạm ngưng / còn hàng
      Cho fixture [TEST] đã được tạo
      Và T_WH đang active
      Và T_WH2 đã tạm ngưng nhưng còn T_PROD × 5
      Khi Admin gọi DELETE "/api/warehouses/T_WH"
      Thì mã phản hồi là 400
      Và thông báo lỗi bắt đầu bằng "Hãy tạm ngưng <T_WH> trước"
      Khi Admin gọi DELETE "/api/warehouses/T_WH2"
      Thì mã phản hồi là 400
      Và thông báo lỗi bắt đầu bằng "Không thể xóa <T_WH2>: kho còn 5 đơn vị hàng"

    @WH-06 @TC-WH-06-02 @P1 @regression
    Kịch bản: Xóa kho rỗng đã tạm ngưng
      Cho fixture [TEST] đã được tạo
      Và T_WH đã tạm ngưng và tồn bằng 0
      Khi Admin gọi DELETE "/api/warehouses/T_WH"
      Thì mã phản hồi là 200
      Và T_WH không còn trong "/api/state"
      Và phiếu và thẻ kho cũ của T_WH vẫn còn

    @WH-06 @TC-WH-06-03 @P3 @regression
    Kịch bản: Popup xác nhận xóa kho
      Cho fixture [TEST] đã được tạo
      Và T_WH đã tạm ngưng và tồn bằng 0
      Khi Admin bấm "Xóa" ở dòng T_WH
      Thì nút "Xóa kho" bị vô hiệu hóa
      Khi tôi tích "wdel-ack"
      Thì nút "Xóa kho" được bật
      Khi tôi nhấn "Escape"
      Thì popup đóng lại

  Quy tắc: WH-07 – Ẩn SĐT kho & thủ kho (API · P1 · 4.2)
    Staff không thấy SĐT kho và SĐT người dùng.

    @WH-07 @TC-WH-07-01 @P1 @smoke
    Kịch bản: Staff không thấy SĐT kho và người dùng
      Cho Staff đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì mọi "warehouses[].phone" là null
      Và mọi "users[].phone" là null
      Và màn "Kho" không hiển thị SĐT

    @WH-07 @TC-WH-07-02 @P2 @smoke
    Kịch bản: Manager thấy SĐT kho và thủ kho
      Cho Manager đã đăng nhập
      Khi tôi gọi GET "/api/state"
      Thì "warehouses[].phone" có giá trị
