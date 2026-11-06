package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng phieu_kiem_ke. */
@Entity
@Table(name = "phieu_kiem_ke")
public class Stocktake {
    @Id @Column(length = 20) public String id;
    @Column(length = 20) public String createdAt;
    @Column(nullable = false, length = 20) public String warehouseId;
    public int checkedCount;
    public int diffCount;
    @Column(length = 100) public String confirmedBy;
    public long sortKey;
}
