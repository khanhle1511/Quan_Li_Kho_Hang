package com.qlkho.model;

import jakarta.persistence.*;

/** Bảng ho_so_doi_tac – thông tin file PDF. Nội dung file nằm trong bảng ho_so_noi_dung (cùng id). */
@Entity
@Table(name = "ho_so_doi_tac")
public class PartnerFile {
    /** Giá trị duy nhất hiện dùng của storedPath; cột giữ lại để tương thích CSDL đã tạo trước đây. */
    public static final String IN_DB = "db";

    @Id @Column(length = 40) public String id;
    @Column(nullable = false, length = 20) public String partnerId;
    @Column(nullable = false, length = 255) public String fileName;
    public long fileSize;
    @Column(length = 20) public String uploadedAt;
    @Column(length = 100) public String uploadedBy;
    @Column(nullable = false, length = 300) public String storedPath;
}
