package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng chi_tiet_phieu. */
@Entity
@Table(name = "chi_tiet_phieu")
public class ReceiptLine {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 20) public String receiptId;
    @Column(nullable = false, length = 20) public String productId;
    @Column(nullable = false) public int qty;

    public static ReceiptLine of(String receiptId, String productId, int qty) {
        ReceiptLine l = new ReceiptLine();
        l.receiptId = receiptId;
        l.productId = productId;
        l.qty = qty;
        return l;
    }
}
