package com.qlkho.repo;

import com.qlkho.model.ReportFile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportFileRepo extends JpaRepository<ReportFile, String> {
}
