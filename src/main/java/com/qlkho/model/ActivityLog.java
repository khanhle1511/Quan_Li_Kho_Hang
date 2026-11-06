package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng nhat_ky_hoat_dong – mỗi thao tác của một tài khoản là một dòng (USR-07).
 * Dòng có inferred = true được suy ra từ chứng từ cũ lúc khởi động (ActivityBackfill), không phải ghi lúc thao tác.
 * byOther: tên người khác đã thực hiện lên tài khoản này (ví dụ Admin khóa tài khoản), null nếu tự làm.
 */
@Entity
@Table(name = "nhat_ky_hoat_dong", indexes = @Index(name = "idx_nk_user", columnList = "user_id"))
public class ActivityLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(name = "user_id", nullable = false, length = 20) public String userId;
    @Column(length = 100) public String userName;
    @Column(length = 10) public String userRole;
    /** AUTH | RECEIPT | STOCKTAKE | CATALOG | USER | WAREHOUSE */
    @Column(nullable = false, length = 20) public String category;
    /** Mã hành động: LOGIN, RECEIPT_CREATE, USER_STATUS… (xem ActivityService.LABEL) */
    @Column(nullable = false, length = 30) public String action;
    @Column(length = 20) public String targetType;
    @Column(length = 40) public String targetId;
    @Column(length = 500) public String detail;
    /** dd/MM/yyyy HH:mm */
    @Column(length = 20) public String createdAt;
    /** Mili-giây để sắp xếp mới nhất lên đầu (chứng từ cũ: suy từ createdAt) */
    public long sortKey;
    public boolean inferred;
    @Column(length = 100) public String byOther;
}
