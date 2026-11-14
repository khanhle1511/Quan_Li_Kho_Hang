package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng ke_hoach_dieu_chinh – dòng hàng điều chỉnh riêng cho một kỳ chưa chạy. Kỳ nào có dòng điều chỉnh thì dùng
 * các dòng này thay cho dòng của kế hoạch; kế hoạch gốc không đổi. Xóa khi kỳ đó đã sinh phiếu hoặc bị bỏ qua.
 */
@Entity
@Table(name = "ke_hoach_dieu_chinh")
public class RecurringOverride {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 20) public String planId;
    @Column(nullable = false, length = 12) public String periodKey;
    @Column(nullable = false, length = 20) public String productId;
    @Column(nullable = false) public int qty;

    public static RecurringOverride of(String planId, String periodKey, String productId, int qty) {
        RecurringOverride o = new RecurringOverride();
        o.planId = planId;
        o.periodKey = periodKey;
        o.productId = productId;
        o.qty = qty;
        return o;
    }
}
