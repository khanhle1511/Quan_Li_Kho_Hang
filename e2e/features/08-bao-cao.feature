# language: vi
@bao-cao
Tính năng: Báo cáo
  Báo cáo nhập – xuất – tồn, biểu đồ, xuất Excel/PDF.
  3 tính năng · 5 test case · Tham chiếu mục 8, RISK-11.

  Quy tắc: REP-01 – Báo cáo nhập – xuất – tồn (UI · P2 · RISK-11)
    Tồn đầu, nhập, xuất, điều chỉnh, tồn cuối, giá trị; lọc kho.

    @REP-01 @TC-REP-01-01 @P2 @after-reset
    Kịch bản: Tổng báo cáo ban đầu
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở màn "Báo cáo" với "Tất cả kho"
      Thì dòng tổng có:
        | Tồn đầu | Nhập | Xuất | Điều chỉnh | Tồn cuối | Giá trị      |
        | 712     | +150 | −70  | 0          | 792      | 47.062.000 đ |

    @REP-01 @TC-REP-01-02 @P3 @after-reset
    Kịch bản: Báo cáo theo kho
      Cho dữ liệu mẫu vừa được reset
      Và tôi đã đăng nhập
      Và tôi đang ở màn "Báo cáo"
      Khi tôi chọn "Kho Hà Nội"
      Thì tồn cuối là 415

    @REP-01 @TC-REP-01-03 @P3 @smoke @risk
    Kịch bản: Tồn đầu kỳ không lọc theo tháng
      Khi tôi mở màn "Báo cáo"
      Thì nhãn kỳ cố định là "Tháng 11/2026"
      Và tồn đầu kỳ được tính từ toàn bộ thẻ kho
      # Hạn chế đã biết (RISK-11) – chỉ ghi nhận

  Quy tắc: REP-02 – Biểu đồ waterfall & theo danh mục (UI · P3)
    Hiển thị đúng số liệu tổng.

    @REP-02 @TC-REP-02-01 @P3 @after-reset
    Kịch bản: Biểu đồ waterfall khớp bảng
      Cho dữ liệu mẫu vừa được reset
      Khi tôi mở màn "Báo cáo"
      Thì nhãn 5 cột của biểu đồ waterfall bằng số trên dòng "Tổng cộng" của bảng

  Quy tắc: REP-03 – Xuất Excel / PDF (UI · P3 · RISK-11)
    Hiện chỉ là thông báo mô phỏng (hạn chế đã biết).

    @REP-03 @TC-REP-03-01 @P3 @smoke @risk
    Khung kịch bản: Bấm "<nút>" chỉ hiện thông báo mô phỏng
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Báo cáo"
      Khi tôi bấm "<nút>"
      Thì toast hiển thị "(mô phỏng…)"
      Và không có file nào được tải về

      Dữ liệu:
        | nút        |
        | Xuất Excel |
        | Xuất PDF   |
