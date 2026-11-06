package com.qlkho.repo;

import com.qlkho.model.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReceiptRepo extends JpaRepository<Receipt, String> {
    List<Receipt> findAllByOrderBySortKeyDesc();
    long countByStatus(String status);
    long countByWarehouseIdAndStatus(String warehouseId, String status);

    /** Chỉ lấy mã phiếu (không tải cả bản ghi) để sinh mã kế tiếp. */
    @Query("select r.id from Receipt r where r.id like concat(:prefix, '%')")
    List<String> findIdsByPrefix(String prefix);
}
