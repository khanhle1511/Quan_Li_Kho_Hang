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
    /** AUTH-08 / BR-27: email nhận mã OTP khi quên mật khẩu; null = chưa có. Lưu dạng chữ thường. */
    @Column(unique = true, length = 254) public String email;
    /**
     * AUTH-08 / BR-34: tăng mỗi lần đặt lại mật khẩu để hủy mọi phiên đang mở.
     * Để null được (không có giá trị mặc định ở CSDL) vì ddl-auto=update thêm cột vào bảng đã có dữ liệu.
     */
    @Column(name = "session_version") public Integer sessionVersion;
    /**
     * BR-36: kho làm việc của Quản lý kho / Nhân viên kho (null = chưa phân kho, hoặc Quản trị viên).
     * Mỗi kho có tối đa một Quản lý kho và nhiều Nhân viên kho.
     */
    @Column(length = 20) public String warehouseId;

    public int sessionVersion() { return sessionVersion == null ? 0 : sessionVersion; }

    public void bumpSessionVersion() { sessionVersion = sessionVersion() + 1; }
}
