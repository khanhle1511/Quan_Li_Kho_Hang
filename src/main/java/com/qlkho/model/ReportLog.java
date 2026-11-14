package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng bao_cao – lịch sử báo cáo nhập – xuất – tồn do Quản trị viên xuất; nội dung file ở bao_cao_noi_dung. */
@Entity
@Table(name = "bao_cao")
public class ReportLog {
    @Id @Column(length = 20) public String id;
    @Column(nullable = false, length = 20) public String createdAt;
    public long sortKey;
    @Column(length = 20) public String creatorId;
    @Column(length = 100) public String creatorName;
    /** null = tất cả kho */
    @Column(length = 20) public String warehouseId;
    @Column(nullable = false, length = 100) public String warehouseLabel;
    @Column(nullable = false, length = 30) public String period;
    public int productCount;
    public long totalBegin;
    public long totalIn;
    public long totalOut;
    public long totalAdjust;
    public long totalEnd;
    @Column(nullable = false, length = 120) public String fileName;
}
