# E2E – kiểm thử tự động (Playwright)

Bộ test giao diện + API cho `qlkho-web`, viết theo **spec/QLKho_Dac_ta_kiem_thu_tu_dong.pdf** và **spec/QLKho_Test_Tracker.pdf**.

## Cài đặt (một lần)

```bash
cd e2e
npm install
npx playwright install chromium     # bỏ qua nếu máy đã có Chromium của Playwright
```

Cần Node.js 18+ (máy hiện có Node 22).

## Chạy

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run test:smoke` | Bộ smoke chỉ đọc (`@smoke`) trên bản local: sức khỏe, đăng nhập 3 vai trò, bảng phân quyền 4.2, quyền xem PDF, mở 12 màn hình |
| `npm run test:online` | Cùng bộ `@smoke` nhưng chạy trên bản online https://qlkho-web.onrender.com. **Chỉ chạy khi được yêu cầu, sau khi đã deploy.** |
| `npm test` | Toàn bộ test trong `tests/` |
| `npm run test:headed` | Mở trình duyệt thật để xem |
| `npm run test:ui` | Giao diện Playwright để chạy từng test, xem từng bước |
| `npm run report` | Mở báo cáo HTML của lần chạy gần nhất (`output/report`) |

### Quên mật khẩu (AUTH-08) – cần Mailpit

Các test `@AUTH-08` đọc mã OTP từ hộp thư **Mailpit** (máy chủ SMTP giả, có REST API). Không có Mailpit thì các test cần đọc mail tự bỏ qua.

```bash
# 1. Mailpit (tải bản Windows/macOS/Linux ở github.com/axllent/mailpit/releases); --enable-chaos để test trường hợp gửi mail lỗi
mailpit --smtp 127.0.0.1:1025 --listen 127.0.0.1:8025 --enable-chaos      # hộp thư: http://localhost:8025
# 2. Máy chủ: mặc định đã gửi qua SMTP localhost:1025. Rút ngắn thời hạn để test hết hạn / gửi lại không phải chờ lâu
RESET_OTP_TTL_SECONDS=20 RESET_TOKEN_TTL_SECONDS=20 RESET_RESEND_COOLDOWN_SECONDS=3 mvn spring-boot:run > app.log
# 3. Test (APP_LOG để chạy TC-AUTH-08-19: log không chứa OTP/token)
BASE_URL=http://localhost:8080 APP_LOG=../app.log npx bddgen && npx playwright test --project=bdd --workers=1 --grep @AUTH-08
```

Mỗi kịch bản gửi yêu cầu từ một IP giả riêng (`X-Forwarded-For`) nên không chạm giới hạn 20 lần/giờ/IP của kịch bản khác. Đổi địa chỉ Mailpit bằng `MAILPIT_URL`.

### Nhiều agent cùng lúc

Mỗi agent có app riêng (`node agents/agents.mjs start`, cổng 8101, 8102…). Đặt `AGENT=agentN` thì test tự trỏ tới cổng của agent đó và ghi kết quả, báo cáo vào `output/agentN/`. Xem [../agents/README.md](../agents/README.md).

### Chạy song song + báo cáo Allure

Số worker chỉnh trong **`config-worker.ts`** (mặc định `4`; nhận số hoặc phần trăm CPU như `'50%'`). Ghi đè tạm cho một lần chạy: biến môi trường `WORKERS=6` hoặc `--workers=6` (dòng lệnh thắng biến môi trường, biến môi trường thắng file). Khi `WORKERS` > 1, project `bdd` chia việc theo **từng kịch bản** chứ không theo file, nên dùng hết số worker.

```bash
# Git Bash: 4 worker, toàn bộ BDD (hoặc thêm đường dẫn / --grep để chọn phạm vi)
BASE_URL=http://localhost:8099 WORKERS=4 npm run bdd:allure
BASE_URL=http://localhost:8099 WORKERS=4 npm run bdd:allure -- .features-gen/features/01-xac-thuc .features-gen/features/02-bao-mat
npm run allure:generate     # output/allure-results → output/allure-report
npm run allure:open         # mở báo cáo trên trình duyệt (cần server, không mở thẳng file index.html)
# PowerShell
$env:BASE_URL="http://localhost:8099"; $env:WORKERS="4"; npm run bdd:allure
```

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run bdd:allure` | Xóa kết quả Allure cũ, sinh test BDD, chạy project `bdd` với `WORKERS` worker |
| `npm run test:allure` | Như trên cho test viết tay trong `tests/` |
| `npm run allure:generate` | Sinh báo cáo HTML vào `output/allure-report` |
| `npm run allure:open` | Mở báo cáo đã sinh |

Báo cáo Allure có tổng quan đạt/lỗi/bỏ qua, cây Feature → Quy tắc → Kịch bản, từng bước Gherkin, ảnh lỗi, video, trace Playwright. Mục Metadata ghi `BASE_URL` và số worker.

**Không chạy song song** các nhóm `@exclusive`, `@after-reset`, `@seed-data` và kịch bản ENV-01-04, vì chúng kiểm tra số liệu toàn cục (tổng tồn, số phiếu chờ…) nên sẽ đụng nhau. Nhóm `@smoke`/`@regression` còn lại tự tạo dữ liệu `[TEST]` riêng, chạy song song được. Allure dùng bản `allure-playwright@3.3.3`, bản cuối còn hỗ trợ Playwright 1.50.1.

Quy trình: **phát triển và kiểm thử trên local trước**, chỉ đẩy lên GitHub/Render khi được yêu cầu, rồi mới chạy `test:online`.

Mặc định test chạy trên bản local **http://localhost:8080**, nên phải khởi động ứng dụng trước (`mvn spring-boot:run` ở thư mục gốc). `global-setup.ts` đợi tối đa 2 phút cho máy chủ sẵn sàng. Muốn chạy trên địa chỉ khác thì đặt biến môi trường:

```bash
# Git Bash / macOS / Linux
BASE_URL=http://localhost:8099 npm run test:smoke
# PowerShell
$env:BASE_URL="http://localhost:8099"; npm run test:smoke
```

Tài khoản demo lấy từ biến `ADMIN_PHONE/ADMIN_PASS`, `MANAGER_PHONE/MANAGER_PASS`, `STAFF_PHONE/STAFF_PASS` (mặc định = dữ liệu mẫu). Trên bản online nếu đã đổi mật khẩu Admin thì đặt `ADMIN_PASS`.

## Quy ước

- **Trên bản online chỉ chạy `@smoke`.** Các luồng ghi dữ liệu (F1–F10), đồng thời, khóa/xóa tài khoản, tạm ngưng/xóa kho chỉ chạy local hoặc trên CSDL riêng (đặc tả mục 2.7). Dữ liệu test tạo ra đặt tiền tố `[TEST]` hoặc ghi chú `auto-test`.
- Test cho các nghi vấn ở mục 11 đặt tên bắt đầu bằng `risk_` và được phép thất bại, nhưng phải kèm báo cáo bug trong `bugs/`.
- Khi test thất bại do hành vi của code, **không sửa test cho khớp**; ghi bug theo mẫu `bugs/TEMPLATE.md`.

## Cấu trúc

```
e2e/
├── config-worker.ts       số worker chạy song song (sửa ở đây)
├── playwright.config.ts   baseURL: BASE_URL > test:online > localhost:8080; 1 worker khi chạy online
├── global-setup.ts        đánh thức máy chủ (Render ngủ sau 15 phút)
├── features/            kịch bản BDD (Gherkin tiếng Việt) theo QLKho_Test_Tracker + USR-07 + RCPT-10 + AUTH-08: 69 tính năng, 223 TC – xem features/README.md
├── steps/               step definition cho features/ (playwright-bdd) – npm run bdd, bdd:smoke, bdd:after-reset, bdd:regression, bdd:exclusive
├── helpers/app.ts         tài khoản, gotoLogin / uiLogin / nav / toast / apiLogin
├── helpers/selectors.ts   toàn bộ selector giao diện đã tra từ index.html (dùng lại, không tra lại)
├── helpers/mailpit.ts     đọc hộp thư Mailpit: chờ mail, lấy mã OTP, bật/tắt lỗi SMTP giả (AUTH-08)
├── tests/
│   └── smoke.spec.ts      bộ @smoke (thêm các file *.spec.ts khác vào đây: flows.spec.ts, risk.spec.ts…)
├── fixtures/              test.pdf (PDF hợp lệ tối giản), fake.pdf (file text đổi đuôi)
├── spec/                  đặc tả kiểm thử tự động (PDF, DOCX) + QLKho_Test_Tracker (PDF, XLSX)
├── bugs/                  theo dõi bug: BUGS.md, TEMPLATE.md, open/, closed/, known-limitations.md
├── qa/                    báo cáo kiểm thử khám phá (walkthrough F1–F10 ngày 07/11/2026: ảnh, kết quả, kịch bản node)
├── scripts/smoke-api.sh   smoke API bằng curl, chạy từ thư mục gốc: BASE=http://localhost:8099 ./e2e/scripts/smoke-api.sh
└── output/                báo cáo, trace, ảnh khi test lỗi (không commit)
```

Kịch bản node thuần đã dùng để đi qua F1–F10 lần đầu (không phải test runner) được lưu làm tham khảo ở
`qa/walkthrough-2026-11-07/scripts/`. Khi viết `flows.spec.ts`, lấy selector và thứ tự bước từ đó.

## Những điểm cần biết khi viết test cho giao diện này

Rút ra từ lần đi qua toàn bộ luồng ngày 07/11/2026 (xem `qa/walkthrough-2026-11-07/`):

1. **Trang chủ**: form đăng nhập đã nằm sẵn trong DOM (bị `inert`) phía sau trang chủ. Phải bấm nút Đăng nhập rồi **đợi `#home` biến mất** (hiệu ứng 640 ms) trước khi điền. Form điền sẵn tài khoản manager, nên luôn ghi đè cả hai ô.
2. **Toast** `.toast` tồn tại 4,2 giây. Trước mỗi thao tác sinh toast mới phải đợi toast cũ biến mất (`waitToastGone`), nếu không sẽ đọc nhầm thông báo của bước trước.
3. **Giao diện vẽ lại toàn bộ** sau mỗi thao tác. Luôn truy vấn lại locator, không giữ ElementHandle. `data-c` là chỉ số handler, không ổn định, không dùng làm selector.
4. **Chuyển màn hình không gọi API.** Muốn kiểm tra giao diện phản ứng với 401 (tài khoản bị khóa, máy chủ khởi động lại) phải làm một thao tác có gọi API, ví dụ lưu phiếu.
5. **Xóa file PDF** dùng `window.confirm` → cần `page.on('dialog', d => d.accept())`. Xóa tài khoản/kho dùng hộp thoại `.dialog` với checkbox `del-ack` / `wdel-ack` và nút "Xóa tài khoản" / "Xóa kho". Các nút xóa có `aria-label="Xóa …"`.
6. Chọn đối tác/kho khi lập phiếu: `.optcard:has-text("…")`. Chọn hàng: `.pick:has-text("…")`. Ô số lượng: `rc-qty-{in|out}-{i}`. Danh sách phiếu: `#rc-list .trow`.
7. Phiên kiểm kê chỉ nằm trong bộ nhớ trang: đăng xuất rồi đăng nhập lại **cùng tab** thì vẫn còn, tải lại trang thì mất.
