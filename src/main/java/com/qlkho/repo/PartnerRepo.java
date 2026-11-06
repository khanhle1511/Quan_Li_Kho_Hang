package com.qlkho.repo;

import com.qlkho.model.Partner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface PartnerRepo extends JpaRepository<Partner, String> {
    List<Partner> findAllByOrderByIdAsc();

    @Query("select p.id from Partner p where p.id like concat(:prefix, '%')")
    List<String> findIdsByPrefix(String prefix);
}
