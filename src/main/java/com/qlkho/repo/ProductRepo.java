package com.qlkho.repo;

import com.qlkho.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ProductRepo extends JpaRepository<Product, String> {
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, String id);
    List<Product> findAllByOrderByIdAsc();

    @Query("select p.id from Product p")
    List<String> findAllIds();
}
