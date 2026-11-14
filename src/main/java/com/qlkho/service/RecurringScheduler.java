package com.qlkho.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Điểm kích hoạt việc sinh phiếu định kỳ: lúc khởi động và mỗi ngày một lần. Khi có người đăng nhập, AuthController
 * gọi thêm. Có nhiều điểm kích hoạt là có chủ đích: bản chạy miễn phí có thể "ngủ" suốt ngày đến hạn nên không thể
 * dựa riêng vào bộ hẹn giờ. Chạy lại bao nhiêu lần cũng không sinh trùng (mỗi kế hoạch + kỳ chỉ có một kết quả).
 */
@Component
@Order(10) // sau DataSeeder (1) để kế hoạch mẫu đã có
public class RecurringScheduler implements CommandLineRunner {
    private final RecurringService recurring;

    public RecurringScheduler(RecurringService recurring) {
        this.recurring = recurring;
    }

    @Override
    public void run(String... args) {
        recurring.runDueSafely();
    }

    @Scheduled(cron = "0 10 0 * * *", zone = "Asia/Ho_Chi_Minh")
    public void daily() {
        recurring.runDueSafely();
    }
}
