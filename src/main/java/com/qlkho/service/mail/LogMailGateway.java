package com.qlkho.service.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Không gửi thật, chỉ in nội dung ra log. CHỈ dùng khi dev (app.mail.provider=log):
 * đây là ngoại lệ duy nhất được phép để mã OTP xuất hiện trong log (SEC-04).
 */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "log")
public class LogMailGateway implements MailGateway {
    private static final Logger log = LoggerFactory.getLogger(LogMailGateway.class);

    @Override
    public void send(MailMessage m) {
        log.info("[MAIL → {}] {}\n{}", m.to(), m.subject(), m.text());
    }
}
