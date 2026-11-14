package com.qlkho.common;

import com.qlkho.model.UserAccount;

/**
 * BR-37: phạm vi kho của người dùng. Quản trị viên thao tác mọi kho; Quản lý kho và Nhân viên kho chỉ
 * lập phiếu, duyệt, kiểm kê và xem số liệu của kho mình được phân công.
 */
public final class WarehouseScope {
    private WarehouseScope() {}

    public static boolean allWarehouses(UserAccount u) {
        return Rules.ADMIN.equals(u.role);
    }

    public static boolean canUse(UserAccount u, String warehouseId) {
        return allWarehouses(u) || (u.warehouseId != null && u.warehouseId.equals(warehouseId));
    }

    /** Chặn thao tác ngoài kho của mình; {@code action} là động từ trong thông báo, ví dụ "lập phiếu". */
    public static void check(UserAccount u, String warehouseId, String action) {
        if (canUse(u, warehouseId)) return;
        throw new ApiException(403, u.warehouseId == null
                ? "Tài khoản của bạn chưa được phân kho nên không thể " + action + ". Hãy liên hệ Quản trị viên."
                : "Bạn chỉ được " + action + " tại kho mình làm việc.");
    }
}
