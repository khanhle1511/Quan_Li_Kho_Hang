package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng ke_hoach_dong_hang – hàng và số lượng cố định của một kế hoạch định kỳ. */
@Entity
@Table(name = "ke_hoach_dong_hang")
public class RecurringLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 20) public String planId;
    @Column(nullable = false, length = 20) public String productId;
    @Column(nullable = false) public int qty;

    public static RecurringLine of(String planId, String productId, int qty) {
        RecurringLine l = new RecurringLine();
        l.planId = planId;
        l.productId = productId;
        l.qty = qty;
        return l;
    }
}
