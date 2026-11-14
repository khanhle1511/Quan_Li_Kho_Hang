package com.qlkho.repo;

import com.qlkho.model.RecurringOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecurringOverrideRepo extends JpaRepository<RecurringOverride, Long> {
    List<RecurringOverride> findByPlanIdAndPeriodKeyOrderByIdAsc(String planId, String periodKey);

    void deleteByPlanId(String planId);

    void deleteByPlanIdAndPeriodKey(String planId, String periodKey);
}
