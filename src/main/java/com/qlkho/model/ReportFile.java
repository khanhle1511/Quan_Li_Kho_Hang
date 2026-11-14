package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng bao_cao_noi_dung – file Excel của báo cáo, tách khỏi bao_cao để liệt kê lịch sử không phải tải nội dung. */
@Entity
@Table(name = "bao_cao_noi_dung")
public class ReportFile {
    /** Hibernate tự chọn kiểu theo CSDL như {@link PartnerFileContent}. */
    public static final int MAX_BYTES = 5_000_000;

    @Id @Column(length = 20) public String id; // trùng với bao_cao.id
    @Column(nullable = false, length = MAX_BYTES)
    public byte[] data;
}
