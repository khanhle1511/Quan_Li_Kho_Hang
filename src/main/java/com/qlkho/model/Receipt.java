package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng phieu – phiếu nhập (in) hoặc phiếu xuất (out). Mã phiếu là khóa chính (PN-0001, PX-0001). */
@Entity
@Table(name = "phieu")
public class Receipt {
    @Id @Column(length = 20) public String id;
    /** in | out */
    @Column(nullable = false, length = 5) public String receiptType;
    @Column(nullable = false, length = 20) public String partnerId;
    @Column(nullable = false, length = 20) public String warehouseId;
    @Column(length = 20) public String createdAt;
    /** pending | approved | cancelled */
    @Column(nullable = false, length = 12) public String status;
    @Column(length = 20) public String creatorId;
    @Column(length = 100) public String creatorName;
    @Column(length = 100) public String approverName;
    /** Thời điểm duyệt / từ chối (dd/MM/yyyy HH:mm); null khi còn chờ duyệt hoặc phiếu cũ trước khi có cột này */
    @Column(length = 20) public String decidedAt;
    @Column(length = 500) public String note;
    /** Dùng để sắp xếp: mới nhất lên đầu */
    public long sortKey;
}
