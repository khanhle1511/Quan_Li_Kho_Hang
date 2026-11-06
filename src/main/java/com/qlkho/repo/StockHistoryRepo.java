package com.qlkho.repo;

import com.qlkho.model.StockHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockHistoryRepo extends JpaRepository<StockHistory, Long> {
    List<StockHistory> findAllByOrderByIdDesc();
}
