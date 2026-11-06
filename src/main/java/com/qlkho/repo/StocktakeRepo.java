package com.qlkho.repo;

import com.qlkho.model.Stocktake;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface StocktakeRepo extends JpaRepository<Stocktake, String> {
    List<Stocktake> findAllByOrderBySortKeyDesc();

    @Query("select s.id from Stocktake s")
    List<String> findAllIds();
}
