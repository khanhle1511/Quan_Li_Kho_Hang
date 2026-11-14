package com.qlkho.repo;

import com.qlkho.model.Partner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerRepo extends JpaRepository<Partner, String> {
    List<Partner> findAllByOrderByIdAsc();
}
