package com.qlkho.web;

import java.util.List;

/** Dữ liệu giao diện gửi lên (JSON → record). */
public final class Dto {
    private Dto() {}

    public record Login(String phone, String password) {}

    /** AUTH-08: B1 – yêu cầu mã, B2 – kiểm tra mã, B3 – đặt mật khẩu mới. */
    public record ForgotRequest(String phone) {}

    public record ForgotVerify(String phone, String otp) {}

    public record ForgotReset(String resetToken, String password, String confirm) {}

    public record Line(String productId, Integer qty) {}

    public record NewReceipt(String type, String partnerId, String warehouseId, String note, List<Line> lines) {}

    /** system = số hệ thống lúc mở phiên kiểm kê (giao diện gửi kèm); null = so với tồn hiện tại. Xem BUG-008. */
    public record CountRow(String productId, Integer actual, Integer system) {}

    public record NewStocktake(String warehouseId, List<CountRow> rows) {}

    public record NewProduct(String sku, String name, String category, String unit, Integer minStock) {}

    public record PartnerForm(String name, String phone, String email, String address) {}

    public record NoteForm(String note) {}

    /** Kế hoạch nhập/xuất định kỳ: cycle = month/quarter/year; day = ngày trong tháng; monthInCycle = tháng thứ mấy trong chu kỳ. */
    public record PlanForm(String type, String partnerId, String warehouseId, String cycle, Integer day, Integer monthInCycle,
                           String startDate, String endDate, String note, List<Line> lines) {}

    /** Dòng hàng điều chỉnh riêng cho kỳ tới của một kế hoạch. */
    public record PlanLines(List<Line> lines) {}

    /** warehouseId (BR-36): kho làm việc của Quản lý kho / Nhân viên kho; khi sửa, null = giữ nguyên, "" = bỏ phân kho. */
    public record UserForm(String name, String phone, String email, String password, String role, String opened, String status,
                           String warehouseId) {}

    public record StatusForm(String status) {}

    /** managerId (BR-36): Quản lý kho của kho; trống = bỏ phân công. */
    public record WarehouseForm(String name, String address, String managerId, String phone, Integer capacity, String status) {}

    /** Admin xuất báo cáo nhập – xuất – tồn; warehouseId trống hoặc "all" = tất cả kho. */
    public record ReportRequest(String warehouseId) {}
}
