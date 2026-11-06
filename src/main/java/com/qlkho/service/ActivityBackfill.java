package com.qlkho.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * USR-07: chạy lúc khởi động, sau DataSeeder (@Order(1)). Nếu bảng nhật ký còn trống thì suy ra lịch sử
 * từ chứng từ đang có, để tài khoản cũ cũng có lịch sử ngay lần đầu dùng tính năng.
 */
@Component
@Order(2)
public class ActivityBackfill implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(ActivityBackfill.class);
    private final ActivityService activity;

    public ActivityBackfill(ActivityService activity) { this.activity = activity; }

    @Override
    public void run(String... args) {
        int n = activity.backfill();
        if (n > 0) log.info("Lịch sử hoạt động: suy ra {} dòng từ chứng từ cũ", n);
    }
}
