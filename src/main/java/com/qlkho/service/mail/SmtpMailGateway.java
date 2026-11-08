package com.qlkho.service.mail;

import com.qlkho.config.MailProperties;
import jakarta.mail.MessagingException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/** Gửi qua SMTP: Mailpit khi chạy local và e2e, hoặc Gmail/SMTP bất kỳ (cấu hình spring.mail.*). */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "smtp", matchIfMissing = true)
public class SmtpMailGateway implements MailGateway {
    private final JavaMailSender sender;
    private final MailProperties props;

    public SmtpMailGateway(JavaMailSender sender, MailProperties props) {
        this.sender = sender;
        this.props = props;
    }

    @Override
    public void send(MailMessage m) {
        try {
            var mime = sender.createMimeMessage();
            var helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(props.from(), props.fromName());
            helper.setTo(m.to());
            helper.setSubject(m.subject());
            helper.setText(m.text(), m.html());
            sender.send(mime);
        } catch (MessagingException | UnsupportedEncodingException | MailException e) {
            throw new MailDeliveryException("SMTP: " + e.getMessage(), e);
        }
    }
}
