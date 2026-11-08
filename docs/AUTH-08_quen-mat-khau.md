# AUTH-08 – Quên mật khẩu, đặt lại bằng mã OTP gửi qua email

| | |
| --- | --- |
| **Mã** | AUTH-08 (yêu cầu thay đổi CR-03, chức năng FR-18, quy tắc BR-27 → BR-36) |
| **Trạng thái** | Đã triển khai trên local (09/11/2026), chưa deploy. Test: `e2e/features/17-quen-mat-khau.feature` |
| **Ngày** | 09/11/2026 |
| **Người yêu cầu** | QA_QC |
| **Liên quan** | AUTH-01..07 (đăng nhập, khóa tạm khi sai 5 lần), USR-01..06 (quản trị tài khoản), USR-07 (lịch sử hoạt động), SEC-01..03 |

## 1. Bối cảnh và mục tiêu

Hiện tại nút **"Quên mật khẩu?"** ở màn đăng nhập chỉ hiện toast "Vui lòng liên hệ Quản trị viên để được đặt lại mật khẩu." Người dùng phải chờ Admin đặt lại mật khẩu thủ công qua form Sửa tài khoản.

Mục tiêu: người dùng **tự đặt lại mật khẩu** bằng mã OTP 6 số gửi tới email đã đăng ký, không cần Admin can thiệp. Việc này không được làm yếu các biện pháp chống dò tài khoản và dò mật khẩu đang có.

**Ngoài phạm vi** (để ở các yêu cầu sau nếu cần):

- Đổi mật khẩu khi đang đăng nhập (màn hồ sơ cá nhân).
- Người dùng tự sửa email của mình.
- Xác thực hai lớp (2FA) khi đăng nhập.
- Gửi OTP qua SMS.

## 2. Thuật ngữ

| Thuật ngữ | Nghĩa |
| --- | --- |
| **OTP** | Mã một lần gồm 6 chữ số, gửi qua email, dùng để chứng minh người dùng sở hữu email đó |
| **Reset token** | Chuỗi ngẫu nhiên do máy chủ cấp sau khi OTP đúng; dùng một lần để đặt mật khẩu mới |
| **Yêu cầu đặt lại** | Một bản ghi trong bảng `yeu_cau_dat_lai_mk`, sinh ra mỗi lần người dùng bấm "Gửi mã" |
| **Phản hồi chung** | Thông báo giống hệt nhau dù SĐT có tồn tại hay không, để không lộ tài khoản nào có thật |

## 3. Tác nhân và điều kiện

| Tác nhân | Vai trò trong luồng |
| --- | --- |
| Người dùng chưa đăng nhập (mọi vai trò) | Yêu cầu mã, nhập mã, đặt mật khẩu mới |
| Quản trị viên | Nhập và sửa email của tài khoản (thêm trường mới ở form Tạo/Sửa tài khoản); vẫn đặt lại mật khẩu thủ công được như cũ |
| Dịch vụ gửi mail | Mailpit khi chạy local và e2e; Brevo HTTP API trên bản online (xem mục 9) |

**Điều kiện để nhận được OTP:** tài khoản tồn tại, trạng thái `active`, và đã có email. Mọi trường hợp khác vẫn nhận **phản hồi chung**, nhưng không có email nào được gửi.

## 4. Luồng nghiệp vụ

### 4.1 Luồng chính

```
[Đăng nhập] --bấm "Quên mật khẩu?"--> [B1. Nhập SĐT] --Gửi mã--> (máy chủ gửi OTP qua email)
      ^                                                                   |
      |                                                                   v
      +---- "Đặt lại thành công" <---- [B3. Mật khẩu mới] <--OTP đúng-- [B2. Nhập OTP]
```

1. Ở màn Đăng nhập, người dùng bấm **"Quên mật khẩu?"**.
2. **B1 – Nhập số điện thoại.** Ô SĐT được điền sẵn giá trị đang có ở form đăng nhập. Người dùng bấm **"Gửi mã xác nhận"**.
3. Máy chủ kiểm tra định dạng SĐT (giống đăng nhập). Nếu tài khoản đủ điều kiện, máy chủ tạo OTP, lưu bản băm và gửi email **bất đồng bộ**. Máy chủ luôn trả phản hồi chung (BR-28).
4. **B2 – Nhập OTP.** Giao diện hiển thị:
   *"Nếu số điện thoại 0901 111 111 đã đăng ký email, mã xác nhận 6 số đã được gửi tới email đó. Mã có hiệu lực trong 5 phút."*
   Màn hình có ô nhập 6 số, đồng hồ đếm ngược thời hạn mã, nút **"Gửi lại mã"** (bị khóa 60 giây) và liên kết **"Đổi số điện thoại"** để quay lại B1.
5. Người dùng nhập OTP và bấm **"Xác nhận"**. Nếu đúng, máy chủ đánh dấu OTP đã dùng và trả về reset token (thời hạn 10 phút).
6. **B3 – Đặt mật khẩu mới.** Màn hình có hai ô "Mật khẩu mới" và "Nhập lại mật khẩu", nút hiện/ẩn mật khẩu, và gợi ý quy tắc mật khẩu. Người dùng bấm **"Đặt lại mật khẩu"**.
7. Máy chủ kiểm tra token và quy tắc mật khẩu, rồi cập nhật mật khẩu. Sau đó máy chủ hủy mọi phiên đăng nhập cũ của tài khoản, xóa bộ đếm sai mật khẩu, ghi nhật ký và gửi email thông báo "Mật khẩu đã được thay đổi".
8. Giao diện quay về màn Đăng nhập, điền sẵn SĐT, xóa ô mật khẩu và hiện toast xanh *"Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."* Hệ thống **không** tự đăng nhập.

### 4.2 Luồng thay thế và ngoại lệ

| Mã | Tình huống | Xử lý |
| --- | --- | --- |
| A1 | SĐT sai định dạng | 400, báo ngay tại B1: "Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09)." Không tạo yêu cầu |
| A2 | SĐT không tồn tại, tài khoản `draft` hoặc `locked`, hoặc tài khoản chưa có email | Vẫn trả **phản hồi chung** và chuyển sang B2. Không gửi email. Nếu tài khoản tồn tại thì ghi nhật ký (BR-35) |
| A3 | Bấm "Gửi lại mã" | Chỉ bấm được sau 60 giây; gọi API sớm hơn nhận 429 "Vui lòng đợi N giây trước khi gửi lại mã." Mã mới làm mã cũ mất hiệu lực (BR-30). Áp giới hạn tần suất (BR-31) |
| A4 | Vượt giới hạn gửi mã | 429: "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau N phút." Thông báo giống nhau cho mọi SĐT (xem BR-31) |
| A5 | OTP sai | 400: "Mã xác nhận không đúng hoặc đã hết hạn." Xóa ô nhập, giữ nguyên màn B2 |
| A6 | OTP sai 5 lần | Yêu cầu bị hủy. Lần nhập tiếp theo vẫn nhận thông báo như A5, kể cả khi mã đúng. Giao diện gợi ý "Gửi lại mã" |
| A7 | OTP hết hạn (quá 5 phút) | Như A5. Khi đồng hồ về 0, giao diện tự khóa nút "Xác nhận" và hiện "Mã đã hết hạn, hãy gửi lại mã" |
| A8 | Reset token hết hạn (quá 10 phút) hoặc đã dùng | 400: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu." Giao diện quay về B1 |
| A9 | Mật khẩu mới không hợp lệ | 400, dùng đúng thông báo của quy tắc hiện có (`UserService.checkPassword`): ít nhất 6 ký tự, không khoảng trắng, tối đa 72 byte |
| A10 | Hai ô mật khẩu không khớp | Giao diện chặn trước: "Mật khẩu nhập lại không khớp." Máy chủ cũng kiểm tra lại (400) |
| A11 | Mật khẩu mới trùng mật khẩu hiện tại | 400: "Mật khẩu mới phải khác mật khẩu hiện tại." |
| A12 | Tài khoản bị Admin khóa hoặc xóa trong lúc đang đặt lại | Tại bước verify hoặc reset, máy chủ kiểm tra lại trạng thái. Nếu không còn `active` thì xử lý như A8 |
| A13 | Dịch vụ mail lỗi | Người dùng vẫn nhận phản hồi chung, vì việc gửi chạy bất đồng bộ. Máy chủ ghi log lỗi (không có OTP trong log) và ghi nhật ký `PWD_RESET_MAIL_FAIL` |
| A14 | Đang đăng nhập mà mở luồng quên mật khẩu | Không xảy ra trên giao diện: luồng chỉ có ở màn Đăng nhập. API vẫn hoạt động độc lập với phiên |

## 5. Quy tắc nghiệp vụ

| Mã | Quy tắc |
| --- | --- |
| **BR-27** | Mỗi tài khoản có tối đa **một email**. Email không bắt buộc, phải đúng định dạng `Rules.EMAIL`, được lưu ở dạng chữ thường và đã cắt khoảng trắng hai đầu, và **không trùng** với tài khoản khác. Chỉ Admin nhập và sửa email |
| **BR-28** | Chống dò tài khoản: bước gửi mã luôn trả **cùng mã HTTP, cùng nội dung, cùng cấu trúc JSON** cho mọi SĐT hợp lệ về định dạng. Thời gian phản hồi không phụ thuộc việc có gửi email hay không, vì việc gửi chạy bất đồng bộ. Giao diện không hiển thị email, kể cả dạng che (`k***@gmail.com`) |
| **BR-29** | OTP gồm **6 chữ số** sinh bằng `SecureRandom`, có hiệu lực **5 phút**. Máy chủ chỉ lưu **bản băm BCrypt** của OTP, không lưu mã gốc |
| **BR-30** | Mỗi tài khoản chỉ có **một** yêu cầu còn hiệu lực. Tạo mã mới thì mọi mã cũ của tài khoản đó mất hiệu lực ngay |
| **BR-31** | Giới hạn gửi mã. **Theo SĐT:** cách nhau ít nhất **60 giây** và tối đa **5 lần mỗi giờ**. **Theo IP:** tối đa **20 lần mỗi giờ**. Bộ đếm theo SĐT áp dụng cho cả SĐT không tồn tại để không lộ thông tin. Bộ đếm được lưu trong CSDL nên không mất khi Render khởi động lại |
| **BR-32** | Mỗi OTP được nhập sai tối đa **5 lần**. Đến lần sai thứ 5, yêu cầu bị hủy. OTP đúng chỉ dùng được **một lần** |
| **BR-33** | Reset token là **32 byte ngẫu nhiên** (mã hóa base64url), có hiệu lực **10 phút**, dùng một lần. Máy chủ lưu bản băm SHA-256 của token. Token chỉ được trả về qua body JSON, không đưa vào URL |
| **BR-34** | Đặt lại thành công thì máy chủ thực hiện cả bốn việc: (a) cập nhật `passwordHash`; (b) tăng `sessionVersion` để mọi phiên đang mở của tài khoản bị hủy ở request kế tiếp; (c) xóa bộ đếm sai mật khẩu và khóa tạm 15 phút của SĐT (AUTH-05); (d) hủy mọi yêu cầu đặt lại còn lại của tài khoản. Trạng thái tài khoản **không đổi**: tài khoản `locked` không được mở khóa bằng luồng này |
| **BR-35** | Ghi nhật ký USR-07, nhóm *Tài khoản*, cho các hành động `PWD_RESET_REQUEST`, `PWD_RESET_OTP_FAIL`, `PWD_RESET_OTP_LOCKED`, `PWD_RESET` và `PWD_RESET_MAIL_FAIL`. Chỉ ghi khi tài khoản tồn tại. Phần chi tiết nhật ký không bao giờ chứa OTP, token hay email đầy đủ |
| **BR-36** | Sau khi đặt lại, hệ thống gửi email thông báo tới địa chỉ đã đăng ký. Email nêu thời điểm, địa chỉ IP và hướng dẫn liên hệ Admin nếu không phải người dùng tự thực hiện. Email này không chứa liên kết nào |

## 6. Giao diện

Giao diện vẫn là một trang duy nhất trong `index.html`. Thêm trạng thái `S.fp = { step: 'phone' | 'otp' | 'reset', phone, otp, token, pass, pass2, show, err, expiresAt, resendAt, busy }`. Luồng hiển thị **thay cho form đăng nhập** ở cột phải màn Đăng nhập, dùng lại khung và kiểu chữ hiện có.

### 6.1 Màn Đăng nhập (sửa)

- Nút "Quên mật khẩu?" chuyển sang B1 thay vì hiện toast.

### 6.2 B1 – Nhập số điện thoại

| Thành phần | Chi tiết |
| --- | --- |
| Tiêu đề | "Quên mật khẩu" |
| Mô tả | "Nhập số điện thoại đăng nhập. Chúng tôi sẽ gửi mã xác nhận tới email đã đăng ký của tài khoản." |
| Ô nhập | `data-fid="fp-phone"`, `inputmode="tel"`, điền sẵn từ form đăng nhập |
| Nút chính | "Gửi mã xác nhận" (`btn-primary`); hiện trạng thái đang gửi khi chờ phản hồi |
| Liên kết | "← Quay lại đăng nhập" |
| Ghi chú nhỏ | "Tài khoản chưa có email? Liên hệ Quản trị viên để được đặt lại mật khẩu." |

### 6.3 B2 – Nhập mã OTP

| Thành phần | Chi tiết |
| --- | --- |
| Mô tả | Phản hồi chung (mục 4.1, bước 4), có SĐT đã định dạng |
| Ô nhập | Một ô `data-fid="fp-otp"`, `inputmode="numeric"`, `autocomplete="one-time-code"`, `maxlength=6`, chỉ nhận chữ số. Dán chuỗi "123 456" thì tự lọc thành "123456" |
| Đồng hồ | "Mã hết hạn sau 04:59". Khi về 0, hiện chữ đỏ "Mã đã hết hạn" và khóa nút Xác nhận |
| Nút chính | "Xác nhận"; chỉ bấm được khi đủ 6 số |
| Gửi lại | "Gửi lại mã (60 giây)", đếm ngược rồi mới bấm được |
| Liên kết | "Đổi số điện thoại" (về B1) |

### 6.4 B3 – Mật khẩu mới

| Thành phần | Chi tiết |
| --- | --- |
| Ô nhập | `fp-pass`, `fp-pass2`, `autocomplete="new-password"`, nút hiện/ẩn dùng chung cho hai ô |
| Gợi ý | "Ít nhất 6 ký tự, không chứa khoảng trắng." Gợi ý chuyển sang màu xanh khi thỏa |
| Nút chính | "Đặt lại mật khẩu" |
| Hết hạn token | Hiển thị lỗi theo A8 và nút "Làm lại từ đầu" |

### 6.5 Form Tạo/Sửa tài khoản (Admin) – sửa

- Thêm ô **"Email (dùng để khôi phục mật khẩu)"** với `data-fid="uf-email"`, không bắt buộc, đặt ngay dưới ô Số điện thoại.
- Bảng Người dùng hiện email ở dòng phụ dưới SĐT. Tài khoản chưa có email hiện chữ xám "Chưa có email".
- Popup chi tiết USR-07 hiện thêm email.

### 6.6 Thông báo dùng trong luồng

| Tình huống | Kiểu | Nội dung |
| --- | --- | --- |
| Gửi mã (mọi trường hợp hợp lệ) | Văn bản ở B2 | "Nếu số điện thoại … đã đăng ký email, mã xác nhận 6 số đã được gửi tới email đó. Mã có hiệu lực trong 5 phút." |
| Gửi lại thành công | Toast info | "Đã gửi lại mã xác nhận." |
| OTP sai hoặc hết hạn | `alert-err` | "Mã xác nhận không đúng hoặc đã hết hạn." |
| Gửi quá nhiều lần | `alert-err` | "Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau N phút." |
| Token hết hạn | `alert-err` | "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu." |
| Thành công | Toast ok | "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới." |

## 7. API

Cả ba endpoint đều **công khai** (không cần phiên), thuộc `AuthController`. Mọi lỗi trả về theo định dạng chung `{ "error": "<thông báo>" }` như các API hiện có.

### 7.1 `POST /api/auth/forgot` – yêu cầu mã

```json
// request
{ "phone": "0901 111 111" }
// 200 – luôn giống nhau khi SĐT đúng định dạng và chưa vượt giới hạn
{ "ok": true, "expiresIn": 300, "resendAfter": 60 }
```

| Mã | Khi nào |
| --- | --- |
| 200 | SĐT đúng định dạng (dù tồn tại hay không) |
| 400 | SĐT trống hoặc sai định dạng |
| 429 | Vượt BR-31. Có thêm trường `retryAfter` (giây) và header `Retry-After` |

### 7.2 `POST /api/auth/forgot/verify` – kiểm tra mã

```json
// request
{ "phone": "0901111111", "otp": "482913" }
// 200
{ "resetToken": "q3V0...base64url", "expiresIn": 600 }
```

| Mã | Khi nào |
| --- | --- |
| 200 | OTP đúng, còn hạn, chưa dùng, số lần sai < 5, tài khoản còn `active` |
| 400 | Mọi trường hợp còn lại, cùng một thông báo: "Mã xác nhận không đúng hoặc đã hết hạn." OTP không phải 6 chữ số cũng nhận 400 này |
| 429 | Gọi verify quá 30 lần mỗi giờ từ một IP (chặn dò hàng loạt) |

### 7.3 `POST /api/auth/forgot/reset` – đặt mật khẩu mới

```json
// request
{ "resetToken": "q3V0...", "password": "MatKhauMoi1", "confirm": "MatKhauMoi1" }
// 200
{ "ok": true, "phone": "0901111111" }
```

| Mã | Khi nào |
| --- | --- |
| 200 | Thành công (BR-34) |
| 400 | Token sai, hết hạn hoặc đã dùng (A8); mật khẩu vi phạm quy tắc (A9); hai ô không khớp (A10); trùng mật khẩu cũ (A11) |

### 7.4 API sửa đổi

| API | Thay đổi |
| --- | --- |
| `POST /api/users`, `PUT /api/users/{id}` | Nhận thêm trường `email` (tùy chọn), kiểm tra theo BR-27. Email trùng: 400 "Email đã được dùng cho tài khoản khác." |
| `GET /api/state` | Mỗi phần tử `users[]` có thêm `email`. Với Quản lý kho và Nhân viên kho, `email` luôn là `null` (giống cách đang ẩn `phone`) |
| `GET /api/users/{id}/activity` | Có thêm các hành động `PWD_RESET_*` (nhóm Tài khoản) |

## 8. Dữ liệu

### 8.1 Bảng `nguoi_dung` (sửa)

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `email` | varchar(254), có thể null, **unique** | BR-27 |
| `session_version` | int, mặc định 0, not null | BR-34. Lúc đăng nhập, phiên lưu thêm `sv` = giá trị hiện tại. `AuthService.find()` hủy phiên khi `sv` khác với giá trị trong CSDL |

Dữ liệu mẫu (`DataSeeder`): gán email dạng `<tên>@qlkho.local` cho các tài khoản demo để chạy thử với Mailpit. Một tài khoản để trống email nhằm test A2.

### 8.2 Bảng mới `yeu_cau_dat_lai_mk`

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | bigint, tự tăng | Khóa chính |
| `user_id` | varchar(20), có thể null | Null khi SĐT không tồn tại (vẫn ghi để đếm BR-31) |
| `phone` | varchar(15) | SĐT đã chuẩn hóa |
| `otp_hash` | varchar(100), có thể null | BCrypt. Null khi không gửi mã (A2) |
| `created_at`, `expires_at` | bigint (epoch ms) | `expires_at` = tạo + 5 phút |
| `failed_attempts` | int | BR-32 |
| `status` | varchar(12) | `pending`, `verified`, `used`, `expired`, `locked`, `superseded` |
| `token_hash` | char(64), có thể null | SHA-256 hex của reset token |
| `token_expires_at` | bigint, có thể null | Lúc verify + 10 phút |
| `request_ip` | varchar(45) | Dùng cho BR-31 và email thông báo |

Chỉ mục: `idx_dl_phone_created (phone, created_at)`, `idx_dl_ip_created (request_ip, created_at)`, `idx_dl_token (token_hash)`.

**Dọn dữ liệu:** một tác vụ `@Scheduled` chạy mỗi giờ để xóa các bản ghi tạo cách đây hơn 24 giờ.

Hibernate tự tạo các cột và bảng mới (`ddl-auto=update`). Cần cập nhật thêm `docs/schema-mysql.sql` và lệnh DROP trong `DEPLOY.md`.

## 9. Gửi email

### 9.1 Kiến trúc

```
PasswordResetService ──> MailSender (interface)
                           ├── SmtpMailSender   (spring-boot-starter-mail; Mailpit / Gmail)   profile mặc định
                           ├── BrevoMailSender  (RestClient → https://api.brevo.com/v3/smtp/email) profile prod
                           └── LogMailSender    (chỉ in ra log; chỉ bật khi app.mail.provider=log)
```

- Việc gửi chạy qua `@Async` (bật `@EnableAsync`) để giữ thời gian phản hồi đồng đều (BR-28).
- Không thử gửi lại tự động. Lỗi được ghi log ở mức WARN (không có OTP) và ghi nhật ký `PWD_RESET_MAIL_FAIL`.
- Lý do dùng HTTP API trên bản online: Render bản miễn phí chặn cổng SMTP đi ra. Cần kiểm chứng lại trên tài liệu Render trước khi triển khai.

### 9.2 Cấu hình

| Biến môi trường | Thuộc tính | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `MAIL_PROVIDER` | `app.mail.provider` | `smtp` | `smtp`, `brevo` hoặc `log` |
| `MAIL_FROM` | `app.mail.from` | `no-reply@qlkho.local` | Với Brevo phải là địa chỉ đã xác minh |
| `MAIL_FROM_NAME` | `app.mail.from-name` | `Quản lý kho` | |
| `SMTP_HOST`, `SMTP_PORT` | `spring.mail.host`, `spring.mail.port` | `localhost`, `1025` | Mailpit |
| `SMTP_USER`, `SMTP_PASS` | `spring.mail.username`, `spring.mail.password` | trống | Gmail cần App Password |
| `BREVO_API_KEY` | `app.mail.brevo.api-key` | trống | Đặt trong Render, **không** commit |
| `RESET_OTP_TTL_SECONDS`, `RESET_TOKEN_TTL_SECONDS`, `RESET_RESEND_COOLDOWN_SECONDS`, `RESET_MAX_PER_IP_HOUR`, `RESET_MAX_VERIFY_PER_IP_HOUR` | `app.reset.*` | 300, 600, 60, 20, 30 | Cho phép test rút ngắn thời hạn |

Khi `MAIL_PROVIDER=brevo` mà thiếu API key, ứng dụng ghi lỗi rõ ràng lúc khởi động nhưng vẫn chạy. Luồng quên mật khẩu khi đó trả phản hồi chung và ghi `PWD_RESET_MAIL_FAIL`.

### 9.3 Mẫu email

**Email OTP**

- Tiêu đề: `[Quản lý kho] Mã xác nhận đặt lại mật khẩu: 482913`
- Nội dung (HTML và bản văn bản thuần):

> Xin chào **Nguyễn Văn An**,
>
> Mã xác nhận đặt lại mật khẩu của bạn là:
>
> ## 482 913
>
> Mã có hiệu lực trong **5 phút** và chỉ dùng được một lần. Không chia sẻ mã này cho bất kỳ ai, kể cả người tự xưng là Quản trị viên.
>
> Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn vẫn giữ nguyên.

**Email thông báo đã đổi mật khẩu**

- Tiêu đề: `[Quản lý kho] Mật khẩu của bạn đã được thay đổi`
- Nội dung: thời điểm (dd/MM/yyyy HH:mm, giờ Việt Nam), địa chỉ IP, và câu "Nếu không phải bạn thực hiện, hãy liên hệ ngay Quản trị viên để khóa tài khoản."

Cả hai email không chứa liên kết nào, để tránh bị giả mạo theo kiểu phishing.

## 10. Yêu cầu phi chức năng và bảo mật

| Mã | Yêu cầu |
| --- | --- |
| NFR-1 | Bước gửi mã phản hồi trong khoảng 300 ms (p95) trên local. Chênh lệch thời gian giữa SĐT có thật và không có thật dưới 50 ms |
| NFR-2 | Email OTP đến hộp thư trong vòng 1 phút trong điều kiện bình thường |
| SEC-04 | Không ghi OTP, reset token hay mật khẩu vào log ứng dụng, nhật ký USR-07 hay thông báo lỗi. Ngoại lệ duy nhất là `LogMailSender`, chỉ dùng khi dev |
| SEC-05 | Token được tra qua bản băm SHA-256 (không so chuỗi token gốc), nên thời gian tra cứu không giúp đoán được token |
| SEC-06 | Địa chỉ IP lấy từ `X-Forwarded-For` (Render đứng sau proxy) qua `server.forward-headers-strategy=framework`. Hạn chế: header này giả được (xem `e2e/bugs/known-limitations.md`) |
| SEC-07 | Luồng này không được bỏ qua trạng thái `locked` hay `draft` (BR-34), và không được làm thay đổi giới hạn đăng nhập sai của AUTH-05, ngoài việc xóa bộ đếm khi đặt lại thành công |

## 11. Thay đổi mã nguồn dự kiến

| File | Thay đổi |
| --- | --- |
| `model/UserAccount.java` | Thêm `email`, `sessionVersion` |
| `model/PasswordReset.java` (mới) | Entity `yeu_cau_dat_lai_mk` |
| `repo/PasswordResetRepo.java` (mới) | Đếm theo SĐT/IP trong khoảng thời gian, tìm theo token |
| `service/PasswordResetService.java` (mới) | `request`, `verify`, `reset`, dọn bản ghi cũ |
| `service/mail/*` (mới) | `MailSender`, `SmtpMailSender`, `BrevoMailSender`, `LogMailSender`, `MailTemplates` |
| `service/AuthService.java` | Lưu `sv` vào phiên; `find()` so `sessionVersion`; thêm `clearFailures(phone)` |
| `service/UserService.java` | Kiểm tra và lưu `email` (BR-27); trả `email` trong dữ liệu cho Admin |
| `service/StateService.java` | Chỉ trả `email` cho Admin |
| `service/DataSeeder.java` | Email cho tài khoản demo |
| `web/AuthController.java` | Ba endpoint mới |
| `web/Dto.java` | `ForgotReq`, `VerifyReq`, `ResetReq`; thêm `email` vào form người dùng |
| `config/AppConfig.java` | `@EnableAsync`, `@EnableScheduling`, bean `MailSender` theo `app.mail.provider` |
| `pom.xml` | `spring-boot-starter-mail` |
| `application*.properties` | Các khóa ở mục 9.2 |
| `static/index.html` | Màn B1–B3; ô email ở form Người dùng |
| `README.md`, `DEPLOY.md`, `docs/schema-mysql.sql` | Bảng API, biến môi trường Render, bảng mới |
| `e2e/` | Feature `17-quen-mat-khau.feature`, helper đọc Mailpit, selector mới |

## 12. Kiểm thử

### 12.1 Môi trường

- Chạy Mailpit trên local: `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`, hoặc dùng file chạy trực tiếp. Ứng dụng chạy với `MAIL_PROVIDER=smtp`, `SMTP_PORT=1025`.
- Helper e2e `e2e/helpers/mailpit.ts`: `otpFromMail(email, nth, expected)` tìm mail qua `GET /api/v1/search?query=to:"<email>"` và trích 6 chữ số từ tiêu đề; `setRecipientFailure(on)` bật/tắt lỗi SMTP giả. Mỗi kịch bản dùng email riêng (có runId) nên không cần xóa hộp thư.
- Để test hết hạn mà không phải chờ, chạy instance test với `RESET_OTP_TTL_SECONDS=20`, `RESET_TOKEN_TTL_SECONDS=20` và `RESET_RESEND_COOLDOWN_SECONDS=3`. Test đọc `expiresIn`/`resendAfter` từ API rồi chờ đúng chừng đó; phải chờ quá 30 giây thì tự bỏ qua.
- Mỗi kịch bản gửi yêu cầu từ một IP giả riêng (`X-Forwarded-For`) để không chạm giới hạn theo IP của kịch bản khác.
- TC-AUTH-08-21 dùng chế độ chaos của Mailpit (`--enable-chaos`) để giả lỗi SMTP; TC-AUTH-08-19 cần `APP_LOG`.

### 12.2 Danh sách test case

| Mã | Ưu tiên | Loại | Kịch bản | Kết quả mong đợi |
| --- | --- | --- | --- | --- |
| TC-AUTH-08-01 | P1 | UI+Mail | Luồng chính: Staff có email → gửi mã → nhập OTP từ Mailpit → đặt mật khẩu mới | Toast thành công; về màn Đăng nhập, điền sẵn SĐT; đăng nhập được bằng mật khẩu mới, không đăng nhập được bằng mật khẩu cũ |
| TC-AUTH-08-02 | P1 | API | Phản hồi chung cho 4 loại SĐT: có email; không tồn tại; tài khoản `locked`; tài khoản chưa có email | Cả 4 trả 200 với body giống hệt nhau; chỉ loại đầu có mail trong Mailpit |
| TC-AUTH-08-03 | P1 | API | Đo thời gian phản hồi của SĐT có thật và SĐT không tồn tại, mỗi loại 10 lần | Chênh lệch trung vị dưới 50 ms (NFR-1) |
| TC-AUTH-08-04 | P1 | API | OTP sai 5 lần, rồi nhập OTP đúng | 5 lần đầu và cả lần nhập mã đúng sau đó đều trả 400 cùng thông báo; nhật ký có `PWD_RESET_OTP_LOCKED` |
| TC-AUTH-08-05 | P1 | API | Gửi mã 2 lần, dùng mã của lần 1 | 400 (BR-30); mã của lần 2 dùng được |
| TC-AUTH-08-06 | P1 | API | Gửi lại trong vòng 60 giây; gửi lần thứ 6 trong 1 giờ | 429 kèm `retryAfter`. SĐT không tồn tại cũng nhận 429 giống hệt |
| TC-AUTH-08-07 | P1 | API | Dùng lại reset token lần hai | Lần 2 trả 400 (A8) |
| TC-AUTH-08-08 | P1 | API | Đang đăng nhập ở context A, đặt lại mật khẩu ở context B | Request tiếp theo của A nhận 401 "Phiên đăng nhập không còn hiệu lực…" (BR-34b) |
| TC-AUTH-08-09 | P1 | API | SĐT đang bị khóa tạm vì sai mật khẩu 5 lần → đặt lại mật khẩu | Đăng nhập ngay bằng mật khẩu mới được (BR-34c) |
| TC-AUTH-08-10 | P1 | API | Tài khoản `locked` làm đủ luồng | Không có mail; verify với mã bất kỳ trả 400; trạng thái vẫn `locked` |
| TC-AUTH-08-11 | P2 | API | Mật khẩu mới: 5 ký tự, có khoảng trắng, 73 byte, trùng mật khẩu cũ, hai ô không khớp | 400 với đúng thông báo của từng trường hợp |
| TC-AUTH-08-12 | P2 | API @short-ttl | Chờ OTP hết hạn rồi verify; chờ token hết hạn rồi reset | 400 với thông báo theo A7 và A8 |
| TC-AUTH-08-13 | P2 | UI | B2: đồng hồ đếm ngược, nút Gửi lại khóa 60 giây, dán "123 456" | Đồng hồ giảm; nút bấm được sau khi đếm xong; ô nhận "123456" |
| TC-AUTH-08-14 | P2 | UI | Điều hướng: Quay lại đăng nhập, Đổi số điện thoại, Escape | Không mất SĐT đã nhập; không có lỗi JavaScript |
| TC-AUTH-08-15 | P1 | UI+API | Admin thêm email cho tài khoản, gồm email trùng và email sai định dạng | Lưu được email hợp lệ (đã chuyển chữ thường); email trùng hoặc sai định dạng nhận 400 và lỗi hiện trên form |
| TC-AUTH-08-16 | P1 | API | Quản lý kho và Nhân viên kho đọc `/api/state` | Không có trường `email` trong `users[]` |
| TC-AUTH-08-17 | P2 | UI | Admin mở lịch sử hoạt động của tài khoản vừa đặt lại | Có các dòng "Yêu cầu đặt lại mật khẩu" và "Đặt lại mật khẩu", không chứa OTP |
| TC-AUTH-08-18 | P2 | Mail | Nội dung email OTP và email thông báo | Đúng tiêu đề, có tên người dùng, đúng thời hạn; không có thẻ `<a href>`; email thông báo có IP |
| TC-AUTH-08-19 | P2 | API | Đọc log ứng dụng sau khi chạy hết bộ test | Không chứa OTP hay token (SEC-04) |
| TC-AUTH-08-20 | P3 | API | Từ một IP gửi mã cho 21 SĐT khác nhau trong 1 giờ | Lần thứ 21 trả 429 (giới hạn theo IP) |
| TC-AUTH-08-21 | P2 | API | Dịch vụ mail lỗi (`SMTP_PORT` trỏ tới cổng đóng) | Vẫn trả 200 phản hồi chung; nhật ký có `PWD_RESET_MAIL_FAIL` |

### 12.3 Ví dụ kịch bản Gherkin

```gherkin
# language: vi
@quen-mat-khau
Tính năng: Quên mật khẩu, đặt lại bằng OTP gửi qua email

  @AUTH-08 @TC-AUTH-08-01 @P1 @smoke
  Kịch bản: Nhân viên kho tự đặt lại mật khẩu bằng mã OTP
    Cho fixture [TEST] đã được tạo
    Và T_USER có email "t_user@qlkho.local"
    Và hộp thư Mailpit đã được xóa
    Khi tôi mở màn Đăng nhập và bấm "Quên mật khẩu?"
    Và tôi nhập số điện thoại của T_USER và bấm "Gửi mã xác nhận"
    Thì tôi thấy thông báo "mã xác nhận 6 số đã được gửi"
    Khi tôi nhập mã OTP mới nhất gửi tới "t_user@qlkho.local" và bấm "Xác nhận"
    Và tôi nhập mật khẩu mới "MoiMoi99" hai lần và bấm "Đặt lại mật khẩu"
    Thì toast hiển thị "Đặt lại mật khẩu thành công"
    Và T_USER đăng nhập được bằng mật khẩu "MoiMoi99"
    Và T_USER không đăng nhập được bằng mật khẩu cũ
```

## 13. Triển khai lên Render (khi người dùng yêu cầu deploy)

1. Tạo tài khoản Brevo và xác minh địa chỉ gửi (Senders & IP → Senders). Tạo API key (SMTP & API → API Keys).
2. Trong Render, đặt các biến môi trường `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `MAIL_FROM` và `MAIL_FROM_NAME`.
3. Deploy. Hibernate tự thêm cột và bảng mới vào PostgreSQL trên Aiven.
4. Admin nhập email cho các tài khoản thật.
5. Kiểm tra bằng một tài khoản thử: nhận được mail, đặt lại được mật khẩu, và mail không rơi vào thư mục spam. Nếu mail vào spam, nên dùng tên miền riêng có cấu hình SPF và DKIM.

## 14. Rủi ro và hạn chế đã biết

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Email bị chiếm thì tài khoản cũng bị chiếm | Cao | Email thông báo đổi mật khẩu (BR-36); Admin khóa được tài khoản; nhật ký USR-07 |
| Mail vào spam hoặc đến chậm | Trung bình | Địa chỉ gửi đã xác minh; tiêu đề ngắn có OTP; hướng dẫn kiểm tra thư mục spam ở B2 |
| Vượt hạn mức gói free (Brevo khoảng 300 mail/ngày) | Thấp | Giới hạn BR-31; theo dõi số lượng trong dashboard Brevo |
| Dò OTP 6 số | Thấp | 5 lần thử mỗi mã, 5 mã mỗi giờ, nên tối đa 25 lần đoán mỗi giờ trên 10⁶ khả năng |
| Kẻ xấu gửi mã liên tục làm phiền chủ tài khoản | Thấp | Giới hạn 60 giây và 5 lần mỗi giờ theo SĐT, 20 lần mỗi giờ theo IP |

## 15. Câu hỏi cần chốt

Các lựa chọn dưới đây là mặc định đề xuất trong đặc tả này. Nếu bạn muốn khác, chỉ cần sửa giá trị tương ứng.

1. **Nhận diện bằng SĐT hay email ở B1?** Đề xuất dùng SĐT, cho thống nhất với đăng nhập. Phương án khác là nhập email, nhưng người dùng có thể không nhớ Admin đã khai email nào.
2. **Thời hạn OTP 5 phút, 5 lần sai, gửi lại sau 60 giây, tối đa 5 mã mỗi giờ** có phù hợp không?
3. **Email có bắt buộc** khi Admin tạo tài khoản mới không? Đề xuất: không bắt buộc, để tương thích với dữ liệu cũ.
4. **Có tự đăng nhập sau khi đặt lại không?** Đề xuất: không. Người dùng tự đăng nhập lại để xác nhận đã nhớ mật khẩu mới.
5. **Tài khoản `draft`** có được dùng luồng này để kích hoạt không? Đề xuất: không. Kích hoạt vẫn là việc của Admin.
