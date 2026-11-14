package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng ke_hoach_dinh_ky – kế hoạch nhập/xuất định kỳ (tháng, quý, năm). Mã DK-0001… Dòng hàng ở ke_hoach_dong_hang. */
@Entity
@Table(name = "ke_hoach_dinh_ky")
public class RecurringPlan {
    @Id @Column(length = 20) public String id;
    /** in | out */
    @Column(nullable = false, length = 5) public String receiptType;
    @Column(nullable = false, length = 20) public String partnerId;
    @Column(nullable = false, length = 20) public String warehouseId;
    /** month | quarter | year */
    @Column(nullable = false, length = 10) public String cycle;
    /** Ngày trong tháng phát sinh phiếu (1–31; tháng ngắn hơn thì lấy ngày cuối tháng) */
    public int dayOfMonth;
    /** Tháng thứ mấy trong chu kỳ: quý 1–3, năm 1–12, tháng luôn 1 */
    public int monthInCycle;
    /** yyyy-MM-dd; kỳ có ngày phát sinh trước ngày này không được sinh phiếu */
    @Column(nullable = false, length = 10) public String startDate;
    /** yyyy-MM-dd, null = không kết thúc */
    @Column(length = 10) public String endDate;
    /** active | paused | ended */
    @Column(nullable = false, length = 10) public String status;
    @Column(length = 300) public String note;
    @Column(length = 100) public String createdBy;
    @Column(length = 20) public String createdAt;
}
