package com.qlkho.repo;

import com.qlkho.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findByPhone(String phone);

    /** AUTH-08 / BR-27: email đã chuẩn hóa (chữ thường). */
    Optional<UserAccount> findByEmail(String email);

    @Query("select u.id from UserAccount u")
    List<String> findAllIds();
}
