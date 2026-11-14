package com.qlkho.repo;

import com.qlkho.model.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseRepo extends JpaRepository<Warehouse, String> {
    boolean existsByNameIgnoreCaseAndIdNot(String name, String id);
    long countByStatus(String status);
    List<Warehouse> findByStatus(String status);
    List<Warehouse> findAllByOrderByOpenedAsc();
}
