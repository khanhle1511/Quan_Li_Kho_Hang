# Thay đổi nghiệp vụ so với đặc tả gốc

File này ghi những quy tắc đã đổi **sau** khi phát hành `QLKho_Dac_ta_kiem_thu_tu_dong` (PDF/DOCX) và `QLKho_Test_Tracker` (PDF/XLSX). Hai tài liệu gốc chưa được sửa, nên khi đọc chúng hãy đối chiếu với bảng dưới đây. Khi hai bên khác nhau, nội dung trong file này được ưu tiên.

## CR-01 – Phiếu nhập của Quản lý kho / Admin được duyệt ngay (07/11/2026)

| | Trước (đặc tả gốc BR-09, F2) | Sau |
| --- | --- | --- |
| Phiếu **nhập** do Quản lý kho / Admin lập | Lưu ở trạng thái Chờ duyệt, phải có **người khác** duyệt. Tự duyệt thì nhận 400 "Bạn không thể tự duyệt phiếu do chính mình lập." | **Duyệt ngay khi lưu**: trạng thái Đã duyệt, người duyệt là chính người lập, cộng tồn và ghi thẻ kho trong cùng transaction |
| Phiếu nhập do Nhân viên kho lập | Chờ Quản lý kho / Admin duyệt | Không đổi |
| Quản lý kho / Admin duyệt phiếu của Nhân viên kho | Được | Không đổi |
| Phiếu **xuất** (mọi vai trò) | Người lập ≠ người duyệt | Không đổi |

- **Người yêu cầu:** QA_QC, ngày 07/11/2026. Kết quả mong đợi theo lời người yêu cầu: "role quản lí kho và admin khi nhập kho không cần phải chờ duyệt, và vẫn được phép duyệt đơn nhập kho của nhân viên kho".
- **Phạm vi:** chỉ phiếu nhập. Phiếu xuất giữ quy tắc kiểm soát chéo vì làm giảm tồn. Nếu muốn áp dụng cả phiếu xuất, chỉ cần sửa `Rules.receiptAutoApproved`.
- **Rủi ro đã chấp nhận:** Quản lý kho / Admin tự tăng tồn mà không có người thứ hai kiểm tra. Có thể truy vết qua thẻ kho (người lập = người duyệt) và báo cáo.

### Thay đổi trong mã nguồn

| File | Thay đổi |
| --- | --- |
| `src/main/java/com/qlkho/common/Rules.java` | Thêm `receiptAutoApproved(role, type)`: `in` và (`admin` hoặc `manager`) |
| `src/main/java/com/qlkho/service/InventoryService.java` | `createReceipt`: phiếu thuộc diện trên lưu `approved` + `approverName`, gọi `applyStock` ngay. `approve()` dùng chung `applyStock`. Response lập phiếu có thêm `status` (và `type`, `low` khi duyệt ngay) |
| `src/main/resources/static/index.html` | Nút "Lưu phiếu và nhập kho" thay cho "Lưu phiếu và gửi duyệt" với Quản lý kho / Admin ở màn Nhập kho; toast "Đã nhập kho phiếu PN-xxxx. Tồn kho đã được cộng thêm." |

### Thay đổi trong bộ test

| Test | Trước | Sau |
| --- | --- | --- |
| RCPT-08 (`04-nhap-xuat-kho.feature`) | 3 TC "không tự duyệt" (Manager API, UI ẩn nút Duyệt, Admin API) | 5 TC: 08-01 phiếu nhập của Manager duyệt ngay (tồn t + 3, thẻ kho 1 dòng); 08-02 giao diện "Lưu phiếu và nhập kho", toast, dòng "Duyệt: …", không có nút Duyệt; 08-03 Admin duyệt ngay; 08-04 Manager duyệt phiếu của Staff; 08-05 phiếu **xuất** của Manager vẫn không tự duyệt (400) |
| Bước "Admin duyệt 1 phiếu nhập T_PROD × N vào HN" (TC-STK-02-06) | Manager lập, Admin duyệt | Staff lập, Admin duyệt |
| `SEL.rcSave` | "Lưu phiếu và gửi duyệt" | Nhận cả "Lưu phiếu và nhập kho" |

Kết quả chạy toàn bộ BDD sau thay đổi (agent1, CSDL mẫu, theo thứ tự @after-reset → @seed-data → còn lại → @exclusive → reset → ENV-01-04, 1 worker): **200 đạt, 0 lỗi, 3 bỏ qua** (ENV-01-01, ENV-01-02 cần bản online; AUTH-06-02 cần Render API). Smoke viết tay: 12/12 đạt.

### Việc còn lại

- Cập nhật BR-09, F2 trong `QLKho_Dac_ta_kiem_thu_tu_dong.docx` và RCPT-08 trong `QLKho_Test_Tracker.xlsx`, rồi xuất lại PDF.
