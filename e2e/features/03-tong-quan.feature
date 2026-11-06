# language: vi
@tong-quan
Tính năng: Tổng quan
  Thẻ KPI, biểu đồ mức tồn, khối Cần nhập bổ sung, khối Phiếu chờ duyệt.
  4 tính năng · 6 test case · Tham chiếu BR-09, BR-24, mục 8.

  Quy tắc: DASH-01 – Thẻ KPI (UI · P2)
    Giá trị tồn, tổng số lượng, phiếu chờ, cảnh báo; bấm để chuyển màn.

    @DASH-01 @TC-DASH-01-01 @P2 @after-reset
    Kịch bản: KPI ban đầu đúng dữ liệu mẫu
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Khi tôi mở màn "Tổng quan"
      Thì thẻ "Giá trị tồn" hiển thị "47,1 triệu đ"
      Và thẻ "Tổng tồn" hiển thị 792
      Và thẻ "Phiếu chờ" hiển thị 2
      Và thẻ "Cảnh báo" hiển thị 4

    @DASH-01 @TC-DASH-01-02 @P3 @smoke
    Khung kịch bản: Bấm thẻ KPI "<thẻ>" chuyển sang <màn hình>
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Tổng quan"
      Khi tôi bấm thẻ KPI "<thẻ>"
      Thì tôi sang màn "<màn hình>"

      Dữ liệu:
        | thẻ         | màn hình          |
        | Giá trị tồn | Báo cáo           |
        | Tổng tồn    | Tồn kho           |
        | Phiếu chờ   | Xuất/Nhập kho     |
        | Cảnh báo    | Cảnh báo tồn thấp |

  Quy tắc: DASH-02 – Biểu đồ mức tồn so với tối thiểu (UI · P3)
    Lọc theo kho, sắp xếp thiếu nhiều nhất trước.

    @DASH-02 @TC-DASH-02-01 @P3 @after-reset
    Kịch bản: Lọc biểu đồ mức tồn theo kho
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Tổng quan"
      Khi tôi bấm pill "Kho Hà Nội"
      Thì biểu đồ có 8 thanh
      Và thanh đầu tiên là mặt hàng có tỉ lệ tồn/min thấp nhất

  Quy tắc: DASH-03 – Khối Cần nhập bổ sung (UI · P2 · BR-24)
    Nút Nhập mở form phiếu nhập điền sẵn.

    @DASH-03 @TC-DASH-03-01 @P2 @after-reset
    Kịch bản: Nút Nhập ở khối Cần nhập bổ sung mở phiếu nhập điền sẵn
      Cho dữ liệu mẫu vừa được reset
      Và Staff đã đăng nhập
      Và tôi đang ở màn "Tổng quan"
      Khi tôi bấm "Nhập" trên dòng "Mực in laser đen" của Kho Hà Nội
      Thì tôi sang màn "Nhập kho" với kho "Kho Hà Nội" được chọn
      Và phiếu có dòng P04 với số lượng 14

  Quy tắc: DASH-04 – Khối Phiếu chờ duyệt (UI + API · P2 · BR-09)
    Manager/Admin duyệt ngay; Staff chỉ có nút Mở.

    @DASH-04 @TC-DASH-04-01 @P2 @regression
    Kịch bản: Manager duyệt phiếu ngay trên Tổng quan
      Cho fixture [TEST] đã được tạo
      Và Staff vừa lập 1 phiếu xuất T_PROD
      Và tôi ghi nhận số phiếu chờ hiện tại
      Khi Manager mở màn "Tổng quan" và bấm "Duyệt" ở phiếu đó
      Thì toast hiển thị "Đã duyệt …"
      Và số phiếu chờ giảm 1 so với trước khi duyệt

    @DASH-04 @TC-DASH-04-02 @P2 @smoke @seed-data
    Kịch bản: Staff không có nút Duyệt
      Cho Staff đã đăng nhập
      Khi tôi mở màn "Tổng quan"
      Thì khối "Phiếu chờ duyệt" chỉ có nút "Mở"
      Nhưng không có nút "Duyệt"
