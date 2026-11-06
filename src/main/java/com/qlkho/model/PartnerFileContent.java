package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng ho_so_noi_dung – nội dung nhị phân của file PDF, tách riêng khỏi ho_so_doi_tac
 * để khi liệt kê hồ sơ không phải tải cả nội dung file. Lưu trong CSDL nên không mất
 * khi máy chủ (Render, Railway…) khởi động lại.
 */
@Entity
@Table(name = "ho_so_noi_dung")
public class PartnerFileContent {
    @Id @Column(length = 40) public String id;   // trùng với ho_so_doi_tac.id
    @Lob
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    public byte[] data;
}
