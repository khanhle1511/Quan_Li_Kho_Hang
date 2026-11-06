# language: vi
@hang-hoa
Tính năng: Hàng hóa
  Xem, tìm và thêm hàng hóa.
  2 tính năng · 6 test case · Tham chiếu BR-14.

  Quy tắc: PRD-01 – Xem & tìm hàng hóa (UI · P3)
    Danh sách, tổng tồn, tìm kiếm.

    @PRD-01 @TC-PRD-01-01 @P3 @smoke @seed-data
    Kịch bản: Tìm hàng hóa theo danh mục
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Hàng hóa"
      Khi tôi nhập "Văn phòng phẩm" vào ô "pr-q"
      Thì bảng có 3 dòng

  Quy tắc: PRD-02 – Thêm hàng hóa (API + UI · P1 · BR-14)
    SKU duy nhất, ĐVT, min, giá vốn. Staff không được thêm (403).

    @PRD-02 @TC-PRD-02-01 @P1 @regression
    Kịch bản: Thêm hàng hóa hợp lệ
      Cho Manager đã đăng nhập
      Và "/api/public/summary" có "low" = L và số kho active = K
      Khi Manager gọi POST "/api/products" với:
        | sku          | name            | category | unit | minStock | price |
        | TST-<runId>  | [TEST] Băng keo |          | Cuộn | 10       | 15000 |
      Thì mã phản hồi là 200
      Và id có dạng "P.."
      Và category là "Khác"
      Và "low" là L + K

    @PRD-02 @TC-PRD-02-02 @P1 @smoke
    Kịch bản: Staff không thêm được hàng hóa
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/products"
      Thì mã phản hồi là 403
      Và màn "Hàng hóa" không có nút "+ Thêm hàng hóa"

    @PRD-02 @TC-PRD-02-03 @P2 @smoke
    Kịch bản: SKU trùng (khác hoa thường)
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/products" với sku "sp-0001"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Mã SKU “sp-0001” đã tồn tại."

    @PRD-02 @TC-PRD-02-04 @P2 @smoke
    Khung kịch bản: Thiếu <trường>
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/products" với <trường> bỏ trống
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Vui lòng nhập Mã SKU, Tên hàng hóa và Đơn vị tính."

      Dữ liệu:
        | trường |
        | sku    |
        | name   |
        | unit   |

    @PRD-02 @TC-PRD-02-05 @P2 @smoke
    Khung kịch bản: <trường> âm
      Cho Manager đã đăng nhập
      Khi tôi gọi POST "/api/products" với <trường> = -1
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<thông báo>"

      Dữ liệu:
        | trường   | thông báo                            |
        | minStock | Tồn tối thiểu phải là số nguyên ≥ 0. |
        | price    | Giá vốn không hợp lệ.                |
