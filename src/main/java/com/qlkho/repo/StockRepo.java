package com.qlkho.repo;

import com.qlkho.model.Stock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StockRepo extends JpaRepository<Stock, String> {
    @Query("select coalesce(sum(s.qty), 0) from Stock s where s.warehouseId = :warehouseId")
    long sumQtyByWarehouseId(String warehouseId);

    void deleteByWarehouseId(String warehouseId);
}
