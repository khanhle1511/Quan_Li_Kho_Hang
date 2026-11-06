package com.qlkho.repo;

import com.qlkho.model.CodeSeq;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface CodeSeqRepo extends JpaRepository<CodeSeq, String> {
    /** Đọc kèm khóa dòng để hai máy chủ dùng chung CSDL không cấp trùng số. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CodeSeq c where c.kind = :kind")
    Optional<CodeSeq> lockByKind(String kind);
}
