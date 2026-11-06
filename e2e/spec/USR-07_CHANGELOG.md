# USR-07 – Lịch sử hoạt động của nhân viên

**Phạm vi:** Quản trị viên bấm vào tên một tài khoản ở tab *Người dùng* để xem mọi thao tác của người đó trong quá khứ.

## 1. File thay đổi (`USR-07_code.zip`)

Giải nén rồi chép đè thư mục `qlkho-web/` vào repo. Đường dẫn trong zip giữ nguyên.

**Thêm mới (4)**

| File | Vai trò |
| --- | --- |
| `src/main/java/com/qlkho/model/ActivityLog.java` | Entity bảng `nhat_ky_hoat_dong` |
| `src/main/java/com/qlkho/repo/ActivityLogRepo.java` | Repository |
| `src/main/java/com/qlkho/service/ActivityService.java` | Ghi nhật ký, trả lịch sử theo người dùng, suy ra lịch sử cũ |
| `src/main/java/com/qlkho/service/ActivityBackfill.java` | Chạy lúc khởi động (sau DataSeeder): suy ra lịch sử cũ nếu bảng nhật ký còn trống |

**Sửa (11)**

| File | Thay đổi |
| --- | --- |
| `service/AuthService.java` | Ghi nhật ký đăng nhập thành công, sai mật khẩu, bị từ chối (khóa/nháp) |
| `service/DataSeeder.java` | Thêm `@Order(1)` để chạy trước ActivityBackfill |
| `service/UserService.java` | `update()` trả thêm trường `changes` (đổi SĐT / đặt lại mật khẩu) |
| `web/AuthController.java` | Ghi nhật ký đăng xuất |
| `web/InventoryController.java` | Ghi nhật ký lập, duyệt, từ chối phiếu; xác nhận kiểm kê |
| `web/CatalogController.java` | Ghi nhật ký hàng hóa, đối tác, ghi chú, hồ sơ PDF, kho |
| `web/UserController.java` | Ghi nhật ký quản trị tài khoản (ghi cả lên tài khoản bị tác động) + endpoint mới |
| `resources/static/index.html` | Tên trong bảng Người dùng bấm được; bảng trượt lịch sử (thống kê, lọc, tìm, dòng thời gian) |
| `README.md` | Thêm endpoint vào bảng API, cập nhật cấu trúc mã nguồn |
| `DEPLOY.md` | Bước 8: thêm `nhat_ky_hoat_dong` vào lệnh DROP |
| `docs/schema-mysql.sql` | Thêm bảng `nhat_ky_hoat_dong` |

*(Các file trong bảng nằm dưới `src/main/java/com/qlkho/` hoặc `src/main/`, trừ 3 file tài liệu.)*

## 2. API mới

| Phương thức | Đường dẫn | Quyền | Trả về |
| --- | --- | --- | --- |
| GET | `/api/users/{id}/activity` | Admin (khác: 403) | `{user, stats, items[], truncated}` – tối đa 500 dòng mới nhất |

- `stats` gồm: `total`, `lastLogin`, `receiptsCreated`, `receiptsDecided`, `failedLogins`, `byCategory`.
- `items[]` gồm: `id`, `at`, `category`, `action`, `targetType`, `targetId`, `detail`, `inferred`, `byOther`.

## 3. Thay đổi CSDL

**Bảng mới `nhat_ky_hoat_dong`**, do Hibernate tự tạo (`ddl-auto=update`), không cần chạy SQL tay:

| Cột | Ghi chú |
| --- | --- |
| `id` | Khóa chính, tự tăng |
| `user_id`, `user_name`, `user_role` | Người được ghi nhận |
| `category`, `action` | Nhóm và mã hành động |
| `target_type`, `target_id` | Đối tượng bị tác động |
| `detail`, `created_at`, `sort_key` | Nội dung và thời điểm |
| `inferred` | Dòng suy ra từ chứng từ cũ |
| `by_other` | Tên người khác đã thực hiện lên tài khoản này |
| Chỉ mục `idx_nk_user (user_id)` | Tăng tốc tra cứu theo người dùng |

Các bảng cũ không thay đổi.

**Mã hành động:** `LOGIN`, `LOGOUT`, `LOGIN_FAIL`, `LOGIN_BLOCKED`, `RECEIPT_CREATE`, `RECEIPT_APPROVE`, `RECEIPT_REJECT`, `STOCKTAKE_CONFIRM`, `PRODUCT_CREATE`, `PARTNER_CREATE`, `PARTNER_UPDATE`, `PARTNER_NOTE`, `FILE_UPLOAD`, `FILE_DELETE`, `USER_CREATE`, `USER_UPDATE`, `USER_STATUS`, `USER_DELETE`, `WH_CREATE`, `WH_UPDATE`, `WH_STATUS`, `WH_DELETE`.

## 4. Deploy

```bash
git add . && git commit -m "USR-07 Lịch sử hoạt động" && git push
```

- Render tự build lại (3–6 phút).
- Lần khởi động đầu, `ActivityBackfill` suy ra lịch sử từ phiếu, kiểm kê, hồ sơ và ghi chú đang có. Các dòng này có nhãn *"Suy ra từ chứng từ"*.
- Lịch sử đăng nhập chỉ có **từ lúc deploy** trở đi.
- Không cần reset CSDL.

**Kiểm tra nhanh sau deploy:**
1. Đăng nhập Staff và lập 1 phiếu.
2. Đăng nhập Admin, vào *Người dùng*, bấm tên Staff.
3. Thấy dòng *Đăng nhập* và *Lập phiếu …*, không có nhãn "Suy ra".

## 5. Test case (`USR-07_testcases.xlsx`)

- **Nội dung:** 1 tính năng (`USR-07`) và 10 test case (`TC-USR-07-01` → `TC-USR-07-10`).
- **Cách gộp:** dán nối vào cuối sheet *Features* và *Test Cases* của `QLKho_Test_Tracker.xlsx`. Thứ tự cột giống file gốc.

| Đợt | Số TC |
| --- | --- |
| 1 – Smoke | 5 |
| 2 – Sau reset | 1 |
| 3 – Regression | 4 |

## 6. Hạn chế đã biết

- **Lịch sử tài khoản đã xóa:** API trả 404 dù nhật ký vẫn còn (test `TC-USR-07-10`, mức Risk).
- **Thao tác chỉ ở trình duyệt không được ghi:** ví dụ mở phiên kiểm kê; chỉ lúc *xác nhận* mới ghi.
- **Lịch sử suy ra không chính xác tuyệt đối:** người duyệt được dò theo **tên**, nên hai tài khoản trùng tên có thể bị gán nhầm. Thời điểm duyệt lấy từ thẻ kho.
- **Chưa chạy trên Spring Boot thật:** backend chỉ mới biên dịch, nên hãy làm bước kiểm tra nhanh ở mục 4.
