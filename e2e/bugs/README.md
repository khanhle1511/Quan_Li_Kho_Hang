# Theo dõi bug

Nơi ghi nhận lỗi phát hiện khi kiểm thử (tay hoặc tự động) và trạng thái xử lý.

```
bugs/
├── BUGS.md               bảng tổng hợp: mỗi bug một dòng, trạng thái, mức độ
├── TEMPLATE.md           mẫu báo cáo (theo đặc tả mục 12)
├── known-limitations.md  hạn chế đã biết, không tính là bug (RISK-11, RISK-12…)
├── open/                 bug chưa sửa: BUG-001-ten-ngan.md
└── closed/               bug đã sửa hoặc đóng (chuyển file từ open/ sang, ghi commit sửa)
```

## Quy trình

1. **Phát hiện**: test thất bại hoặc thao tác tay thấy sai. Xác định trước là lỗi của code hay của test. Nếu là lỗi test thì sửa test, không tạo bug.
2. **Ghi nhận**: copy `TEMPLATE.md` thành `open/BUG-xxx-ten-ngan.md` (số tăng dần, 3 chữ số). Điền đủ môi trường, vai trò, bước tái hiện, kết quả thực tế / mong đợi, test phát hiện. Kèm ảnh chụp hoặc response JSON nếu có.
3. **Cập nhật bảng** `BUGS.md`: thêm một dòng.
4. **Sửa**: commit sửa code ghi rõ `Fix BUG-xxx` trong thông điệp. Nếu có test tự động thì bật lại test (bỏ `test.fixme`).
5. **Đóng**: chuyển file sang `closed/`, ghi commit sửa và ngày đóng vào cuối file, đổi trạng thái trong `BUGS.md`.

## Mức độ

| Mức | Ý nghĩa |
| --- | --- |
| Critical | Sai số tồn, mất dữ liệu, vượt quyền, không đăng nhập được |
| Major | Chức năng chính không dùng được hoặc cho kết quả sai nhưng có cách đi vòng |
| Minor | Hiển thị, thông báo, tiện dụng |

## Liên hệ với test tự động

- Test cho nghi vấn trong đặc tả (mục 11) đặt tên `risk_…`; khi thất bại vì code thì tạo bug, giữ test và đánh dấu `test.fixme('BUG-xxx')` kèm mã bug.
- Báo cáo đi qua toàn bộ luồng ngày 07/11/2026 nằm ở `../qa/walkthrough-2026-11-07/` (71/71 bước đạt, chưa ghi nhận bug).
