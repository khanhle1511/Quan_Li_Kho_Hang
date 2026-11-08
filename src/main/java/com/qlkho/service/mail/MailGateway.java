package com.qlkho.service.mail;

/**
 * Cổng gửi mail (AUTH-08). Chọn cách cài đặt bằng app.mail.provider:
 * smtp → {@link SmtpMailGateway}, brevo → {@link BrevoMailGateway}, log → {@link LogMailGateway}.
 * Lỗi gửi được ném ra dưới dạng {@link MailDeliveryException}.
 */
public interface MailGateway {
    void send(MailMessage message);
}
