# language: vi
@nhap-xuat-kho
Tính năng: Nhập/Xuất kho
  Lập phiếu nhập/xuất, xem trước, danh sách, duyệt (phiếu nhập của Quản lý kho / Admin duyệt ngay), từ chối, thao tác đồng thời.
  9 tính năng · 32 test case · Tham chiếu BR-05..BR-12, F1..F3, RISK-01..RISK-03, RISK-14.

  Quy tắc: RCPT-01 – Lập phiếu nhập (API · P1 · BR-05, BR-06, BR-08)
    Chọn NCC, kho active, hàng hóa; lưu ở trạng thái Chờ duyệt.

    @RCPT-01 @TC-RCPT-01-01 @P1 @regression
    Kịch bản: Lập phiếu nhập hợp lệ qua API
      Cho fixture [TEST] đã được tạo
      Và tôi đọc "seq.in" và tồn T_PROD tại HN từ "/api/state"
      Khi Staff gọi POST "/api/receipts" với:
        | type | partnerId | warehouseId | note   | lines        |
        | in   | T_SUP     | HN          | [TEST] | T_PROD × 10  |
      Thì mã phản hồi là 200
      Và code là "PN-" + seq.in (4 chữ số)
      Và status là "pending"
      Và tồn T_PROD tại HN không đổi

    @RCPT-01 @TC-RCPT-01-02 @P1 @regression
    Kịch bản: Lập phiếu nhập qua giao diện
      Cho fixture [TEST] đã được tạo
      Và Staff đã đăng nhập
      Khi tôi mở màn "Nhập kho"
      Và tôi chọn đối tác T_SUP và kho "Kho Hà Nội"
      Và tôi thêm hàng T_PROD
      Và tôi bấm "Lưu phiếu và gửi duyệt"
      Thì toast hiển thị "Đã tạo phiếu PN-… – đang chờ…"
      Và phiếu xuất hiện trong "#rc-list" với chip "Chờ duyệt"

    @RCPT-01 @TC-RCPT-01-03 @P1 @smoke
    Kịch bản: Phiếu không có dòng hàng
      Khi tôi gọi POST "/api/receipts" với lines rỗng
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Phiếu chưa có mặt hàng nào. Hãy chọn hàng hóa ở danh sách bên trái."

    @RCPT-01 @TC-RCPT-01-04 @P1 @smoke
    Khung kịch bản: Số lượng <qty> bị từ chối
      Khi tôi gọi POST "/api/receipts" với một dòng hàng có qty <qty>
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "phải là số nguyên lớn hơn 0."

      Dữ liệu:
        | qty |
        | 0   |
        | -3  |

    @RCPT-01 @TC-RCPT-01-05 @P2 @regression @risk
    Kịch bản: Số lượng thập phân 1.5 không được làm tròn
      Cho fixture [TEST] đã được tạo
      Khi tôi gọi POST "/api/receipts" với dòng T_PROD có qty 1.5
      Thì mã phản hồi là 400
      # Nếu được chấp nhận (làm tròn thành 1) ⇒ ghi bug RISK-14

    @RCPT-01 @TC-RCPT-01-06 @P2 @smoke @risk
    Khung kịch bản: Số lượng <qty> sai kiểu không gây lỗi 500
      Khi tôi gọi POST "/api/receipts" với một dòng hàng có qty <qty>
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Dữ liệu gửi lên không hợp lệ."

      Dữ liệu:
        | qty        |
        | 2147483648 |
        | "abc"      |

    @RCPT-01 @TC-RCPT-01-07 @P2 @smoke
    Kịch bản: Trùng mặt hàng trong phiếu
      Khi tôi gọi POST "/api/receipts" với lines "P01 × 1" và "P01 × 2"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Mặt hàng “Giấy in A4 70gsm” bị trùng trong phiếu."

    @RCPT-01 @TC-RCPT-01-08 @P2 @smoke
    Kịch bản: Đối tác sai loại
      Khi tôi gọi POST "/api/receipts" phiếu nhập với partnerId "KH-01"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Đối tác không phù hợp với loại phiếu."

    @RCPT-01 @TC-RCPT-01-09 @P2 @regression
    Kịch bản: Không lập phiếu vào kho đang tạm ngưng
      Cho fixture [TEST] đã được tạo
      Và T_WH đang tạm ngưng
      Khi tôi gọi POST "/api/receipts" phiếu nhập vào T_WH
      Thì mã phản hồi là 400
      Và thông báo lỗi là "<tên T_WH> đang tạm ngưng, không thể lập phiếu."

    @RCPT-01 @TC-RCPT-01-10 @P3 @smoke
    Kịch bản: Mã hàng không tồn tại
      Khi tôi gọi POST "/api/receipts" với lines "P99999 × 1"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Không tìm thấy hàng hóa P99999."

  Quy tắc: RCPT-02 – Lập phiếu xuất, kiểm tra tồn (API · P1 · BR-05, BR-06, BR-07)
    Số lượng ≤ tồn tại kho xuất.

    @RCPT-02 @TC-RCPT-02-01 @P1 @smoke
    Kịch bản: Phiếu xuất vượt tồn
      Cho tôi đọc tồn t của P06 tại HCM
      Khi Staff gọi POST "/api/receipts" phiếu xuất kho HCM với P06 × (t + 1)
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Không đủ tồn: “Bàn phím có dây” chỉ còn t Cái tại Kho TP.HCM."

    @RCPT-02 @TC-RCPT-02-02 @P2 @regression
    Kịch bản: Phiếu xuất đúng bằng tồn
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Staff gọi POST "/api/receipts" phiếu xuất kho HN với T_PROD × t
      Thì mã phản hồi là 200
      Và phiếu ở trạng thái "pending"
      # Dọn dẹp: từ chối phiếu này

  Quy tắc: RCPT-03 – Xem trước phiếu & cảnh báo dòng (UI · P3)
    Mã dự kiến, tồn trước → sau, vượt tồn / dưới min / hết cảnh báo.

    @RCPT-03 @TC-RCPT-03-01 @P3 @smoke
    Kịch bản: Cảnh báo trên từng dòng phiếu xuất (không lưu)
      Cho Staff đã đăng nhập
      Và tôi đang ở màn "Xuất kho"
      Và tôi chọn kho "Kho Hà Nội"
      Và tôi thêm hàng P04 và đọc tồn t
      Khi tôi nhập số lượng t + 1
      Thì dòng hiển thị chữ đỏ "Vượt tồn 1 Hộp"
      Khi tôi nhập số lượng 1
      Thì dòng hiển thị chữ cam "Sau xuất sẽ dưới mức tối thiểu" nếu t − 1 ≤ 10

    @RCPT-03 @TC-RCPT-03-02 @P3 @regression
    Kịch bản: Mã dự kiến trùng mã thật
      Cho fixture [TEST] đã được tạo
      Và Staff đang lập phiếu nhập T_PROD trên giao diện
      Khi tôi ghi lại mã dự kiến trên phiếu xem trước
      Và tôi lưu phiếu
      Thì toast hiển thị đúng mã dự kiến đó

  Quy tắc: RCPT-04 – Danh sách phiếu & lọc trạng thái (UI · P3)
    Thẻ số liệu và nút lọc Tất cả / Chờ / Đã duyệt / Từ chối.

    @RCPT-04 @TC-RCPT-04-01 @P3 @smoke @seed-data
    Kịch bản: Thẻ Phiếu chờ duyệt lọc danh sách
      Cho tôi đã đăng nhập
      Và tôi đang ở màn "Xuất kho"
      Khi tôi bấm thẻ "Phiếu chờ duyệt"
      Thì danh sách chỉ còn PX-0002 và có nhãn "Đang lọc"
      Khi tôi bấm lại thẻ "Phiếu chờ duyệt"
      Thì danh sách hiển thị đủ 2 phiếu

  Quy tắc: RCPT-05 – Duyệt phiếu nhập (API · P1 · BR-09, BR-11)
    Cộng tồn, ghi thẻ kho. Staff không được duyệt (403).

    @RCPT-05 @TC-RCPT-05-01 @P1 @regression
    Kịch bản: Duyệt phiếu nhập cộng tồn và ghi thẻ kho
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập phiếu nhập T_PROD × 20 vào HN
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager gọi POST "/api/receipts/{mã}/approve"
      Thì mã phản hồi là 200
      Và tồn T_PROD tại HN là t + 20
      Và thẻ kho có thêm 1 dòng tham chiếu mã phiếu

    @RCPT-05 @TC-RCPT-05-02 @P1 @smoke
    Kịch bản: Staff không duyệt được
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/receipts/PN-0002/approve"
      Thì mã phản hồi là 403

    @RCPT-05 @TC-RCPT-05-03 @P2 @regression
    Kịch bản: Admin duyệt phiếu do Staff lập
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập 1 phiếu T_PROD
      Khi Admin gọi POST approve phiếu đó
      Thì mã phản hồi là 200
      Và người duyệt là "Nguyễn Văn An"

  Quy tắc: RCPT-06 – Duyệt phiếu xuất (API · P1 · BR-09, BR-10, BR-11)
    Kiểm tra tồn lần 2, trừ tồn, trả danh sách hàng xuống mức thấp.

    @RCPT-06 @TC-RCPT-06-01 @P1 @regression
    Kịch bản: Duyệt phiếu xuất trừ tồn
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập phiếu xuất T_PROD × 5 tại HN
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager gọi POST approve phiếu đó
      Thì mã phản hồi là 200
      Và tồn T_PROD tại HN là t − 5
      Và danh sách "low" rỗng nếu t − 5 > 10

    @RCPT-06 @TC-RCPT-06-02 @P1 @regression
    Kịch bản: Duyệt xuất làm hàng xuống mức thấp (F1)
      Cho fixture [TEST] đã được tạo
      Và tồn t của T_PROD tại HN lớn hơn 10 (min 10)
      Và tôi đọc "low" từ "/api/public/summary"
      Khi Staff lập phiếu xuất HN với T_PROD × (t − 9)
      Và Manager duyệt phiếu đó
      Thì tồn T_PROD tại HN là 9
      Và danh sách "low" trả về chứa tên T_PROD
      Và "/api/public/summary" có "low" tăng 1

    @RCPT-06 @TC-RCPT-06-03 @P1 @regression
    Kịch bản: Kiểm tra tồn lần 2 khi duyệt (F3)
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Staff lập 2 phiếu xuất HN, mỗi phiếu T_PROD × t
      Và Manager duyệt phiếu 1
      Và Manager duyệt phiếu 2
      Thì phiếu 1 trả mã 200
      Và phiếu 2 trả mã 400 với thông báo chứa "chỉ còn 0" và "tại Kho Hà Nội"
      Và phiếu 2 vẫn ở trạng thái "pending"

    @RCPT-06 @TC-RCPT-06-04 @P2 @smoke
    Kịch bản: Duyệt lại phiếu đã xử lý
      Cho phiếu PX-0001 đã được duyệt
      Khi Manager gọi POST "/api/receipts/PX-0001/approve"
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Phiếu PX-0001 đã được xử lý trước đó."

  Quy tắc: RCPT-07 – Từ chối phiếu (API · P1 · BR-12)
    pending → cancelled, tồn không đổi.

    @RCPT-07 @TC-RCPT-07-01 @P1 @regression
    Kịch bản: Từ chối phiếu
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập phiếu xuất T_PROD × 1
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager gọi POST "/api/receipts/{mã}/reject"
      Thì mã phản hồi là 200
      Và status là "cancelled"
      Và tồn T_PROD tại HN vẫn là t
      Và thẻ kho không có dòng mới

    @RCPT-07 @TC-RCPT-07-02 @P1 @smoke
    Kịch bản: Staff không từ chối được
      Cho Staff đã đăng nhập
      Khi tôi gọi POST "/api/receipts/PN-0002/reject"
      Thì mã phản hồi là 403

  Quy tắc: RCPT-08 – Duyệt phiếu theo người lập (API + UI · P1 · BR-09, F2 – sửa 07/11/2026)
    Phiếu NHẬP do Quản lý kho / Admin lập được duyệt ngay khi lưu (cộng tồn, ghi thẻ kho).
    Phiếu của Nhân viên kho vẫn chờ Quản lý kho / Admin duyệt. Phiếu XUẤT: người lập ≠ người duyệt.

    @RCPT-08 @TC-RCPT-08-01 @P1 @regression
    Kịch bản: Phiếu nhập của Manager được duyệt ngay khi lập
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Manager lập phiếu nhập T_PROD × 3 vào HN
      Thì mã phản hồi là 200
      Và phiếu ở trạng thái "approved"
      Và người duyệt là "Trần Thị Bình"
      Và tồn T_PROD tại HN là t + 3
      Và thẻ kho có đúng 1 dòng cho phiếu đó

    @RCPT-08 @TC-RCPT-08-02 @P2 @regression
    Kịch bản: Giao diện của Manager nhập kho ngay, không chờ duyệt
      Cho fixture [TEST] đã được tạo
      Và Manager đang lập phiếu nhập T_PROD trên giao diện
      Thì nút lưu phiếu là "Lưu phiếu và nhập kho"
      Khi tôi lưu phiếu
      Thì toast vừa hiện có "Đã nhập kho phiếu PN-… Tồn kho đã được cộng thêm."
      Và dòng phiếu đó hiển thị "Duyệt: Trần Thị Bình"
      Nhưng không có nút "Duyệt"

    @RCPT-08 @TC-RCPT-08-03 @P2 @regression
    Kịch bản: Phiếu nhập của Admin cũng được duyệt ngay
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Khi Admin lập phiếu nhập T_PROD × 2 vào HN
      Thì mã phản hồi là 200
      Và phiếu ở trạng thái "approved"
      Và người duyệt là "Nguyễn Văn An"
      Và tồn T_PROD tại HN là t + 2

    @RCPT-08 @TC-RCPT-08-04 @P1 @regression
    Kịch bản: Manager vẫn duyệt được phiếu nhập của Staff
      Cho fixture [TEST] đã được tạo
      Và tôi đọc tồn t của T_PROD tại HN
      Và Staff đã lập 1 phiếu T_PROD
      Và phiếu ở trạng thái "pending"
      Khi Manager duyệt phiếu đó
      Thì mã phản hồi là 200
      Và tồn T_PROD tại HN là t + 1

    @RCPT-08 @TC-RCPT-08-05 @P1 @regression
    Kịch bản: Phiếu xuất của Manager vẫn phải chờ người khác duyệt
      Cho fixture [TEST] đã được tạo
      Và Manager đã lập 1 phiếu xuất T_PROD
      Và phiếu ở trạng thái "pending"
      Khi Manager gọi POST approve phiếu đó
      Thì mã phản hồi là 400
      Và thông báo lỗi là "Bạn không thể tự duyệt phiếu do chính mình lập."

  Quy tắc: RCPT-09 – An toàn khi thao tác đồng thời (API · P1 · RISK-01, RISK-02, RISK-03)
    Duyệt/tạo phiếu song song. Ảnh hưởng chung: báo nhóm → chạy → reset.

    @RCPT-09 @TC-RCPT-09-01 @P1 @exclusive @risk
    Kịch bản: Duyệt cùng một phiếu đồng thời
      Cho fixture [TEST] đã được tạo
      Và Staff đã lập phiếu xuất T_PROD × 1
      Và tôi đọc tồn t của T_PROD tại HN
      Khi tôi gửi song song 5 request approve phiếu đó từ 2 phiên Manager + Admin
      Thì đúng 1 request thành công
      Và tồn T_PROD tại HN là t − 1
      Và thẻ kho có đúng 1 dòng cho phiếu đó

    @RCPT-09 @TC-RCPT-09-02 @P1 @exclusive @risk
    Kịch bản: Tạo nhiều phiếu đồng thời
      Cho fixture [TEST] đã được tạo
      Khi Staff gửi song song 10 POST "/api/receipts" với T_PROD, note "[TEST]"
      Thì có 10 phiếu được tạo với mã khác nhau
      Và không có phản hồi 500

    @RCPT-09 @TC-RCPT-09-03 @P1 @exclusive @risk
    Kịch bản: Hai phiếu xuất cùng hàng duyệt song song
      Cho fixture [TEST] đã được tạo
      Và tồn T_PROD tại HN được đưa về 4 bằng kiểm kê
      Và có 2 phiếu xuất T_PROD × 3 đang chờ duyệt
      Khi Manager và Admin duyệt 2 phiếu song song
      Thì 1 phiếu thành công và 1 phiếu bị từ chối
      Và tồn T_PROD tại HN không âm
