# BDD – kịch bản Gherkin theo tính năng

Viết từ **QLKho_Test_Tracker.pdf** (66 tính năng · 172 test case). Đây mới là đặc tả hành vi; chưa có step definition.

## Cách tổ chức

- Mỗi module một file `.feature`, viết bằng Gherkin tiếng Việt (`# language: vi`).
- Mỗi **tính năng** (AUTH-01 … ENV-01) là một khối `Quy tắc:`. Tiêu đề ghi luôn kiểu kiểm soát, ưu tiên và tham chiếu BR/F/RISK.
- Mỗi **test case** là một `Kịch bản:`. Test case có nhiều bộ dữ liệu viết thành `Khung kịch bản:` + `Dữ liệu:`. Khi nhiều TC dùng chung các bước (ví dụ đăng nhập 3 vai trò), mỗi TC là một khối `Dữ liệu:` riêng, **tag TC ID đặt trên khối `Dữ liệu:`** để vẫn chạy/lọc được từng TC. Vì vậy có 165 kịch bản phủ đủ 172 TC ID (đã kiểm bằng parser `@cucumber/gherkin`: 0 lỗi, 0 mã trùng).

| File | Module | Tính năng | TC |
| --- | --- | --- | --- |
| 01-xac-thuc.feature | Xác thực | AUTH-01..07 | 17 |
| 02-bao-mat.feature | Bảo mật | SEC-01..03 | 6 |
| 03-tong-quan.feature | Tổng quan | DASH-01..04 | 6 |
| 04-nhap-xuat-kho.feature | Nhập/Xuất kho | RCPT-01..09 | 30 |
| 05-kiem-ke.feature | Kiểm kê | STK-01..04 | 12 |
| 06-ton-kho.feature | Tồn kho | INV-01..03 | 4 |
| 07-canh-bao.feature | Cảnh báo | ALT-01..03 | 4 |
| 08-bao-cao.feature | Báo cáo | REP-01..03 | 5 |
| 09-hang-hoa.feature | Hàng hóa | PRD-01..02 | 6 |
| 10-nha-cung-cap.feature | Nhà cung cấp | SUP-01..07 | 24 |
| 11-khach-hang.feature | Khách hàng | CUS-01..07 | 13 |
| 12-kho.feature | Kho | WH-01..07 | 19 |
| 13-nguoi-dung.feature | Người dùng | USR-01..06 | 20 |
| 14-moi-truong-online.feature | Môi trường online | ENV-01 | 6 |
| 15-lich-su-hoat-dong.feature | Lịch sử hoạt động của nhân viên (USR-07, bổ sung 07/11/2026 – spec/USR-07_testcases) | USR-07 | 10 |
| 16-so-phieu.feature | Sổ phiếu nhập/xuất & popup chi tiết (RCPT-10, bổ sung 07/11/2026 – spec/RCPT-10_testcases) | RCPT-10 | 15 |
| **Tổng** | | **68** | **202** |

## Tag

| Tag | Ý nghĩa |
| --- | --- |
| `@TC-XXX-NN-NN` | Mã test case trong tracker |
| `@XXX-NN` | Mã tính năng |
| `@P1` `@P2` `@P3` | Ưu tiên |
| `@smoke` | Đợt 1 – chỉ đọc, hoặc request bị máy chủ từ chối (400/401/403). Chạy bất kỳ lúc nào |
| `@after-reset` | Đợt 2 – kiểm tra đúng số liệu dữ liệu mẫu; chạy ngay sau reset CSDL, trước mọi thao tác ghi |
| `@regression` | Đợt 3 – chỉ ghi trên dữ liệu `[TEST]` tự tạo, so sánh trước/sau |
| `@exclusive` | Đợt 4 – ảnh hưởng người khác (restart, đồng thời, tạm ngưng kho thật). Báo nhóm → chạy → reset |
| `@risk` | Nghi vấn bug ở mục 11 đặc tả; được phép thất bại nhưng phải ghi bug vào `../bugs/` |
| `@seed-data` | Thêm vào một số `@smoke` tuy chỉ đọc nhưng **so với con số của dữ liệu mẫu** (ví dụ "2 dòng HN 6, HCM 14"). Sau khi chạy `@regression` trên cùng CSDL, các test này có thể lệch số mà không phải bug |
| `@xac-thuc`, `@kho`… | Tag module ở cấp `Tính năng` |

Theo quy trình hiện tại, chạy trên **local** trước; chỉ chạy trên bản online khi đã deploy theo yêu cầu.

## Bước dùng chung (để viết step definition sau)

Câu bước đã được chuẩn hóa để mỗi mẫu dưới đây ứng với **một** step definition:

| Bước | Ý nghĩa |
| --- | --- |
| `Cho dữ liệu mẫu vừa được reset` | CSDL ở trạng thái seed ban đầu (local: xóa CSDL H2 rồi khởi động lại) |
| `Cho fixture [TEST] đã được tạo` | Tạo trong `beforeAll`, xem bảng dưới |
| `Cho Admin/Manager/Staff đã đăng nhập` | Đăng nhập vai trò đó; tài khoản lấy từ biến môi trường. `Cho tôi đã đăng nhập` = vai trò bất kỳ (tracker ghi "Bất kỳ"), mặc định dùng Manager |
| `Cho tôi chưa đăng nhập` | Context mới, không cookie |
| `Và tôi đang ở màn "<tên>"` / `Khi tôi mở màn "<tên>"` | Bấm mục menu trái có tên tương ứng (`Kho` là màn danh sách kho) |
| `Khi tôi gọi <METHOD> "<đường dẫn>" …` | Gọi API bằng phiên của vai trò đang đăng nhập |
| `Khi Admin/Manager/Staff gọi <METHOD> …` | Dùng trong kịch bản nhiều vai trò: gọi API bằng phiên của vai trò được nêu (tự đăng nhập nếu chưa) |
| `Thì mã phản hồi là <n>` | Kiểm tra HTTP status |
| `Và thông báo lỗi là / bắt đầu bằng / chứa "…"` | Ba cách so trường `error` của JSON; không dùng cách khác |
| `<runId>`, `<tên T_WH>`, `<T_WH2>` trong câu bước | Giá trị động thay lúc chạy; không phải placeholder của `Khung kịch bản` |

**Fixture [TEST]** (mọi tên có tiền tố `[TEST]` + `runId` = chuỗi thời gian lúc chạy):

| Fixture | Nội dung |
| --- | --- |
| T_PROD | Hàng "[TEST] Sản phẩm <runId>", SKU `TST-<runId>`, min 10, giá 1.000; tồn ban đầu 50 tại Kho Hà Nội (Staff lập PN, Manager duyệt) |
| T_SUP / T_CUS | NCC / khách hàng [TEST] do Admin tạo, có SĐT và email |
| T_WH | Kho [TEST], mã `KHO-T<4 số>`; tạo ở trạng thái Tạm ngưng khi không cần active |
| T_WH2 | Kho [TEST] thứ hai, chỉ TC-WH-06-01 cần: đã tạm ngưng nhưng còn T_PROD × 5 (phải lập PN vào T_WH2 và duyệt khi kho còn active, rồi mới tạm ngưng) |
| T_USER2 | Tài khoản staff [TEST] thứ hai, chỉ TC-USR-04-03 cần, tạo ở tình trạng `draft` |
| T_USER | Tài khoản staff [TEST], SĐT `09` + 8 số ngẫu nhiên, mật khẩu `Test1234` |

**Không được** sửa, khóa hay xóa U1–U5, kho HN/HCM, đối tác và hàng hóa mẫu (trừ đợt `@exclusive`).
**Dọn dẹp** trong `afterAll`: tạm ngưng rồi xóa T_WH; khóa rồi xóa T_USER. Phiếu và đối tác [TEST] mất khi reset.

Tài khoản sau reset (mật khẩu `123456`): Admin 0901111111 · Manager 0902222222 · Staff 0903333333.

## Ghi chú khi đối chiếu với tracker

- Tracker ghi môi trường online là **Aiven MySQL**, nhưng bản deploy hiện dùng **Aiven PostgreSQL**. TC-ENV-01-05/06 vẫn giữ nội dung (file lớn, tiếng Việt + emoji) và áp dụng cho CSDL thực tế; đã bỏ chữ "MySQL" khỏi tiêu đề.
- Các thông báo lỗi lấy nguyên văn từ tracker. Khi viết step definition, nếu thông báo thật khác thì đối chiếu với đặc tả trước. Không sửa kịch bản cho khớp code; nếu code sai thì ghi bug.
- Vài TC tracker xếp "Chỉ đọc" nhưng ghi tải file "vào T_SUP" (TC-SUP-06-02/03). Kịch bản dùng NCC-01 vì request bị từ chối nên không ghi dữ liệu, không cần fixture.
- TC-ALT-02-01 trong tracker ghi tiền điều kiện "sau TC F1". Kịch bản tự đưa tồn T_PROD về ≤ 10 ngay trong test để không phụ thuộc thứ tự chạy.
- TC-AUTH-06-01 / TC-USR-04-03: giao diện **chuyển màn không gọi API**, nên để thấy 401 phải làm thao tác có gọi API (ví dụ lưu phiếu). Đã ghi rõ trong bước.
- TC-RCPT-09-03 cần tồn T_PROD tại HN đúng bằng 4: đưa về bằng kiểm kê (Manager) trước khi lập 2 phiếu xuất. Câu tiền điều kiện đã đổi thành "tồn T_PROD tại HN được đưa về 4 bằng kiểm kê" vì câu cũ trùng nguyên văn với câu kiểm tra "tồn T_PROD tại HN là …" ở TC khác.
- TC-STK-01-01: tracker ghi "8 dòng" = số mặt hàng của dữ liệu mẫu. Step so với số mặt hàng hiện có (bằng 8 trên dữ liệu mẫu) để không báo lỗi giả sau khi đợt regression đã thêm hàng [TEST].
- TC-STK-02-01: API trả `diff` = số **mặt hàng** lệch, không phải số lượng lệch. "diff là −1" được kiểm trên thẻ kho (dòng "Kiểm kê" −1).
- TC-WH-02-01: mã kho chỉ cho phép 2–10 ký tự sau "KHO-", nên `<runId>` trong mã được thay bằng 4 chữ số.
- TC-WH-05-02 (`@exclusive`): máy chủ kiểm "còn phiếu chờ" trước luật "còn ≥ 1 kho hoạt động", nên tiền điều kiện từ chối các phiếu chờ ở kho bị tạm ngưng (dữ liệu mẫu có 2 phiếu chờ ở HCM). Các kho được mở lại sau kịch bản, nhưng phiếu bị từ chối thì không khôi phục được → reset CSDL.

## Chạy (playwright-bdd)

Các file `.feature` được `playwright-bdd` 8.5.1 sinh thành test Playwright (thư mục `.features-gen/`, không commit). Step definition nằm ở `../steps/`:

| File | Nội dung |
| --- | --- |
| `steps/fixtures.ts` | Lớp `World`: phiên đăng nhập theo vai trò, gọi API, dữ liệu [TEST] (tạo khi gặp bước fixture, dọn sau kịch bản) |
| `steps/common.steps.ts` | Bước chung: đăng nhập, màn hình, gọi API, mã phản hồi, thông báo lỗi, toast |
| `steps/ui.steps.ts` | Bước giao diện chung: bảng/danh sách có N dòng, chọn pill, bấm thẻ lọc, tích ô, bấm nút |
| `steps/auth.steps.ts` | AUTH, SEC |
| `steps/overview.steps.ts` | DASH, INV, ALT, REP, PRD |
| `steps/receipts.steps.ts` | RCPT, STK |
| `steps/partners.steps.ts` | SUP, CUS |
| `steps/warehouses-users.steps.ts` | WH, USR |
| `steps/env.steps.ts` | ENV |

Selector giao diện tập trung ở `../helpers/selectors.ts` (có ghi số dòng trong `index.html`).

```bash
cd e2e
npm run bdd:after-reset   # ngay sau khi reset CSDL (local: xóa CSDL H2 rồi khởi động lại)
npm run bdd:smoke
npm run bdd:regression
npm run bdd:exclusive     # đổi dữ liệu dùng chung (từ chối phiếu chờ mẫu, tạm ngưng kho…) → reset CSDL sau khi chạy
npm run bdd               # tất cả
# Chạy một TC:  npx bddgen && npx playwright test --project=bdd --workers=1 --grep @TC-RCPT-06-03
```

Thứ tự nên chạy: `@after-reset` → `@smoke` → `@regression` → `@exclusive`. Riêng TC-ENV-01-04 (tạo 300 phiếu) cũng cần "ngay sau reset" nhưng làm lệch các test `@seed-data` → chạy riêng trên một lần reset khác, hoặc chạy cuối cùng. Bước "Cho dữ liệu mẫu vừa được reset" tự **bỏ qua** test (không báo lỗi) nếu CSDL không còn đúng số liệu mẫu.

Ghi chú khi viết step:
- Nhóm `(\d+)` trong regex được playwright-bdd đổi thành số → so với text phải dùng `String(n)`.
- Câu có `/` hoặc `( )` phải viết dạng regex (cucumber expression coi `/` là "hoặc", `( )` là tùy chọn).
- `<text>` trong SVG không có `innerText` → dùng `allTextContents()`.
- "tôi" mặc định là Manager khi kịch bản không nêu vai trò (tracker ghi "Bất kỳ").
