package com.qlkho.repo;

import com.qlkho.model.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReceiptRepo extends JpaRepository<Receipt, String> {
    /**
     * Đổi trạng thái phiếu một cách nguyên tử: chỉ cập nhật khi phiếu còn chờ duyệt.
     * Trả về số dòng đã cập nhật: 1 = request này được xử lý phiếu, 0 = phiếu đã được request khác xử lý.
     * CSDL khóa dòng khi UPDATE nên các request đồng thời chạy tuần tự và chỉ một request thấy status = pending.
     */
    @Modifying
    @Query("update Receipt r set r.status = :status, r.approverName = :approverName where r.id = :id and r.status = 'pending'")
    int finishPending(String id, String status, String approverName);

    List<Receipt> findAllByOrderBySortKeyDesc();
    long countByStatus(String status);
    long countByWarehouseIdAndStatus(String warehouseId, String status);

    /** Chỉ lấy mã phiếu (không tải cả bản ghi) để sinh mã kế tiếp. */
    @Query("select r.id from Receipt r where r.id like concat(:prefix, '%')")
    List<String> findIdsByPrefix(String prefix);
}
