package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng ma_tiep_theo – bộ đếm chỉ tăng cho từng loại mã (BUG-011). Mã tài khoản lấy từ đây thay vì
 * "mã lớn nhất đang tồn tại + 1", nên mã của tài khoản đã xóa không bao giờ được cấp lại cho người khác.
 */
@Entity
@Table(name = "ma_tiep_theo")
public class CodeSeq {
    /** Loại mã, ví dụ "U" */
    @Id @Column(length = 10) public String kind;
    /** Số thứ tự sẽ cấp cho bản ghi tiếp theo */
    public int next;
}
