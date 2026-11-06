package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng doi_tac – nhà cung cấp (sup) hoặc khách hàng (cus). */
@Entity
@Table(name = "doi_tac")
public class Partner {
    @Id @Column(length = 20) public String id;
    /** sup | cus */
    @Column(nullable = false, length = 5) public String partnerType;
    @Column(nullable = false, length = 150) public String name;
    @Column(length = 15) public String phone;
    @Column(length = 120) public String email;
    @Column(length = 200) public String address;
    @Column(length = 2000) public String note;
    @Column(length = 20) public String noteAt;
    @Column(length = 100) public String noteBy;
}
