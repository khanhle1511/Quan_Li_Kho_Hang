# language: vi
@sua-hang-hoa
Tính năng: Quản trị viên sửa hàng hóa
  Admin sửa mã SKU, tên, danh mục, đơn vị tính và tồn tối thiểu của hàng hóa; tồn kho và chứng từ giữ nguyên.
  Quản lý kho và Nhân viên kho không sửa được. Bổ sung 13/11/2026. 1 tính năng · 9 test case.
  Hàng hóa [TEST] do kịch bản tự tạo (hàng hóa không xóa được nên mỗi lần chạy dùng SKU riêng TST-<runId>).

  Quy tắc: PRD-03 – Admin sửa hàng hóa (API + UI · P1)

    @PRD-03 @TC-PRD-03-01 @P1 @regression
    Kịch bản: Admin sửa hàng hóa, tồn kho giữ nguyên
      Cho hàng hóa [TEST] đã được tạo
      Và hàng hóa [TEST] đang có tồn 40 tại kho "HN"
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"${prod.sku}","name":"[TEST] Đã sửa ${runId}","category":"[TEST] Danh mục mới","unit":"Hộp","minStock":9}
        """
      Thì mã phản hồi là 200
      Và hàng hóa [TEST] trong state có:
        | trường | giá trị                 |
        | name   | [TEST] Đã sửa ${runId}  |
        | cat    | [TEST] Danh mục mới     |
        | unit   | Hộp                     |
        | min    | 9                       |
      Và tồn của hàng hóa [TEST] tại kho "HN" là 40

    @PRD-03 @TC-PRD-03-02 @P1 @regression
    Kịch bản: Đổi mã SKU sang mã chưa dùng; giữ nguyên mã SKU cũ vẫn lưu được
      Cho hàng hóa [TEST] đã được tạo
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"${prod.sku}","name":"${prod.name}","category":"[TEST]","unit":"Cái","minStock":7}
        """
      Thì mã phản hồi là 200
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"TSX-${runId}","name":"${prod.name}","category":"[TEST]","unit":"Cái","minStock":7}
        """
      Thì mã phản hồi là 200
      Và hàng hóa [TEST] trong state có:
        | trường | giá trị        |
        | sku    | TSX-${runId}   |

    @PRD-03 @TC-PRD-03-03 @P1 @smoke
    Khung kịch bản: Mã SKU trùng với hàng hóa khác bị từ chối (<SKU>)
      Cho hàng hóa [TEST] đã được tạo
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"<SKU>","name":"${prod.name}","category":"[TEST]","unit":"Cái","minStock":5}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "đã tồn tại"

      Dữ liệu:
        | SKU      |
        | SP-0001  |
        | sp-0002  |

    @PRD-03 @TC-PRD-03-04 @P2 @smoke
    Khung kịch bản: Dữ liệu sửa không hợp lệ bị từ chối (<trường hợp>)
      Cho hàng hóa [TEST] đã được tạo
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"<sku>","name":"<tên>","category":"[TEST]","unit":"<đvt>","minStock":<tối thiểu>}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<thông báo>"

      Dữ liệu:
        | trường hợp        | sku           | tên       | đvt | tối thiểu | thông báo                      |
        | tên trống         | TST-X${runId} |           | Cái | 5         | Vui lòng nhập Mã SKU           |
        | đơn vị trống      | TST-X${runId} | Tên hợp lệ |     | 5         | Vui lòng nhập Mã SKU           |
        | SKU trống         |               | Tên hợp lệ | Cái | 5         | Vui lòng nhập Mã SKU           |
        | tồn tối thiểu âm  | TST-X${runId} | Tên hợp lệ | Cái | -1        | Tồn tối thiểu phải là số       |
        | thiếu tồn tối thiểu | TST-X${runId} | Tên hợp lệ | Cái | null      | Tồn tối thiểu phải là số       |

    @PRD-03 @TC-PRD-03-05 @P2 @smoke
    Kịch bản: Sửa hàng hóa không tồn tại
      Khi Admin gửi PUT "/api/products/P99" với JSON:
        """
        {"sku":"TST-KHONG-CO","name":"Không có","category":"[TEST]","unit":"Cái","minStock":1}
        """
      Thì mã phản hồi là 404

    @PRD-03 @TC-PRD-03-06 @P1 @smoke
    Khung kịch bản: Chỉ Admin được sửa hàng hóa (<vai trò>)
      Khi <vai trò> gửi PUT "/api/products/P01" với JSON:
        """
        {"sku":"SP-0001","name":"Bị sửa trái phép","category":"Văn phòng phẩm","unit":"Ram","minStock":1}
        """
      Thì mã phản hồi là 403

      Dữ liệu:
        | vai trò     |
        | Manager     |
        | Staff       |
        | Manager HCM |

    @PRD-03 @TC-PRD-03-07 @P1 @regression
    Kịch bản: Sửa hàng hóa được ghi vào nhật ký của Admin
      Cho hàng hóa [TEST] đã được tạo
      Khi Admin gửi PUT "/api/products/${prod.id}" với JSON:
        """
        {"sku":"${prod.sku}","name":"[TEST] Nhật ký ${runId}","category":"[TEST]","unit":"Cái","minStock":6}
        """
      Thì mã phản hồi là 200
      Và nhật ký hoạt động của tài khoản "U1" có hành động "PRODUCT_UPDATE" chứa "${prod.sku}"

    @PRD-03 @TC-PRD-03-08 @P1 @regression
    Kịch bản: Giao diện: Admin sửa hàng hóa từ bảng danh mục
      Cho hàng hóa [TEST] đã được tạo
      Và Admin đã đăng nhập
      Khi tôi mở màn "Hàng hóa"
      Thì bảng hàng hóa có nút "Sửa" ở mọi dòng
      Khi tôi tìm hàng hóa [TEST] và bấm "Sửa" ở dòng đó
      Thì form "Sửa hàng hóa" hiện ra với mã SKU và tên của hàng hóa [TEST]
      Khi tôi đổi tên thành "[TEST] Giao diện <runId>" và tồn tối thiểu thành 120 rồi lưu
      Thì toast hiển thị "Đã cập nhật hàng hóa"
      Và dòng hàng hóa [TEST] hiển thị tên mới và tối thiểu 120

    @PRD-03 @TC-PRD-03-09 @P1 @smoke
    Khung kịch bản: Giao diện: <vai trò> không thấy nút Sửa hàng hóa
      Cho <vai trò> đã đăng nhập
      Khi tôi mở màn "Hàng hóa"
      Thì bảng hàng hóa không có nút "Sửa"

      Dữ liệu:
        | vai trò |
        | Manager |
        | Staff   |
