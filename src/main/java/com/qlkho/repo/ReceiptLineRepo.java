package com.qlkho.repo;

import com.qlkho.model.ReceiptLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReceiptLineRepo extends JpaRepository<ReceiptLine, Long> {
    List<ReceiptLine> findByReceiptIdOrderByIdAsc(String receiptId);
    List<ReceiptLine> findAllByOrderByIdAsc();
}
