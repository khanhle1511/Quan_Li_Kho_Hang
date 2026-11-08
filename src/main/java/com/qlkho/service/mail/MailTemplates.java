package com.qlkho.service.mail;

import com.qlkho.model.UserAccount;
import org.springframework.web.util.HtmlUtils;

import java.time.Duration;

/**
 * Nội dung email của luồng quên mật khẩu (AUTH-08, mục 9.3 của đặc tả).
 * Không chèn liên kết nào để người nhận không quen bấm link trong email đặt lại mật khẩu (chống giả mạo).
 */
public final class MailTemplates {
    private static final String APP = "Quản lý kho";

    private MailTemplates() {}

    /** Email chứa mã OTP (BR-29). */
    public static MailMessage otp(UserAccount u, String otp, Duration ttl) {
        long minutes = Math.max(1, ttl.toMinutes());
        String subject = "[" + APP + "] Mã xác nhận đặt lại mật khẩu: " + otp;
        String text = "Xin chào " + u.name + ",\n\n"
                + "Mã xác nhận đặt lại mật khẩu của bạn là: " + spaced(otp) + "\n\n"
                + "Mã có hiệu lực trong " + minutes + " phút và chỉ dùng được một lần. "
                + "Không chia sẻ mã này cho bất kỳ ai, kể cả người tự xưng là Quản trị viên.\n\n"
                + "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn vẫn giữ nguyên.";
        String html = layout(
                "<p>Xin chào <b>" + esc(u.name) + "</b>,</p>"
                + "<p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>"
                + "<p style=\"font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;color:#0F2742\">" + spaced(otp) + "</p>"
                + "<p>Mã có hiệu lực trong <b>" + minutes + " phút</b> và chỉ dùng được một lần. "
                + "Không chia sẻ mã này cho bất kỳ ai, kể cả người tự xưng là Quản trị viên.</p>"
                + "<p style=\"color:#56606B\">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu của bạn vẫn giữ nguyên.</p>");
        return new MailMessage(u.email, u.name, subject, text, html);
    }

    /** Email thông báo đã đổi mật khẩu (BR-36). */
    public static MailMessage passwordChanged(UserAccount u, String at, String ip) {
        String subject = "[" + APP + "] Mật khẩu của bạn đã được thay đổi";
        String text = "Xin chào " + u.name + ",\n\n"
                + "Mật khẩu tài khoản của bạn vừa được đặt lại lúc " + at + " (địa chỉ IP: " + ip + ").\n\n"
                + "Nếu không phải bạn thực hiện, hãy liên hệ ngay Quản trị viên để khóa tài khoản.";
        String html = layout(
                "<p>Xin chào <b>" + esc(u.name) + "</b>,</p>"
                + "<p>Mật khẩu tài khoản của bạn vừa được đặt lại lúc <b>" + esc(at) + "</b> (địa chỉ IP: " + esc(ip) + ").</p>"
                + "<p style=\"color:#A01F17\">Nếu không phải bạn thực hiện, hãy liên hệ ngay Quản trị viên để khóa tài khoản.</p>");
        return new MailMessage(u.email, u.name, subject, text, html);
    }

    /** "482913" → "482 913" cho dễ đọc. */
    private static String spaced(String otp) {
        int mid = otp.length() / 2;
        return otp.substring(0, mid) + " " + otp.substring(mid);
    }

    private static String layout(String body) {
        return "<div style=\"font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.55;color:#17212B;max-width:520px\">"
                + "<p style=\"font-weight:700;font-size:17px;margin:0 0 16px\">" + APP + "</p>" + body + "</div>";
    }

    private static String esc(String s) { return HtmlUtils.htmlEscape(s == null ? "" : s); }
}
