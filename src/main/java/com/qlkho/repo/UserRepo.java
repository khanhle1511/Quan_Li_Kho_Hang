package com.qlkho.repo;

import com.qlkho.model.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepo extends JpaRepository<UserAccount, String> {
    Optional<UserAccount> findByPhone(String phone);

    @Query("select u.id from UserAccount u")
    List<String> findAllIds();
}
