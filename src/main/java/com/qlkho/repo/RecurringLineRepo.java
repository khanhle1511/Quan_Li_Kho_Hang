package com.qlkho.repo;

import com.qlkho.model.RecurringLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringLineRepo extends JpaRepository<RecurringLine, Long> {
    List<RecurringLine> findByPlanIdOrderByIdAsc(String planId);

    void deleteByPlanId(String planId);
}
