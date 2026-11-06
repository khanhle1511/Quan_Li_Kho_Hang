package com.qlkho.repo;

import com.qlkho.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepo extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserIdOrderBySortKeyDescIdDesc(String userId);
}
