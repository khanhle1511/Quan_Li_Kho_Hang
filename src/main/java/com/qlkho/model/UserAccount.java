package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng nguoi_dung – tài khoản đăng nhập bằng số điện thoại. */
@Entity
@Table(name = "nguoi_dung")
public class UserAccount {
    @Id @Column(length = 20) public String id;
    @Column(nullable = false, length = 100) public String name;
    @Column(nullable = false, unique = true, length = 15) public String phone;
    @Column(nullable = false, length = 100) public String passwordHash;
    /** admin | manager | staff */
    @Column(nullable = false, length = 10) public String role;
    /** Ngày mở tài khoản, dạng yyyy-MM-dd */
    @Column(length = 10) public String opened;
    /** active | draft | locked */
    @Column(nullable = false, length = 10) public String status;
}
