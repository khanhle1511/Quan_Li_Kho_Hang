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
├── docs/schema-mysql.sql          Lược đồ CSDL (bảng, khóa chính/ngoại, ràng buộc)
└── src/main/
    ├── java/com/qlkho/
    │   ├── QlkhoApplication.java  Điểm khởi động
    │   ├── config/AppConfig       Bean băm mật khẩu BCrypt
    │   ├── model/                 11 lớp @Entity ↔ 11 bảng
    │   ├── repo/                  Spring Data JPA repository (truy vấn đếm, lấy mã… để không tải cả bảng)
    │   ├── service/               Nghiệp vụ
    │   │   ├── AuthService        UC01 Đăng nhập, kiểm tra quyền (requireAdmin / requireManager)
    │   │   ├── InventoryService   UC02–UC05 Lập phiếu, duyệt, kiểm kê
    │   │   ├── CatalogService     Hàng hóa, đối tác, hồ sơ PDF, kho
    │   │   ├── UserService        Quản lý tài khoản
    │   │   ├── StateService       Gom dữ liệu cho giao diện, ẩn liên hệ theo vai trò
    │   │   └── DataSeeder         Dữ liệu mẫu lần chạy đầu
    │   ├── web/                   REST controller + DTO (record)
    │   └── common/                Rules (hằng số vai trò/trạng thái, regex, sinh mã), ApiException, ApiErrors, PdfMaker
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
| GET                 | `/api/auth/me`                        | Mọi người                 | Người dùng của phiên hiện tại                           |
| GET                 | `/api/public/summary`                 | Mọi người                 | Số liệu cho trang chủ                                   |
| GET                 | `/api/state`                          | Đã đăng nhập              | Toàn bộ dữ liệu, đã lược thông tin liên hệ theo vai trò |
| POST                | `/api/receipts`                       | Đã đăng nhập              | Lập phiếu nhập / xuất                                   |
| POST                | `/api/receipts/{id}/approve`          | QL kho, Admin             | Duyệt phiếu (cập nhật tồn, ghi thẻ kho)                 |
| POST                | `/api/receipts/{id}/reject`           | QL kho, Admin             | Từ chối phiếu                                           |
| POST                | `/api/stocktakes`                     | QL kho, Admin             | Xác nhận kiểm kê, điều chỉnh tồn                        |
| POST                | `/api/products`                       | QL kho, Admin             | Thêm hàng hóa                                           |
| POST / PUT          | `/api/partners`, `/api/partners/{id}` | QL kho, Admin             | Thêm / sửa đối tác                                      |
| PUT                 | `/api/partners/{id}/note`             | QL kho, Admin             | Lưu ghi chú                                             |
| POST                | `/api/partners/{id}/files`            | Theo phân quyền xem hồ sơ | Tải lên PDF (≤ 10 MB)                                   |
| GET / DELETE        | `/api/files/{id}`                     | Theo phân quyền xem hồ sơ | Xem, tải về (`?download=1`), xóa PDF                    |
| POST / PUT / DELETE | `/api/users…`                         | Admin                     | Tạo, sửa SĐT/mật khẩu, đổi trạng thái, xóa tài khoản    |
| POST / PUT / DELETE | `/api/warehouses…`                    | Admin                     | Thêm, sửa, tạm ngưng, xóa kho                           |

Mọi lỗi đều trả về JSON dạng `{"error": "..."}`: lỗi nghiệp vụ là HTTP 400, chưa đăng nhập 401, không đủ quyền 403, không tìm thấy 404. Lỗi không lường trước trả về 500 với thông báo chung và được ghi log ở máy chủ. Giao diện hiển thị nguyên văn trường `error`.

## 8. Các quy tắc nghiệp vụ được kiểm tra ở máy chủ

- Mật khẩu băm BCrypt.
- Tài khoản Nháp hoặc Đã khóa không đăng nhập được.
- Thông báo sai đăng nhập dùng chung một câu, không cho biết sai SĐT hay sai mật khẩu.
- Phiếu chỉ cộng/trừ tồn khi được duyệt.
- **Người lập không được tự duyệt phiếu của mình.**
- Phiếu xuất được kiểm tra tồn **hai lần**: khi lập và khi duyệt.
- Tồn không bao giờ âm. Mọi biến động đều ghi vào thẻ kho, và duyệt phiếu, kiểm kê đều chạy trong transaction.
- Chỉ xóa được tài khoản **đã khóa**, và chỉ xóa được kho **đã tạm ngưng và hết hàng**. Chứng từ cũ luôn được giữ lại.
- SĐT, email và hồ sơ PDF bị lược bỏ **ngay tại máy chủ** theo vai trò (bảng `Rules.HIDE_CONTACT`), không chỉ ẩn trên giao diện.

## 9. Deploy online miễn phí

Xem hướng dẫn từng bước trong **[DEPLOY.md](DEPLOY.md)** (Render + Aiven MySQL, 0 đồng).

## 10. Lỗi thường gặp

| Hiện tượng                             | Cách xử lý                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| `Port 8080 was already in use`         | Tắt ứng dụng đang dùng cổng 8080, hoặc đổi `server.port` trong `application.properties` |
| `release version 25 not supported`     | Máy đang dùng JDK cũ. Cài JDK 25 và chọn nó trong IntelliJ (_Project Structure → SDK_)  |
| Trang báo “Không kết nối được máy chủ” | Ứng dụng Java chưa chạy hoặc đã dừng. Chạy lại theo mục 2                               |
| Muốn dữ liệu mẫu như ban đầu           | Xóa thư mục `data` rồi chạy lại                                                         |
