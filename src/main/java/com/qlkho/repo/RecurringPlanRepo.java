package com.qlkho.repo;

import com.qlkho.model.RecurringPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface RecurringPlanRepo extends JpaRepository<RecurringPlan, String> {
    List<RecurringPlan> findByStatus(String status);

    @Query("select p.id from RecurringPlan p")
    List<String> findAllIds();
}
