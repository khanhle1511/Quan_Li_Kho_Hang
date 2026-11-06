package com.qlkho.repo;

import com.qlkho.model.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface StockRepo extends JpaRepository<Stock, String> {
    @Query("select coalesce(sum(s.qty), 0) from Stock s where s.warehouseId = :warehouseId")
    long sumQtyByWarehouseId(String warehouseId);

    /**
     * Đọc tồn kèm khóa dòng (SELECT … FOR UPDATE) để hai transaction cùng cộng/trừ một mặt hàng
     * không ghi đè kết quả của nhau. Chỉ dùng trong transaction ghi (duyệt phiếu, kiểm kê).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Stock s where s.id in :ids")
    List<Stock> lockAllById(Collection<String> ids);

    void deleteByWarehouseId(String warehouseId);
}
