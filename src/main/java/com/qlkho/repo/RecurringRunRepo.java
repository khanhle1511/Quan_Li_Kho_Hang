package com.qlkho.repo;

import com.qlkho.model.RecurringRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringRunRepo extends JpaRepository<RecurringRun, Long> {
    boolean existsByPlanIdAndPeriodKey(String planId, String periodKey);

    List<RecurringRun> findAllByOrderBySortKeyDesc();
}
