package com.qlkho.repo;

import com.qlkho.model.PasswordReset;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** AUTH-08: yêu cầu đặt lại mật khẩu. Các truy vấn có khóa ghi để hai request song song không cùng dùng một mã. */
public interface PasswordResetRepo extends JpaRepository<PasswordReset, Long> {
    /** Các yêu cầu của một SĐT từ thời điểm {@code since}, mới nhất trước (BR-31). */
    List<PasswordReset> findByPhoneAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(String phone, long since);

    long countByRequestIpAndCreatedAtGreaterThanEqual(String requestIp, long since);

    Optional<PasswordReset> findFirstByRequestIpAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(String requestIp, long since);

    List<PasswordReset> findByPhoneAndStatusIn(String phone, Collection<String> statuses);

    /** Các yêu cầu của SĐT ở trạng thái cho trước, mới nhất trước, có khóa ghi (BR-32). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PasswordReset r where r.phone = :phone and r.status in :statuses order by r.createdAt desc, r.id desc")
    List<PasswordReset> lockByPhoneAndStatusIn(@Param("phone") String phone, @Param("statuses") Collection<String> statuses);

    /** Tra theo bản băm SHA-256 của reset token, có khóa ghi để token chỉ dùng được một lần (BR-33). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PasswordReset r where r.tokenHash = :tokenHash")
    Optional<PasswordReset> lockByTokenHash(@Param("tokenHash") String tokenHash);

    @Modifying
    @Query("delete from PasswordReset r where r.createdAt < :before")
    int deleteCreatedBefore(@Param("before") long before);
}
