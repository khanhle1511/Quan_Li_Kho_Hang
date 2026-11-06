package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng ho_so_doi_tac – thông tin file PDF. Nội dung file nằm trong bảng ho_so_noi_dung
 * (storedPath = "db"); giá trị khác là đường dẫn tương đối trong thư mục uploads của bản cũ.
 */
@Entity
@Table(name = "ho_so_doi_tac")
public class PartnerFile {
    public static final String IN_DB = "db";

    @Id @Column(length = 40) public String id;
    @Column(nullable = false, length = 20) public String partnerId;
    @Column(nullable = false, length = 255) public String fileName;
    public long fileSize;
    @Column(length = 20) public String uploadedAt;
    @Column(length = 100) public String uploadedBy;
    @Column(nullable = false, length = 300) public String storedPath;

    public boolean inDb() { return IN_DB.equals(storedPath); }
}
