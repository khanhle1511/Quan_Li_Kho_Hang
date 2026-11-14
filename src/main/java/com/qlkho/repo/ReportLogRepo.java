package com.qlkho.repo;

import com.qlkho.model.ReportLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ReportLogRepo extends JpaRepository<ReportLog, String> {
    List<ReportLog> findAllByOrderBySortKeyDesc();

    @Query("select r.id from ReportLog r")
    List<String> findAllIds();
}
