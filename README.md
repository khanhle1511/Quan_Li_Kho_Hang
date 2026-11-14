# Hệ thống quản lý kho – ứng dụng web chạy local

Đồ án môn **Phân tích và Thiết kế Yêu cầu**.

- **Backend:** Java 25 + Spring Boot 3 (REST API, JPA/Hibernate).
- **CSDL:** H2 lưu thành file (mặc định, không cần cài), hoặc MySQL / PostgreSQL.
- **Giao diện:** trang web một file, được Spring Boot phục vụ tại `http://localhost:8080`.

## 1. Cần cài trước

| Phần mềm                                | Ghi chú                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| **JDK 25**                              | Temurin, Oracle JDK hoặc OpenJDK đều được. Kiểm tra bằng `java -version` |
| **Maven 3.9+** _hoặc_ **IntelliJ IDEA** | IntelliJ (bản Community cũng được) có sẵn Maven nên không cần cài riêng  |
| Trình duyệt                             | Chrome, Edge hoặc Firefox                                                |

Lần chạy đầu tiên Maven sẽ tải thư viện từ Internet (khoảng 1–3 phút). Các lần sau chạy offline được.

## 2. Chạy ứng dụng

**Cách A – IntelliJ IDEA (dễ nhất)**

1. _File → Open_ → chọn thư mục `qlkho-web` (thư mục chứa `pom.xml`) → _Trust Project_.
2. Chờ IntelliJ tải thư viện (thanh tiến trình góc dưới).
3. Mở `src/main/java/com/qlkho/QlkhoApplication.java` → bấm nút ▶ cạnh `main`.
4. Mở trình duyệt: **http://localhost:8080**

**Cách B – dòng lệnh**

```bash
cd qlkho-web
mvn spring-boot:run        # hoặc chạy run.bat (Windows) / ./run.sh (macOS, Linux)
```

Mở **http://localhost:8080**. Dừng bằng `Ctrl + C`.

**Cách C – đóng gói thành 1 file .jar để demo**

```bash
mvn clean package
java -jar target/qlkho-web-1.0.0.jar
```

**Cách D – nhiều instance cho nhiều agent làm việc cùng lúc**

```bash
node agents/agents.mjs start      # agent1..agent4 ở cổng 8101..8104, mỗi instance một CSDL riêng
node agents/agents.mjs status
```

Xem chi tiết ở [agents/README.md](agents/README.md).

## 3. Tài khoản demo (mật khẩu: `123456`)

| Vai trò                              | Số điện thoại |
| ------------------------------------ | ------------- |
| Quản trị viên                        | 0901 111 111  |
| Quản lý kho                          | 0902 222 222  |
| Nhân viên kho                        | 0903 333 333  |
| Nhân viên kho (đã khóa)              | 0904 444 444  |
| Nhân viên kho (nháp, chưa kích hoạt) | 0905 555 555  |

Dữ liệu mẫu (8 mặt hàng, 2 kho, 3 nhà cung cấp, 3 khách hàng, 4 phiếu, 4 hồ sơ PDF) được tạo tự động **ở lần chạy đầu tiên**.

## 4. Dữ liệu được lưu ở đâu?

| Thư mục                             | Nội dung                                                     |
| ----------------------------------- | ------------------------------------------------------------ |
| `data/qlkho.mv.db`                  | CSDL H2, giữ nguyên sau khi tắt ứng dụng                     |
| (trong CSDL, bảng `ho_so_noi_dung`) | Nội dung các file hồ sơ PDF, nên không mất khi deploy online |

**Muốn làm lại từ đầu với dữ liệu mẫu:** tắt ứng dụng, xóa thư mục `data`, rồi chạy lại.

**Xem dữ liệu trong bảng:** mở http://localhost:8080/h2-console

- JDBC URL: `jdbc:h2:file:./data/qlkho;AUTO_SERVER=TRUE`
- User: `sa`, mật khẩu để trống.

## 5. Chạy với MySQL (tùy chọn)

1. Cài MySQL 8 và tạo user (hoặc dùng `root`).
2. Sửa `username` / `password` trong `src/main/resources/application-mysql.properties`.
3. Chạy với profile `mysql`:
   ```bash
   mvn spring-boot:run -Dspring-boot.run.profiles=mysql
   ```
   Trong IntelliJ: _Edit Configurations → Active profiles_ = `mysql`.

CSDL `qlkho` và các bảng được tạo tự động. Lược đồ đầy đủ (dùng cho báo cáo) nằm ở `docs/schema-mysql.sql`.

## 6. Cấu trúc mã nguồn

```
qlkho-web/
├── pom.xml
├── docs/
│   ├── schema-mysql.sql           Lược đồ CSDL (bảng, khóa chính/ngoại, ràng buộc)
│   └── AUTH-08_quen-mat-khau.md   Đặc tả quên mật khẩu, đặt lại bằng OTP qua email
├── agents/                        Chạy nhiều instance local (mỗi agent một cổng + CSDL), xem agents/README.md
├── e2e/                           Mọi thứ phục vụ QA/QC và kiểm thử (xem e2e/README.md)
│   ├── spec/                      Đặc tả kiểm thử tự động, test tracker (PDF, DOCX, XLSX)
│   ├── features/ + steps/         Kịch bản BDD và step definition (playwright-bdd)
│   ├── tests/                     Test Playwright viết tay (@smoke)
│   ├── bugs/                      Ghi nhận và theo dõi bug
│   ├── qa/                        Báo cáo kiểm thử thủ công/khám phá: ảnh chụp, kết quả từng bước
│   └── scripts/smoke-api.sh       Smoke test API bằng curl (BASE=... để đổi địa chỉ)
├── src/test/resources/            Cấu hình profile test cho Spring (phải ở đây theo quy ước Maven)
└── src/main/
    ├── java/com/qlkho/
    │   ├── QlkhoApplication.java  Điểm khởi động
    │   ├── config/                AppConfig (BCrypt, @Async, @Scheduled), ResetProperties (app.reset.*), MailProperties (app.mail.*)
    │   ├── model/                 20 lớp @Entity ↔ 20 bảng (gồm ActivityLog – nhật ký hoạt động, PasswordReset – yêu cầu đặt lại mật khẩu, ReportLog/ReportFile – lịch sử báo cáo, RecurringPlan/Line/Override/Run – nhập/xuất định kỳ)
    │   ├── repo/                  Spring Data JPA repository (truy vấn đếm, lấy mã… để không tải cả bảng)
    │   ├── service/               Nghiệp vụ
    │   │   ├── AuthService        UC01 Đăng nhập, kiểm tra quyền (requireAdmin / requireManager)
    │   │   ├── InventoryService   UC02–UC05 Lập phiếu, duyệt, kiểm kê
    │   │   ├── CatalogService     Hàng hóa, đối tác, hồ sơ PDF, kho
    │   │   ├── UserService        Quản lý tài khoản
    │   │   ├── PasswordResetService  AUTH-08: quên mật khẩu (gửi mã, kiểm tra mã, đặt mật khẩu mới); ResetCodes sinh OTP/token
    │   │   ├── mail/              Gửi mail: MailGateway (SMTP | Brevo | log), MailTemplates, PasswordResetMailer (@Async)
    │   │   ├── ActivityService    USR-07: ghi và tra cứu lịch sử hoạt động; ActivityBackfill suy ra lịch sử cũ lúc khởi động
    │   │   ├── RecurringService   Nhập/xuất định kỳ: kế hoạch theo tháng/quý/năm, tự lập phiếu chờ duyệt khi đến hạn
│   │   ├── RecurringScheduler Kích hoạt sinh phiếu định kỳ lúc khởi động và mỗi ngày một lần
│   │   ├── StateService       Gom dữ liệu cho giao diện, ẩn liên hệ theo vai trò
    │   │   └── DataSeeder         Dữ liệu mẫu lần chạy đầu
    │   ├── web/                   REST controller + DTO (record)
    │   └── common/                Rules (hằng số vai trò/trạng thái, regex, sinh mã), PasswordPolicy, ApiException, TooManyRequestsException, ApiErrors, FixedWindowLimiter, PdfMaker
    └── resources/
        ├── application.properties         Cấu hình H2 (mặc định)
        ├── application-mysql.properties   Cấu hình MySQL trên máy
        ├── application-prod.properties    Cấu hình khi deploy online (đọc biến môi trường)
        └── static/index.html              Giao diện
```

## 7. REST API

| Phương thức         | Đường dẫn                             | Quyền                     | Chức năng                                               |
| ------------------- | ------------------------------------- | ------------------------- | ------------------------------------------------------- |
| POST                | `/api/auth/login`                     | Mọi người                 | Đăng nhập bằng SĐT + mật khẩu                           |
| POST                | `/api/auth/logout`                    | Đã đăng nhập              | Đăng xuất                                               |
| POST                | `/api/auth/forgot`                    | Mọi người                 | Quên mật khẩu B1: gửi mã OTP tới email của tài khoản; luôn trả cùng một phản hồi (AUTH-08) |
| POST                | `/api/auth/forgot/verify`             | Mọi người                 | B2: kiểm tra mã OTP, trả reset token dùng một lần       |
| POST                | `/api/auth/forgot/reset`              | Mọi người                 | B3: đặt mật khẩu mới bằng reset token, hủy mọi phiên cũ |
| GET                 | `/api/auth/me`                        | Mọi người                 | Người dùng của phiên hiện tại                           |
| GET                 | `/api/public/summary`                 | Mọi người                 | Số liệu cho trang chủ                                   |
| GET                 | `/api/state`                          | Đã đăng nhập              | Toàn bộ dữ liệu, đã lược thông tin liên hệ theo vai trò |
| POST                | `/api/receipts`                       | Đã đăng nhập              | Lập phiếu nhập / xuất (phiếu nhập của QL kho, Admin được duyệt ngay) |
| POST                | `/api/receipts/{id}/approve`          | QL kho, Admin             | Duyệt phiếu (cập nhật tồn, ghi thẻ kho)                 |
| POST                | `/api/receipts/{id}/reject`           | QL kho, Admin             | Từ chối phiếu                                           |
| POST                | `/api/stocktakes`                     | QL kho, Admin             | Xác nhận kiểm kê, điều chỉnh tồn                        |
| POST                | `/api/products`                       | QL kho, Admin             | Thêm hàng hóa                                           |
| POST / PUT          | `/api/partners`, `/api/partners/{id}` | QL kho, Admin             | Thêm / sửa đối tác                                      |
| PUT                 | `/api/partners/{id}/note`             | QL kho, Admin             | Lưu ghi chú                                             |
| POST                | `/api/partners/{id}/files`            | Theo phân quyền xem hồ sơ | Tải lên PDF (≤ 10 MB)                                   |
| GET / DELETE        | `/api/files/{id}`                     | Theo phân quyền xem hồ sơ | Xem, tải về (`?download=1`), xóa PDF                    |
| POST / PUT          | `/api/plans`, `/api/plans/{id}`       | QL kho (kho mình), Admin  | Tạo, sửa kế hoạch nhập/xuất định kỳ                     |
| PUT                 | `/api/plans/{id}/status`              | QL kho (kho mình), Admin  | Tạm dừng / tiếp tục / kết thúc kế hoạch                 |
| PUT / DELETE        | `/api/plans/{id}/next`                | QL kho (kho mình), Admin  | Điều chỉnh riêng / bỏ điều chỉnh của kỳ tới             |
| POST                | `/api/plans/{id}/skip`, `/run`        | QL kho (kho mình), Admin  | Bỏ qua kỳ tới / lập phiếu cho kỳ tới ngay               |
| POST / PUT / DELETE | `/api/users…`                         | Admin                     | Tạo, sửa họ tên/SĐT/mật khẩu, đổi trạng thái, xóa tài khoản |
| GET                 | `/api/users/{id}/activity`            | Admin                     | Lịch sử hoạt động của một tài khoản: thống kê + 500 dòng mới nhất (USR-07) |
| POST / PUT / DELETE | `/api/warehouses…`                    | Admin                     | Thêm, sửa, tạm ngưng, xóa kho                           |

Mọi lỗi đều trả về JSON dạng `{"error": "..."}`: lỗi nghiệp vụ là HTTP 400, chưa đăng nhập 401, không đủ quyền 403, không tìm thấy 404. Lỗi không lường trước trả về 500 với thông báo chung và được ghi log ở máy chủ. Giao diện hiển thị nguyên văn trường `error`.

## 8. Các quy tắc nghiệp vụ được kiểm tra ở máy chủ

- Mật khẩu băm BCrypt.
- Tài khoản Nháp hoặc Đã khóa không đăng nhập được.
- Thông báo sai đăng nhập dùng chung một câu, không cho biết sai SĐT hay sai mật khẩu.
- **Quên mật khẩu (AUTH-08):** mã OTP 6 số gửi tới email của tài khoản, hiệu lực 5 phút, sai 5 lần thì hủy; gửi lại sau 60 giây, tối đa 5 mã/giờ/SĐT và 20 lần/giờ/IP. Phản hồi giống nhau dù SĐT có tài khoản hay không. Đặt lại xong thì mọi phiên cũ bị đăng xuất. Chỉ lưu bản băm của OTP và token.
- Phiếu chỉ cộng/trừ tồn khi được duyệt.
- **Phiếu nhập do Quản lý kho hoặc Admin lập được duyệt ngay khi lưu** (cộng tồn, ghi thẻ kho). Phiếu của Nhân viên kho phải chờ Quản lý kho / Admin duyệt.
- **Phiếu xuất: người lập không được tự duyệt phiếu của mình.**
- **Phiếu do Quản trị viên lập:** Quản lý kho chỉ thấy mã, loại, đối tác, kho; dòng hàng, số lượng, giá trị, ghi chú bị lược ở máy chủ (BR-25), và Quản lý kho không duyệt / từ chối được (BR-26, API trả 403). Vì người lập không tự duyệt được phiếu xuất, phiếu xuất của Admin cần một Admin khác duyệt.
- Phiếu xuất được kiểm tra tồn **hai lần**: khi lập và khi duyệt.
- Tồn không bao giờ âm. Mọi biến động đều ghi vào thẻ kho, và duyệt phiếu, kiểm kê đều chạy trong transaction.
- Chỉ xóa được tài khoản **đã khóa**, và chỉ xóa được kho **đã tạm ngưng và hết hàng**. Chứng từ cũ luôn được giữ lại.
- SĐT, email và hồ sơ PDF bị lược bỏ **ngay tại máy chủ** theo vai trò (bảng `Rules.HIDE_CONTACT`), không chỉ ẩn trên giao diện.

### Nhập/xuất định kỳ (kế hoạch tự lập phiếu)

Kế hoạch (mã `DK-0001`…) khai báo loại phiếu, kho, đối tác, danh sách hàng với **số lượng cố định**, chu kỳ **theo tháng / quý / năm** (ngày trong tháng, và tháng thứ mấy trong quý hoặc năm), ngày bắt đầu và ngày kết thúc (không bắt buộc).

- **Phiếu tự sinh luôn ở trạng thái chờ duyệt**, kể cả phiếu nhập; người lập là **"Hệ thống"**. Tồn kho chỉ đổi khi Quản lý kho hoặc Admin duyệt. Phiếu không có người lập nên không bị che theo BR-25/26, và Quản lý kho của kho đó duyệt được.
- **Hệ thống chưa có chức năng sửa phiếu.** Muốn đổi số lượng của một kỳ: dùng **"Điều chỉnh kỳ tới"** trước ngày đến hạn (kế hoạch gốc giữ nguyên, điều chỉnh tự xóa sau khi kỳ đó đã chạy hoặc bị bỏ qua), hoặc từ chối phiếu.
- **Phiếu xuất khi tồn không đủ** vẫn được sinh ở trạng thái chờ duyệt, ghi chú có `CẢNH BÁO THIẾU HÀNG`; bước duyệt kiểm tra lại tồn và chặn nếu vẫn thiếu.
- **Khi nào hệ thống kiểm tra kỳ đến hạn:** lúc khởi động, mỗi ngày một lần (00:10 giờ Việt Nam) và khi có người đăng nhập. Nhiều điểm kích hoạt là có chủ đích: bản chạy miễn phí trên Render tự "ngủ" khi không có người dùng nên không thể chỉ dựa vào hẹn giờ.
- **Nếu lỡ ngày chạy, hệ thống chỉ bù phiếu cho kỳ hiện tại, không sinh dồn các kỳ đã qua.** Ví dụ kế hoạch hằng quý, ngày 5 của tháng đầu quý, mà máy chủ tắt qua ngày 5: ngày 6 phiếu của quý này được lập; phiếu của các quý trước không được lập bù.
- **Mỗi kỳ chỉ sinh một phiếu.** Ràng buộc duy nhất (kế hoạch + kỳ) ở CSDL, nên khởi động lại hay chạy nhiều bản cùng lúc cũng không sinh trùng.
- Kỳ có ngày đến hạn trước ngày bắt đầu bị bỏ qua. Kho đang tạm ngưng hoặc đã xóa: kỳ đó được ghi nhận là **bỏ qua** kèm lý do.
- **Tạm dừng** thì không lập phiếu; **Tiếp tục** thì kỳ hiện tại (nếu đã đến hạn) được lập. **Kết thúc** không mở lại được; quá ngày kết thúc, kế hoạch tự chuyển sang đã kết thúc.
- Trang Tổng quan nhắc trước **3 ngày** (thẻ "Sắp đến kỳ nhập/xuất").
- **Phân quyền:** Admin tạo, sửa mọi kế hoạch; Quản lý kho chỉ kho của mình; Nhân viên kho chỉ xem kế hoạch của kho mình.
- Dữ liệu mẫu có 2 kế hoạch bắt đầu từ 01/01/2027 (chưa tự sinh phiếu); dùng **"Chạy ngay"** để xem phiếu do "Hệ thống" lập.

## 9. Deploy online miễn phí

Xem hướng dẫn từng bước trong **[DEPLOY.md](DEPLOY.md)** (Render + Aiven MySQL, 0 đồng).

## 10. Lỗi thường gặp

| Hiện tượng                             | Cách xử lý                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `Port 8080 was already in use`         | Tắt ứng dụng đang dùng cổng 8080, hoặc đổi `server.port` trong `application.properties` |
| `release version 25 not supported`     | Máy đang dùng JDK cũ. Cài JDK 25 và chọn nó trong IntelliJ (_Project Structure → SDK_)  |
| Trang báo “Không kết nối được máy chủ” | Ứng dụng Java chưa chạy hoặc đã dừng. Chạy lại theo mục 2                               |
| Muốn dữ liệu mẫu như ban đầu           | Xóa thư mục `data` rồi chạy lại                                                         |
