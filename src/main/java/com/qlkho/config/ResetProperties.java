package com.qlkho.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/** AUTH-08: thời hạn và giới hạn của luồng quên mật khẩu (khóa app.reset.* trong application.properties). */
@ConfigurationProperties("app.reset")
public record ResetProperties(
        long otpTtlSeconds,
        long tokenTtlSeconds,
        long resendCooldownSeconds,
        int maxOtpAttempts,
        int maxRequestsPerPhoneHour,
        int maxRequestsPerIpHour,
        int maxVerifiesPerIpHour) {

    public Duration otpTtl() { return Duration.ofSeconds(otpTtlSeconds); }

    public Duration tokenTtl() { return Duration.ofSeconds(tokenTtlSeconds); }

    public Duration resendCooldown() { return Duration.ofSeconds(resendCooldownSeconds); }
}
