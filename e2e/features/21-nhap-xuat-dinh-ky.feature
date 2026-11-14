# language: vi
@dinh-ky
Tính năng: Nhập/xuất định kỳ
  Kế hoạch (DK-0001…) theo tháng, quý hoặc năm tự lập phiếu nhập/xuất ở trạng thái chờ duyệt khi đến hạn; người lập là "Hệ thống".
  Số lượng cố định; điều chỉnh riêng được kỳ tới; bỏ qua kỳ, chạy ngay, tạm dừng/tiếp tục/kết thúc.
  Hệ thống kiểm tra kỳ đến hạn lúc khởi động, mỗi ngày một lần và khi có người đăng nhập; kỳ đã qua không được sinh bù.
  Bổ sung 14/11/2026. 4 tính năng · 31 test case · Tham chiếu README mục "Nhập/xuất định kỳ".
  Kế hoạch [TEST] dùng ngày bắt đầu 01/01/2030 (kỳ chưa đến hạn, không tự sinh phiếu) trừ kịch bản kiểm tra việc tự sinh,
  nơi ngày đến hạn đặt đúng hôm nay (giờ Việt Nam). Sau mỗi kịch bản, kế hoạch được kết thúc và phiếu còn chờ duyệt bị từ chối.
  Quản lý kho = "Manager" (kho HN); "Manager HCM" = kho TP.HCM.

  Quy tắc: PLAN-01 – Tạo, sửa và lịch của kế hoạch (API · P1)

    @PLAN-01 @TC-PLAN-01-01 @P1 @after-reset @seed-data
    Kịch bản: Dữ liệu mẫu có 2 kế hoạch bắt đầu từ 01/01/2027
      Chỉ đúng khi chạy trước ngày 01/01/2027 và chưa ai sửa hay chạy các kế hoạch mẫu.
      Cho dữ liệu mẫu vừa được reset
      Và kế hoạch mẫu "DK-0001"
      Thì kế hoạch vừa tạo có kỳ tới "2027-Q1" đến hạn "2027-01-05"
      Và số lượng cố định của kế hoạch vừa tạo là:
        | hàng | số lượng |
        | P01  | 100      |
        | P02  | 50       |
        | P03  | 80       |
      Cho kế hoạch mẫu "DK-0002"
      Thì kế hoạch vừa tạo có kỳ tới "2027-01" đến hạn "2027-01-10"
      Và kế hoạch vừa tạo ở trạng thái "active"

    @PLAN-01 @TC-PLAN-01-02 @P1 @regression
    Khung kịch bản: Kỳ tới và ngày đến hạn theo chu kỳ (<trường hợp>)
      Cho hàng hóa [TEST] đã được tạo
      Khi Manager gửi POST "/api/plans" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"<chu kỳ>","day":<ngày>,"monthInCycle":<tháng>,"startDate":"<bắt đầu>","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và kế hoạch vừa tạo có kỳ tới "<kỳ>" đến hạn "<đến hạn>"
      Và có đúng 0 phiếu sinh từ kế hoạch vừa tạo

      Dữ liệu:
        | trường hợp                        | chu kỳ  | ngày | tháng | bắt đầu    | kỳ      | đến hạn    |
        | tháng, ngày 10                    | month   | 10   | 1     | 2030-01-01 | 2030-01 | 2030-01-10 |
        | quý, ngày 5 của tháng thứ 2       | quarter | 5    | 2     | 2030-01-01 | 2030-Q1 | 2030-02-05 |
        | năm, ngày 15 tháng 6              | year    | 15   | 6     | 2030-01-01 | 2030    | 2030-06-15 |
        | quý, ngày 31 tháng thứ 2 (cuối tháng) | quarter | 31 | 2   | 2030-01-01 | 2030-Q1 | 2030-02-28 |
        | tháng, ngày 31 bắt đầu giữa tháng 2   | month   | 31 | 1   | 2030-02-15 | 2030-02 | 2030-02-28 |

    @PLAN-01 @TC-PLAN-01-03 @P1 @smoke
    Khung kịch bản: Dữ liệu kế hoạch không hợp lệ bị từ chối (<trường hợp>)
      Khi Admin gửi POST "/api/plans" với JSON:
        """
        {"type":"<loại>","partnerId":"<đối tác>","warehouseId":"HN","cycle":"<chu kỳ>","day":<ngày>,"monthInCycle":<tháng>,"startDate":"<bắt đầu>","endDate":"<kết thúc>","note":"","lines":<hàng>}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<thông báo>"

      Dữ liệu:
        | trường hợp                | loại | đối tác | chu kỳ  | ngày | tháng | bắt đầu    | kết thúc   | hàng                                                         | thông báo                 |
        | không có mặt hàng         | in   | NCC-01  | month   | 10   | 1     | 2030-01-01 |            | []                                                           | chưa có mặt hàng          |
        | trùng mặt hàng            | in   | NCC-01  | month   | 10   | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1},{"productId":"P01","qty":2}]    | bị trùng                  |
        | số lượng bằng 0           | in   | NCC-01  | month   | 10   | 1     | 2030-01-01 |            | [{"productId":"P01","qty":0}]                                | lớn hơn 0                 |
        | hàng hóa không tồn tại    | in   | NCC-01  | month   | 10   | 1     | 2030-01-01 |            | [{"productId":"P99","qty":1}]                                | Không tìm thấy hàng hóa   |
        | ngày bằng 0               | in   | NCC-01  | month   | 0    | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | từ 1 đến 31               |
        | ngày bằng 32              | in   | NCC-01  | month   | 32   | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | từ 1 đến 31               |
        | tháng 4 trong quý         | in   | NCC-01  | quarter | 5    | 4     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | Tháng trong chu kỳ        |
        | chu kỳ không hợp lệ       | in   | NCC-01  | week    | 5    | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | Chu kỳ không hợp lệ       |
        | kết thúc trước bắt đầu    | in   | NCC-01  | month   | 10   | 1     | 2030-01-01 | 2020-01-01 | [{"productId":"P01","qty":1}]                                | Ngày kết thúc             |
        | ngày bắt đầu sai          | in   | NCC-01  | month   | 10   | 1     | 2030-13-45 |            | [{"productId":"P01","qty":1}]                                | Ngày bắt đầu              |
        | phiếu nhập chọn khách hàng | in  | KH-01   | month   | 10   | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | không phù hợp             |
        | loại phiếu sai            | xyz  | NCC-01  | month   | 10   | 1     | 2030-01-01 |            | [{"productId":"P01","qty":1}]                                | Loại phiếu                |

    @PLAN-01 @TC-PLAN-01-04 @P1 @smoke
    Khung kịch bản: Không đủ quyền tạo kế hoạch (<vai trò> tại <kho>)
      Khi <vai trò> gửi POST "/api/plans" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"<kho>","cycle":"month","day":10,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"","lines":[{"productId":"P01","qty":1}]}
        """
      Thì mã phản hồi là 403

      Dữ liệu:
        | vai trò     | kho |
        | Staff       | HN  |
        | Staff HCM   | HCM |
        | Manager     | HCM |
        | Manager HCM | HN  |

    @PLAN-01 @TC-PLAN-01-05 @P1 @regression
    Khung kịch bản: Tạo kế hoạch cho kho được phân công (<vai trò> tại <kho>)
      Cho hàng hóa [TEST] đã được tạo
      Khi <vai trò> gửi POST "/api/plans" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"<kho>","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và trường "id" của phản hồi khớp "^DK-\d{4}$"
      Và kế hoạch vừa tạo ở trạng thái "active"

      Dữ liệu:
        | vai trò     | kho |
        | Manager     | HN  |
        | Manager HCM | HCM |
        | Admin       | DN  |

    @PLAN-01 @TC-PLAN-01-06 @P1 @regression
    Kịch bản: Kế hoạch chỉ hiện với Admin và người làm ở kho đó
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Admin với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì kế hoạch vừa tạo có trong state của Admin
      Và kế hoạch vừa tạo có trong state của Manager
      Và kế hoạch vừa tạo có trong state của Staff
      Và kế hoạch vừa tạo không có trong state của Manager HCM
      Và kế hoạch vừa tạo không có trong state của Staff HCM
      Và kế hoạch vừa tạo không có trong state của Manager DN

    @PLAN-01 @TC-PLAN-01-07 @P1 @regression
    Kịch bản: Sửa kế hoạch chỉ áp dụng cho kỳ sau, phiếu đã lập giữ nguyên
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST] ban đầu","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì có đúng 1 phiếu sinh từ kế hoạch vừa tạo
      Khi Manager gửi PUT "/api/plans/${planId}" với JSON:
        """
        {"type":"in","partnerId":"NCC-02","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST] đã sửa","lines":[{"productId":"${prod.id}","qty":8},{"productId":"P04","qty":3}]}
        """
      Thì mã phản hồi là 200
      Và số lượng cố định của kế hoạch vừa tạo là:
        | hàng        | số lượng |
        | ${prod.id}  | 8        |
        | P04         | 3        |
      Và có đúng 1 phiếu sinh từ kế hoạch vừa tạo
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường      | giá trị     |
        | partner     | NCC-01      |
        | lines.0.qty | 5           |

    @PLAN-01 @TC-PLAN-01-08 @P1 @regression
    Kịch bản: Tạm dừng, tiếp tục, kết thúc kế hoạch
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"khong-hop-le"}
        """
      Thì mã phản hồi là 400
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"paused"}
        """
      Thì mã phản hồi là 200
      Và kế hoạch vừa tạo ở trạng thái "paused"
      Khi Manager gửi POST "/api/plans/${planId}/run"
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "Hãy tiếp tục"
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"active"}
        """
      Thì kế hoạch vừa tạo ở trạng thái "active"
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"ended"}
        """
      Thì mã phản hồi là 200
      Và kế hoạch vừa tạo ở trạng thái "ended"
      Và kế hoạch vừa tạo không còn kỳ tới
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"active"}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "đã kết thúc"

  Quy tắc: PLAN-02 – Tự động lập phiếu khi đến hạn (API · P1)
    Phiếu tự sinh: chờ duyệt, người lập "Hệ thống", mỗi kỳ một phiếu, kỳ đã qua không sinh bù.

    @PLAN-02 @TC-PLAN-02-01 @P1 @regression
    Kịch bản: Kỳ hiện tại đến hạn hôm nay: lập ngay phiếu nhập chờ duyệt do "Hệ thống" lập
      Cho hàng hóa [TEST] đã được tạo
      Khi Manager gửi POST "/api/plans" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST] ghi chú kế hoạch","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và kế hoạch vừa tạo có 1 kỳ đã lập phiếu
      Và kỳ xử lý mới nhất của kế hoạch vừa tạo có lý do bắt đầu bằng "Tự động theo lịch"
      Và có đúng 1 phiếu sinh từ kế hoạch vừa tạo
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường       | giá trị                  |
        | status       | pending                  |
        | type         | in                       |
        | creator      | Hệ thống                 |
        | creatorId    | null                     |
        | masked       | false                    |
        | wh           | HN                       |
        | partner      | NCC-01                   |
        | lines.0.pid  | ${prod.id}               |
        | lines.0.qty  | 5                        |
        | recurringRef | ${planId} / ${period}    |
      Và ghi chú của phiếu định kỳ mới nhất chứa "Phiếu định kỳ ${planId}"
      Và ghi chú của phiếu định kỳ mới nhất chứa "[TEST] ghi chú kế hoạch"
      Và tồn của hàng hóa [TEST] tại kho "HN" là 0

    @PLAN-02 @TC-PLAN-02-02 @P1 @regression
    Kịch bản: Đăng nhập lại hoặc chạy lại không sinh trùng phiếu của cùng một kỳ
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi có người đăng nhập lại
      Và có người đăng nhập lại
      Và Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"active"}
        """
      Thì có đúng 1 phiếu sinh từ kế hoạch vừa tạo
      Và kế hoạch vừa tạo có 1 kỳ đã lập phiếu

    @PLAN-02 @TC-PLAN-02-03 @P1 @regression
    Kịch bản: Ngày đến hạn của kỳ hiện tại trước ngày bắt đầu thì không lập phiếu
      Cho hàng hóa [TEST] đã được tạo
      Khi Manager gửi POST "/api/plans" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${tomorrow}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và có đúng 0 phiếu sinh từ kế hoạch vừa tạo
      Và kế hoạch vừa tạo có 0 kỳ đã lập phiếu

    @PLAN-02 @TC-PLAN-02-04 @P1 @regression
    Kịch bản: Kỳ chưa đến hạn thì không lập phiếu
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi có người đăng nhập lại
      Thì có đúng 0 phiếu sinh từ kế hoạch vừa tạo
      Và kế hoạch vừa tạo có 0 kỳ đã lập phiếu

    @PLAN-02 @TC-PLAN-02-05 @P1 @regression
    Kịch bản: Duyệt phiếu định kỳ: Quản lý đúng kho duyệt được, tồn kho được cộng
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Staff gửi POST "/api/receipts/${planReceipt}/approve"
      Thì mã phản hồi là 403
      Khi Manager HCM gửi POST "/api/receipts/${planReceipt}/approve"
      Thì mã phản hồi là 403
      Và thông báo lỗi chứa "kho mình làm việc"
      Khi Manager gửi POST "/api/receipts/${planReceipt}/approve"
      Thì mã phản hồi là 200
      Và tồn của hàng hóa [TEST] tại kho "HN" là 5

    @PLAN-02 @TC-PLAN-02-06 @P1 @regression
    Kịch bản: Từ chối phiếu định kỳ không đổi tồn và kỳ đó không bị lập lại
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi POST "/api/receipts/${planReceipt}/reject"
      Thì mã phản hồi là 200
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường | giá trị   |
        | status | cancelled |
      Và tồn của hàng hóa [TEST] tại kho "HN" là 0
      Khi có người đăng nhập lại
      Thì có đúng 1 phiếu sinh từ kế hoạch vừa tạo

    @PLAN-02 @TC-PLAN-02-07 @P1 @regression
    Kịch bản: Phiếu xuất định kỳ thiếu hàng vẫn được lập kèm cảnh báo; duyệt bị chặn
      Cho hàng hóa [TEST] đã được tạo
      Khi Manager HCM gửi POST "/api/plans" với JSON:
        """
        {"type":"out","partnerId":"KH-01","warehouseId":"HCM","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường | giá trị  |
        | status | pending  |
        | type   | out      |
        | creator | Hệ thống |
      Và ghi chú của phiếu định kỳ mới nhất chứa "CẢNH BÁO THIẾU HÀNG"
      Và ghi chú của phiếu định kỳ mới nhất chứa "cần 5, còn 0"
      Khi Manager HCM gửi POST "/api/receipts/${planReceipt}/approve"
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "Không thể duyệt"
      Khi Manager HCM gửi POST "/api/receipts/${planReceipt}/reject"
      Thì mã phản hồi là 200

    @PLAN-02 @TC-PLAN-02-08 @P1 @regression
    Kịch bản: Phiếu xuất định kỳ đủ hàng không có cảnh báo và duyệt được, tồn bị trừ
      Cho hàng hóa [TEST] đã được tạo
      Và hàng hóa [TEST] đang có tồn 10 tại kho "HCM"
      Khi Manager HCM gửi POST "/api/plans" với JSON:
        """
        {"type":"out","partnerId":"KH-01","warehouseId":"HCM","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì ghi chú của phiếu định kỳ mới nhất không chứa "CẢNH BÁO THIẾU HÀNG"
      Khi Manager HCM gửi POST "/api/receipts/${planReceipt}/approve"
      Thì mã phản hồi là 200
      Và tồn của hàng hóa [TEST] tại kho "HCM" là 5

    @PLAN-02 @TC-PLAN-02-09 @P1 @regression
    Kịch bản: Tạm dừng thì không lập phiếu, tiếp tục thì lập phiếu của kỳ hiện tại
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${tomorrow}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"paused"}
        """
      Và Manager gửi PUT "/api/plans/${planId}" với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"month","day":${day},"monthInCycle":1,"startDate":"${monthStart}","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Thì mã phản hồi là 200
      Và có đúng 0 phiếu sinh từ kế hoạch vừa tạo
      Khi Manager gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"active"}
        """
      Thì có đúng 1 phiếu sinh từ kế hoạch vừa tạo
      Và kế hoạch vừa tạo có 1 kỳ đã lập phiếu

  Quy tắc: PLAN-03 – Quản lý kỳ tới: chạy ngay, điều chỉnh riêng, bỏ qua (API · P1)

    @PLAN-03 @TC-PLAN-03-01 @P1 @regression
    Kịch bản: Chạy ngay lập phiếu cho kỳ tới và dời sang kỳ sau
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi POST "/api/plans/${planId}/run"
      Thì mã phản hồi là 200
      Và trường "period" của phản hồi là "2030-Q1"
      Và trường "receipt" của phản hồi khớp "^PN-\d{4}$"
      Và kế hoạch vừa tạo có 1 kỳ đã lập phiếu
      Và kỳ xử lý mới nhất của kế hoạch vừa tạo có lý do bắt đầu bằng "Chạy ngay"
      Và kế hoạch vừa tạo có kỳ tới "2030-Q2" đến hạn "2030-04-05"
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường       | giá trị                |
        | status       | pending                |
        | creator      | Hệ thống               |
        | recurringRef | ${planId} / 2030-Q1    |

    @PLAN-03 @TC-PLAN-03-02 @P1 @regression
    Kịch bản: Điều chỉnh riêng kỳ tới không đổi kế hoạch gốc và có hiệu lực khi chạy
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi PUT "/api/plans/${planId}/next" với JSON:
        """
        {"lines":[{"productId":"${prod.id}","qty":7},{"productId":"P04","qty":3}]}
        """
      Thì mã phản hồi là 200
      Và trường "period" của phản hồi là "2030-Q1"
      Và số lượng cố định của kế hoạch vừa tạo là:
        | hàng        | số lượng |
        | ${prod.id}  | 5        |
      Và kỳ tới của kế hoạch vừa tạo có điều chỉnh riêng:
        | hàng        | số lượng |
        | ${prod.id}  | 7        |
        | P04         | 3        |
      Khi Manager gửi POST "/api/plans/${planId}/run"
      Thì mã phản hồi là 200
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường      | giá trị     |
        | lines.0.pid | ${prod.id}  |
        | lines.0.qty | 7           |
        | lines.1.pid | P04         |
        | lines.1.qty | 3           |
      Và kỳ tới của kế hoạch vừa tạo không có điều chỉnh riêng
      Và số lượng cố định của kế hoạch vừa tạo là:
        | hàng        | số lượng |
        | ${prod.id}  | 5        |

    @PLAN-03 @TC-PLAN-03-03 @P2 @regression
    Kịch bản: Bỏ điều chỉnh riêng đưa kỳ tới về số lượng của kế hoạch
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi PUT "/api/plans/${planId}/next" với JSON:
        """
        {"lines":[{"productId":"${prod.id}","qty":9}]}
        """
      Thì kỳ tới của kế hoạch vừa tạo có điều chỉnh riêng:
        | hàng        | số lượng |
        | ${prod.id}  | 9        |
      Khi Manager gửi DELETE "/api/plans/${planId}/next"
      Thì mã phản hồi là 200
      Và kỳ tới của kế hoạch vừa tạo không có điều chỉnh riêng

    @PLAN-03 @TC-PLAN-03-04 @P1 @regression
    Kịch bản: Bỏ qua kỳ tới: ghi lịch sử, không lập phiếu, dời sang kỳ sau
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi POST "/api/plans/${planId}/skip"
      Thì mã phản hồi là 200
      Và trường "period" của phản hồi là "2030-Q1"
      Và kế hoạch vừa tạo có 1 kỳ bỏ qua
      Và kỳ xử lý mới nhất của kế hoạch vừa tạo có lý do bắt đầu bằng "Bỏ qua theo yêu cầu"
      Và có đúng 0 phiếu sinh từ kế hoạch vừa tạo
      Và kế hoạch vừa tạo có kỳ tới "2030-Q2" đến hạn "2030-04-05"

    @PLAN-03 @TC-PLAN-03-05 @P1 @regression
    Khung kịch bản: Người không đủ quyền không điều chỉnh, bỏ qua, chạy ngay hay đổi trạng thái được (<vai trò>)
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Admin với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi <vai trò> gửi PUT "/api/plans/${planId}/next" với JSON:
        """
        {"lines":[{"productId":"${prod.id}","qty":1}]}
        """
      Thì mã phản hồi là 403
      Khi <vai trò> gửi DELETE "/api/plans/${planId}/next"
      Thì mã phản hồi là 403
      Khi <vai trò> gửi POST "/api/plans/${planId}/skip"
      Thì mã phản hồi là 403
      Khi <vai trò> gửi POST "/api/plans/${planId}/run"
      Thì mã phản hồi là 403
      Khi <vai trò> gửi PUT "/api/plans/${planId}/status" với JSON:
        """
        {"status":"paused"}
        """
      Thì mã phản hồi là 403
      Và kế hoạch vừa tạo ở trạng thái "active"
      Và có đúng 0 phiếu sinh từ kế hoạch vừa tạo

      Dữ liệu:
        | vai trò     |
        | Staff       |
        | Manager HCM |

    @PLAN-03 @TC-PLAN-03-06 @P2 @regression
    Khung kịch bản: Điều chỉnh kỳ tới không hợp lệ bị từ chối (<trường hợp>)
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi PUT "/api/plans/${planId}/next" với JSON:
        """
        {"lines":<hàng>}
        """
      Thì mã phản hồi là 400
      Và thông báo lỗi chứa "<thông báo>"
      Và kỳ tới của kế hoạch vừa tạo không có điều chỉnh riêng

      Dữ liệu:
        | trường hợp        | hàng                                                      | thông báo         |
        | không có hàng     | []                                                        | chưa có mặt hàng  |
        | trùng mặt hàng    | [{"productId":"P01","qty":1},{"productId":"P01","qty":2}] | bị trùng          |
        | số lượng bằng 0   | [{"productId":"P01","qty":0}]                             | lớn hơn 0         |

    @PLAN-03 @TC-PLAN-03-07 @P1 @regression
    Kịch bản: Thao tác trên kế hoạch được ghi vào nhật ký hoạt động
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Manager với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Khi Manager gửi POST "/api/plans/${planId}/run"
      Thì mã phản hồi là 200
      Và nhật ký hoạt động của tài khoản "U2" có hành động "PLAN_CREATE" chứa "${planId}"
      Và nhật ký hoạt động của tài khoản "U2" có hành động "PLAN_RUN" chứa "${planId}"

  Quy tắc: PLAN-04 – Giao diện nhập/xuất định kỳ (UI · P1)

    @PLAN-04 @TC-PLAN-04-01 @P1 @smoke @seed-data
    Kịch bản: Nhân viên kho chỉ xem kế hoạch của kho mình
      Cho Staff đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Thì danh sách kế hoạch có "DK-0001" và không có "DK-0002"
      Và không có nút "+ Tạo kế hoạch" và không có nút "Sửa"
      Khi tôi mở chi tiết kế hoạch "DK-0001"
      Thì chi tiết kế hoạch hiển thị "Hằng quý"
      Và chi tiết kế hoạch không có nút hành động nào

    @PLAN-04 @TC-PLAN-04-02 @P1 @smoke @seed-data
    Kịch bản: Quản lý kho chỉ thấy kế hoạch kho mình và có nút tạo kế hoạch
      Cho Manager HCM đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Thì danh sách kế hoạch có "DK-0002" và không có "DK-0001"
      Và có nút "+ Tạo kế hoạch"

    @PLAN-04 @TC-PLAN-04-03 @P1 @regression
    Kịch bản: Quản lý kho tạo kế hoạch bằng form, phiếu "Hệ thống" xuất hiện ở sổ phiếu
      Cho hàng hóa [TEST] đã được tạo
      Và Manager đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Và tôi ấn nút "+ Tạo kế hoạch"
      Và tôi đặt kế hoạch theo tháng vào ngày hôm nay, bắt đầu từ đầu tháng
      Thì gợi ý lịch của form nêu ngày hôm nay hằng tháng
      Khi tôi thêm hàng hóa "[TEST]" với số lượng 12 vào form
      Và tôi nhập ghi chú kế hoạch "[TEST] tạo từ giao diện"
      Và tôi lưu kế hoạch
      Thì toast hiển thị "Đã tạo kế hoạch"
      Và chi tiết kế hoạch hiển thị "Đã lập phiếu"
      Và chi tiết kế hoạch hiển thị "Tự động theo lịch"
      Và chi tiết kế hoạch hiển thị "Hằng tháng, ngày ${day}"
      Khi tôi chuyển sang màn "Phiếu nhập/xuất"
      Thì sổ phiếu có dòng "Định kỳ" của kế hoạch vừa tạo do "Hệ thống" lập
      Khi tôi mở phiếu định kỳ mới nhất của kế hoạch vừa tạo
      Thì popup phiếu có nhãn "Định kỳ" của kế hoạch vừa tạo và người lập "Hệ thống"

    @PLAN-04 @TC-PLAN-04-04 @P2 @smoke
    Kịch bản: Form kế hoạch báo lỗi khi chưa có mặt hàng
      Cho Manager đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Và tôi ấn nút "+ Tạo kế hoạch"
      Và tôi lưu kế hoạch
      Thì form kế hoạch báo lỗi chứa "chưa có mặt hàng"

    @PLAN-04 @TC-PLAN-04-05 @P1 @regression
    Kịch bản: Điều chỉnh kỳ tới, chạy ngay rồi bỏ qua kỳ sau trên giao diện
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Admin với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Và Manager đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Và tôi mở chi tiết kế hoạch vừa tạo
      Và tôi điều chỉnh kỳ tới: thêm hàng hóa "P04" với số lượng 99 rồi lưu
      Thì toast hiển thị "Đã điều chỉnh riêng"
      Và chi tiết kế hoạch hiển thị "Đã điều chỉnh riêng"
      Khi tôi đợi thông báo cũ biến mất
      Và tôi bấm "Chạy ngay" ở chi tiết kế hoạch
      Thì toast hiển thị "(chờ duyệt)"
      Và kế hoạch vừa tạo có 1 kỳ đã lập phiếu
      Và phiếu định kỳ mới nhất của kế hoạch vừa tạo có:
        | trường      | giá trị |
        | lines.1.pid | P04     |
        | lines.1.qty | 99      |
      Khi tôi đợi thông báo cũ biến mất
      Và tôi bấm "Bỏ qua kỳ này" ở chi tiết kế hoạch
      Thì toast hiển thị "Đã bỏ qua"
      Và kế hoạch vừa tạo có 1 kỳ bỏ qua

    @PLAN-04 @TC-PLAN-04-06 @P1 @regression
    Kịch bản: Tạm dừng, tiếp tục và kết thúc kế hoạch trên giao diện
      Cho hàng hóa [TEST] đã được tạo
      Và kế hoạch định kỳ [TEST] đã được tạo bởi Admin với JSON:
        """
        {"type":"in","partnerId":"NCC-01","warehouseId":"HN","cycle":"quarter","day":5,"monthInCycle":1,"startDate":"2030-01-01","endDate":"","note":"[TEST]","lines":[{"productId":"${prod.id}","qty":5}]}
        """
      Và Manager đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Và tôi mở chi tiết kế hoạch vừa tạo
      Và tôi bấm "Tạm dừng" ở chi tiết kế hoạch
      Thì toast hiển thị "tạm dừng"
      Và kế hoạch vừa tạo ở trạng thái "paused"
      Khi tôi đợi thông báo cũ biến mất
      Và tôi bấm "Tiếp tục" ở chi tiết kế hoạch
      Thì kế hoạch vừa tạo ở trạng thái "active"
      Khi tôi đợi thông báo cũ biến mất
      Và tôi bấm "Kết thúc" ở chi tiết kế hoạch
      Thì kế hoạch vừa tạo ở trạng thái "ended"
      Và dòng của kế hoạch vừa tạo hiển thị "Đã kết thúc" và không có nút "Sửa"

    @PLAN-04 @TC-PLAN-04-07 @P2 @regression
    Kịch bản: Tổng quan nhắc kế hoạch sắp đến hạn trong 3 ngày
      Kịch bản bỏ qua khi hôm nay + 2 ngày vượt ngày 28 của tháng.
      Cho hàng hóa [TEST] đã được tạo
      Và Manager đã đăng nhập
      Khi tôi mở màn "Nhập/xuất định kỳ"
      Và tôi ấn nút "+ Tạo kế hoạch"
      Và tôi đặt kế hoạch theo tháng vào ngày hôm nay cộng 2, bắt đầu từ đầu tháng
      Và tôi thêm hàng hóa "[TEST]" với số lượng 4 vào form
      Và tôi lưu kế hoạch
      Thì toast hiển thị "Đã tạo kế hoạch"
      Khi tôi chuyển sang màn "Tổng quan"
      Thì Tổng quan có thẻ "Sắp đến kỳ nhập/xuất" nêu kế hoạch vừa tạo "còn 2 ngày"
