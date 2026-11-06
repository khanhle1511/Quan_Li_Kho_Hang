package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng hang_hoa. */
@Entity
@Table(name = "hang_hoa")
public class Product {
    @Id @Column(length = 20) public String id;
    @Column(nullable = false, unique = true, length = 30) public String sku;
    @Column(nullable = false, length = 150) public String name;
    @Column(length = 80) public String category;
    @Column(nullable = false, length = 20) public String unit;
    /** Mức tồn tối thiểu cho mỗi kho */
    public int minStock;
    /** Giá vốn (đồng) */
    public long price;
}
