package com.qlkho.service.mail;

import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Gửi email của luồng quên mật khẩu ở luồng nền (@Async), để thời gian phản hồi API như nhau
 * dù có gửi mail hay không (BR-28). Lỗi gửi không ném ra ngoài: ghi log (không có OTP) và nhật ký PWD_RESET_MAIL_FAIL.
 */
@Component
public class PasswordResetMailer {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailer.class);

    private final MailGateway gateway;
    private final ActivityService activity;

    public PasswordResetMailer(MailGateway gateway, ActivityService activity) {
        this.gateway = gateway;
        this.activity = activity;
    }

    @Async
    public void sendOtp(UserAccount u, String otp, Duration ttl) {
        deliver(u, MailTemplates.otp(u, otp, ttl), "mã xác nhận");
    }

    @Async
    public void sendPasswordChanged(UserAccount u, String ip) {
        deliver(u, MailTemplates.passwordChanged(u, Rules.now(), ip), "thông báo đổi mật khẩu");
    }

    private void deliver(UserAccount u, MailMessage message, String what) {
        try {
            gateway.send(message);
        } catch (RuntimeException e) {
            log.warn("Không gửi được email {} cho tài khoản {}: {}", what, u.id, e.getMessage());
            activity.record(u, "PWD_RESET_MAIL_FAIL", "USER", u.id, "không gửi được email " + what);
        }
    }
}
