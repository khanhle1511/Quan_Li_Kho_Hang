package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng ke_hoach_lan_chay – kết quả xử lý từng kỳ của một kế hoạch: đã sinh phiếu hoặc bị bỏ qua.
 * Ràng buộc duy nhất (kế hoạch, kỳ) bảo đảm mỗi kỳ chỉ sinh một phiếu, kể cả khi nhiều máy chủ cùng chạy.
 */
@Entity
@Table(name = "ke_hoach_lan_chay", uniqueConstraints = @UniqueConstraint(columnNames = {"planId", "periodKey"}))
public class RecurringRun {
    public static final String GENERATED = "generated";
    public static final String SKIPPED = "skipped";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @Column(nullable = false, length = 20) public String planId;
    /** 2027-Q1 (quý), 2027-03 (tháng), 2027 (năm) */
    @Column(nullable = false, length = 12) public String periodKey;
    /** Ngày đến hạn của kỳ (yyyy-MM-dd) */
    @Column(nullable = false, length = 10) public String dueDate;
    /** generated | skipped */
    @Column(nullable = false, length = 10) public String status;
    /** Mã phiếu đã sinh; null khi bỏ qua */
    @Column(length = 20) public String receiptId;
    /** Ghi chú: "Tự động", "Chạy ngay bởi …", lý do bỏ qua */
    @Column(length = 300) public String reason;
    @Column(length = 20) public String createdAt;
    public long sortKey;
}
