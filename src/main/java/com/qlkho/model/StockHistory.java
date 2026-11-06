package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng the_kho – mỗi biến động tồn (Nhập, Xuất, Kiểm kê) là một dòng. */
@Entity
@Table(name = "the_kho")
public class StockHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(length = 20) public String happenedAt;
    @Column(nullable = false, length = 20) public String productId;
    @Column(nullable = false, length = 20) public String warehouseId;
    /** Nhập | Xuất | Kiểm kê */
    @Column(nullable = false, length = 20) public String kind;
    public int delta;
    public int qtyAfter;
    /** Mã chứng từ: PN-xxxx, PX-xxxx, KK-xxxx */
    @Column(length = 20) public String ref;

    public static StockHistory of(String happenedAt, String productId, String warehouseId,
                                  String kind, int delta, int qtyAfter, String ref) {
        StockHistory h = new StockHistory();
        h.happenedAt = happenedAt;
        h.productId = productId;
        h.warehouseId = warehouseId;
        h.kind = kind;
        h.delta = delta;
        h.qtyAfter = qtyAfter;
        h.ref = ref;
        return h;
    }
}
