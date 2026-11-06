package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng kho. */
@Entity
@Table(name = "kho")
public class Warehouse {
    @Id @Column(length = 20) public String id;
    @Column(nullable = false, unique = true, length = 20) public String code;
    @Column(nullable = false, length = 100) public String name;
    @Column(length = 200) public String address;
    /** Khóa ngoại tới nguoi_dung.id (thủ kho phụ trách), có thể null */
    @Column(length = 20) public String keeperId;
    @Column(length = 15) public String phone;
    /** Sức chứa tối đa (đơn vị), 0 = không giới hạn */
    public int capacity;
    @Column(length = 10) public String opened;
    /** active | paused */
    @Column(nullable = false, length = 10) public String status;
}
