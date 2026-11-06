package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng ton_kho – số lượng tồn của một mặt hàng tại một kho. Khóa = productId|warehouseId. */
@Entity
@Table(name = "ton_kho")
public class Stock {
    @Id @Column(length = 45) public String id;
    @Column(nullable = false, length = 20) public String productId;
    @Column(nullable = false, length = 20) public String warehouseId;
    @Column(nullable = false) public int qty;

    public static String key(String productId, String warehouseId) {
        return productId + "|" + warehouseId;
    }

    public static Stock of(String productId, String warehouseId, int qty) {
        Stock s = new Stock();
        s.id = key(productId, warehouseId);
        s.productId = productId;
        s.warehouseId = warehouseId;
        s.qty = qty;
        return s;
    }
}
