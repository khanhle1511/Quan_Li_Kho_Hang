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

    public record NewProduct(String sku, String name, String category, String unit, Integer minStock, Long price) {}

    public record PartnerForm(String type, String name, String phone, String email, String address, String note) {}

    public record NoteForm(String note) {}

    public record UserForm(String name, String phone, String email, String password, String role, String opened, String status) {}

    public record StatusForm(String status) {}

    public record WarehouseForm(String code, String name, String address, String keeperId, String phone,
                                Integer capacity, String opened, String status) {}
}
