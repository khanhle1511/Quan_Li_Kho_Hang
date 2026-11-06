# language: vi
@ton-kho
Tính năng: Tồn kho
  Tra cứu & lọc tồn, thẻ kho, mở tồn kho từ tab Kho.
  3 tính năng · 4 test case.

  Quy tắc: INV-01 – Tra cứu & lọc tồn (UI · P2)
    Tìm theo tên/SKU/danh mục, lọc kho, chỉ tồn thấp.

    @INV-01 @TC-INV-01-01 @P2 @after-reset
    Kịch bản: Lọc theo kho và chỉ tồn thấp
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Tồn kho"
      Khi tôi chọn "Kho TP.HCM"
      Thì bảng có 8 dòng
      Khi tôi tích "Chỉ hiện tồn thấp"
      Thì bảng có 2 dòng là P01 và P06

    @INV-01 @TC-INV-01-02 @P3 @smoke @seed-data
    Kịch bản: Tìm theo SKU
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Tồn kho"
      Khi tôi nhập "SP-0004" vào ô "inv-q"
      Thì bảng có 2 dòng: HN tồn 6 và HCM tồn 14

  Quy tắc: INV-02 – Thẻ kho (UI · P2)
    Tồn từng kho, tổng nhập/xuất, dòng thời gian biến động.

    @INV-02 @TC-INV-02-01 @P2 @after-reset
    Kịch bản: Thẻ kho Giấy in A4
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Tồn kho"
      Khi tôi bấm "Thẻ kho" ở dòng P01
      Thì tổng nhập là +100 và tổng xuất là −30
      Và dòng thời gian có 2 dòng PX-0001 và PN-0001

  Quy tắc: INV-03 – Mở từ tab Kho (UI · P3)
    Bấm tên kho → Tồn kho lọc sẵn + dải thông báo.

    @INV-03 @TC-INV-03-01 @P3 @smoke
    Kịch bản: Mở tồn kho từ tab Kho
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Kho"
      Khi tôi bấm tên "Kho TP.HCM"
      Thì tôi sang màn "Tồn kho" với pill "Kho TP.HCM" đang chọn
      Và dải thông báo hiển thị "Đang xem tồn kho của Kho TP.HCM"
      Và nút quay lại đưa tôi về màn "Kho"
