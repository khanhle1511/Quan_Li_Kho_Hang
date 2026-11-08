package com.qlkho.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** AUTH-08: cách gửi mail và địa chỉ người gửi (khóa app.mail.*). */
@ConfigurationProperties("app.mail")
public record MailProperties(String provider, String from, String fromName, String brevoApiKey) {}
