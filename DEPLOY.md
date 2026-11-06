# Deploy online miễn phí – Render + Aiven MySQL

Kết quả cuối cùng là một đường link dạng `https://qlkho-web.onrender.com` để cả nhóm và giảng viên cùng dùng chung dữ liệu.

```
 Trình duyệt ──HTTPS──►  Render (Free)              ──SSL──►  Aiven for MySQL (Free)
                         Docker: Spring Boot + giao diện       Toàn bộ dữ liệu + file PDF
```

| Thành phần | Dịch vụ | Chi phí | Giới hạn cần biết |
| --- | --- | --- | --- |
| Mã nguồn | GitHub | 0 đ | — |
| Ứng dụng | Render, gói *Free* | 0 đ | 512 MB RAM. **Ngủ sau 15 phút không ai truy cập**, lần mở đầu tiên chờ khoảng 30–60 giây |
| CSDL | Aiven for MySQL, gói *Free* | 0 đ | Dung lượng nhỏ (đủ cho demo). Dịch vụ có thể bị tạm tắt nếu bỏ không quá lâu |

> Điều kiện của các gói miễn phí có thể thay đổi theo thời gian. Khi đăng ký, hãy xem lại trang giá của Render và Aiven.

Tổng thời gian khoảng **30–40 phút**. Phần lâu nhất là Render build lần đầu (5–10 phút).

---

## Bước 1 – Đưa mã nguồn lên GitHub (5 phút)

1. Tạo tài khoản tại https://github.com (nếu chưa có).
2. Bấm **New repository**, đặt tên `qlkho-web`. Chọn *Public*, hoặc *Private* nếu không muốn công khai (Render vẫn đọc được). **Không** tích "Add README".
3. Mở terminal trong thư mục `qlkho-web` (thư mục chứa `pom.xml`, `Dockerfile`) và chạy:
   ```bash
   git init
   git add .
   git commit -m "Hệ thống quản lý kho"
   git branch -M main
   git remote add origin https://github.com/<tên-tài-khoản>/qlkho-web.git
   git push -u origin main
   ```
   Không quen dòng lệnh thì dùng **GitHub Desktop**: *Add existing repository* → *Publish repository*.
4. Kiểm tra trên GitHub: ở thư mục gốc của repo phải thấy `Dockerfile`, `render.yaml`, `pom.xml`, `src/`.

> File `.gitignore` đã loại sẵn thư mục `data/`, `uploads/` và `target/`, nên CSDL H2 trên máy bạn không bị đẩy lên.

---

## Bước 2 – Tạo MySQL miễn phí trên Aiven (10 phút)

1. Đăng ký tại https://aiven.io. Có thể đăng nhập bằng Google hoặc GitHub. Gói free **không cần thẻ**.
2. Bấm **Create service** → chọn **MySQL** → chọn gói **Free**. Chọn khu vực gần Việt Nam nhất trong danh sách được phép → đặt tên `qlkho-db` → **Create service**.
3. Chờ trạng thái chuyển từ *Rebuilding* sang **Running** (1–3 phút).
4. Ở tab **Overview** → mục **Connection information**, ghi lại 5 thông tin:

   | Mục trên Aiven | Ví dụ |
   | --- | --- |
   | Host | `qlkho-db-tennhom.d.aivencloud.com` |
   | Port | `12345` |
   | User | `avnadmin` |
   | Password | (bấm biểu tượng con mắt để xem) |
   | Database name | `defaultdb` |

5. Ghép thành **chuỗi JDBC** theo mẫu dưới đây (thay HOST và PORT):
   ```
   jdbc:mysql://HOST:PORT/defaultdb?sslMode=REQUIRED&useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Ho_Chi_Minh
   ```
   ⚠️ **Không** dùng dòng *Service URI* dạng `mysql://avnadmin:...@...` mà Aiven hiển thị. Java cần chuỗi bắt đầu bằng `jdbc:mysql://`.

Bạn **không cần** tự tạo bảng. Lần chạy đầu tiên, ứng dụng tự tạo 11 bảng và nạp dữ liệu mẫu.

---

## Bước 3 – Deploy ứng dụng lên Render (10 phút + chờ build)

1. Đăng ký tại https://render.com bằng **tài khoản GitHub**, rồi cho phép Render truy cập repo `qlkho-web`.
2. Chọn **một trong hai cách** sau.

   **Cách A – Blueprint (nhanh nhất, dùng file `render.yaml` có sẵn)**
   1. **New +** → **Blueprint** → chọn repo `qlkho-web` → **Connect**.
   2. Render hỏi giá trị cho 3 biến. Điền theo bảng ở cách B → **Apply**.

   **Cách B – Tạo thủ công**
   1. **New +** → **Web Service** → chọn repo `qlkho-web`.
   2. *Runtime / Language*: **Docker**. *Region*: **Singapore**. *Instance type*: **Free**.
   3. Mục **Environment Variables**, thêm:

      | Key | Value |
      | --- | --- |
      | `SPRING_PROFILES_ACTIVE` | `prod` |
      | `DB_URL` | chuỗi JDBC ở Bước 2 |
      | `DB_USER` | `avnadmin` |
      | `DB_PASSWORD` | mật khẩu Aiven |

   4. *Advanced* → **Health Check Path**: `/api/public/summary` → **Create Web Service**.

3. Mở tab **Logs** để theo dõi. Lần đầu Render tải Maven và thư viện nên mất 5–10 phút. Khi thấy hai dòng sau là xong:
   ```
   Started QlkhoApplication in ... seconds
   Your service is live 🎉
   ```
4. Link nằm ở góc trên bên trái, dạng `https://qlkho-web.onrender.com` (tên có thể kèm thêm vài ký tự).

---

## Bước 4 – Kiểm tra sau khi deploy (5 phút)

Mở link và thử lần lượt:

- [ ] Trang chủ hiện ra, vuốt lên thì vào được trang đăng nhập.
- [ ] Đăng nhập **Nhân viên kho** (0903 333 333 / 123456) và lập một phiếu xuất.
- [ ] Đăng xuất, đăng nhập **Quản lý kho** (0902 222 222 / 123456) và duyệt phiếu đó. Tồn kho thay đổi.
- [ ] Vào *Nhà cung cấp* bằng **Quản trị viên** (0901 111 111), tải lên một file PDF, rồi bấm Xem.
- [ ] Trên Render bấm **Manual Deploy → Restart service**, mở lại link: **dữ liệu và file PDF vẫn còn**. Bước này chứng tỏ dữ liệu đã nằm trên MySQL cloud.
- [ ] Mở link trên điện thoại: giao diện hiển thị gọn.

---

## Bước 5 – Chia sẻ cho người khác dùng thử

Gửi link kèm bảng tài khoản demo:

| Vai trò | Số điện thoại | Mật khẩu |
| --- | --- | --- |
| Quản trị viên | 0901 111 111 | 123456 |
| Quản lý kho | 0902 222 222 | 123456 |
| Nhân viên kho | 0903 333 333 | 123456 |

**Lưu ý vì đây là bản demo công khai:**
- Mọi người **dùng chung một bộ dữ liệu**. Ai đó xóa hay sửa thì người khác cũng thấy thay đổi.
- Tài khoản Quản trị viên đang để lộ trên trang đăng nhập. Nếu không muốn người lạ có toàn quyền, sau khi deploy hãy vào *Người dùng* để **đổi mật khẩu của tài khoản Admin** và chỉ báo cho nhóm.
- Khi nhiều người cùng thao tác, các quy tắc nghiệp vụ vẫn được kiểm tra ở máy chủ. Ví dụ hai người cùng duyệt một phiếu thì người thứ hai nhận thông báo *"Phiếu đã được xử lý trước đó"*.

---

## Bước 6 – Tránh chờ lâu khi demo (tùy chọn)

Gói Free của Render ngủ sau 15 phút không có truy cập. Có 2 cách xử lý:

- **Cách đơn giản:** khoảng 2 phút trước khi thuyết trình, mở link một lần để "đánh thức" máy chủ.
- **Giữ máy chủ luôn thức:** tạo tài khoản miễn phí trên https://cron-job.org, rồi tạo job gọi `https://<link-của-bạn>/api/public/summary` **mỗi 10 phút**. Gói Free có 750 giờ chạy mỗi tháng, đủ để một dịch vụ chạy liên tục.

---

## Bước 7 – Cập nhật khi sửa code

```bash
git add .
git commit -m "Mô tả thay đổi"
git push
```

Render **tự build và deploy lại** sau mỗi lần push (mất 3–6 phút). Dữ liệu trên MySQL không bị ảnh hưởng.

---

## Bước 8 – Đưa dữ liệu về như ban đầu

Ứng dụng chỉ nạp dữ liệu mẫu khi bảng tài khoản đang trống. Muốn làm lại từ đầu:

1. Trên Aiven, mở **Query editor** (hoặc kết nối bằng MySQL Workbench / DBeaver bằng thông tin ở Bước 2) và chạy:
   ```sql
   DROP TABLE IF EXISTS chi_tiet_phieu, phieu, the_kho, phieu_kiem_ke, ton_kho, ho_so_noi_dung,
                        ho_so_doi_tac, doi_tac, hang_hoa, kho, nguoi_dung;
   ```
2. Trên Render, bấm **Manual Deploy → Restart service**. Bảng được tạo lại và dữ liệu mẫu được nạp lại.

---

## Lỗi thường gặp

| Dòng log / hiện tượng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `Communications link failure` | Sai host/port, Aiven chưa *Running*, hoặc thiếu `sslMode=REQUIRED` | Kiểm tra lại `DB_URL` theo đúng mẫu ở Bước 2 |
| `Access denied for user 'avnadmin'` | Sai mật khẩu | Copy lại mật khẩu trên Aiven vào `DB_PASSWORD` |
| `Driver ... claims to not accept jdbcUrl, mysql://...` | Dán nhầm *Service URI* | `DB_URL` phải bắt đầu bằng `jdbc:mysql://` |
| `Could not resolve placeholder 'DB_URL'` | Chưa khai báo biến môi trường | Thêm đủ 3 biến `DB_URL`, `DB_USER`, `DB_PASSWORD` |
| Build lỗi `failed to compute cache key ... Dockerfile` | `Dockerfile` không nằm ở thư mục gốc của repo | Đảm bảo repo có `Dockerfile` cạnh `pom.xml` |
| Exit code 137 / `OutOfMemoryError` | Hết 512 MB RAM | `Dockerfile` đã giới hạn bộ nhớ JVM. Nếu vẫn lỗi, thêm biến `JAVA_TOOL_OPTIONS` = `-Xmx300m -XX:+UseSerialGC` |
| Mở link báo 502 / chờ rất lâu | Máy chủ đang thức dậy hoặc đang khởi động | Chờ 30–60 giây rồi tải lại |
| Đăng nhập xong lại bị đẩy ra | Đang mở bằng `http://` | Luôn dùng link `https://` của Render |

**Phương án dự phòng:** nếu Aiven không còn gói MySQL miễn phí ở khu vực bạn chọn, có thể dùng **TiDB Cloud Serverless** (tương thích MySQL, có gói free). Tạo cluster, lấy host, port, user và password, sau đó dùng chuỗi `jdbc:mysql://HOST:4000/test?sslMode=VERIFY_IDENTITY&useUnicode=true&characterEncoding=utf8`. Ngoài chuỗi này, không cần sửa gì trong mã nguồn.
