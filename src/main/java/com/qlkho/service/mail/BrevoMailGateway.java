package com.qlkho.service.mail;

import com.qlkho.common.Rules;
import com.qlkho.config.MailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

/**
 * Gửi qua Brevo HTTP API (cổng 443). Dùng trên Render vì bản miễn phí chặn cổng SMTP đi ra.
 * Cần BREVO_API_KEY và MAIL_FROM là địa chỉ người gửi đã xác minh trong Brevo.
 */
@Component
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "brevo")
public class BrevoMailGateway implements MailGateway {
    private static final Logger log = LoggerFactory.getLogger(BrevoMailGateway.class);
    private static final String ENDPOINT = "https://api.brevo.com/v3/smtp/email";

    private final RestClient http;
    private final MailProperties props;

    public BrevoMailGateway(RestClient.Builder builder, MailProperties props) {
        this.props = props;
        this.http = builder.baseUrl(ENDPOINT).defaultHeader("api-key", Rules.nz(props.brevoApiKey())).build();
        // Thiếu khóa: vẫn khởi động để các chức năng khác chạy được; mọi lần gửi sẽ lỗi và được ghi nhật ký
        if (Rules.blank(props.brevoApiKey())) log.error("MAIL_PROVIDER=brevo nhưng chưa đặt BREVO_API_KEY: không gửi được email.");
    }

    @Override
    public void send(MailMessage m) {
        Map<String, Object> body = Map.of(
                "sender", Map.of("name", props.fromName(), "email", props.from()),
                "to", List.of(Map.of("email", m.to(), "name", m.toName())),
                "subject", m.subject(),
                "htmlContent", m.html(),
                "textContent", m.text());
        try {
            http.post().contentType(MediaType.APPLICATION_JSON).body(body).retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            throw new MailDeliveryException("Brevo: " + e.getMessage(), e);
        }
    }
}
