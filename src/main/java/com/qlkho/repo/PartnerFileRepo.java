package com.qlkho.repo;

import com.qlkho.model.PartnerFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerFileRepo extends JpaRepository<PartnerFile, String> {
    List<PartnerFile> findByPartnerIdOrderByUploadedAtDesc(String partnerId);
}
