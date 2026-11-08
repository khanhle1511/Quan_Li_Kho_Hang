package com.qlkho.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.security.SecureRandom;

/**
 * Cấu hình chung.
 * AUTH-08: bật @Async (gửi mail chạy nền để thời gian phản hồi không lộ tài khoản có thật)
 * và @Scheduled (dọn yêu cầu đặt lại mật khẩu cũ).
 */
@Configuration
@EnableAsync
@EnableScheduling
@EnableConfigurationProperties({ResetProperties.class, MailProperties.class})
public class AppConfig {
    /** Mật khẩu được lưu dạng băm BCrypt, không lưu bản rõ. */
    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Nguồn ngẫu nhiên an toàn cho OTP và reset token. */
    @Bean
    public SecureRandom secureRandom() {
        return new SecureRandom();
    }
}
