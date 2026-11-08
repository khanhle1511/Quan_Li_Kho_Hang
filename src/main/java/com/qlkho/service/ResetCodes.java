package com.qlkho.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/** Sinh mã OTP, reset token và băm token cho luồng quên mật khẩu (AUTH-08). */
@Component
public class ResetCodes {
    public static final int OTP_LENGTH = 6;
    private static final int OTP_BOUND = 1_000_000;
    private static final int TOKEN_BYTES = 32;

    private final SecureRandom random;

    public ResetCodes(SecureRandom random) {
        this.random = random;
    }

    /** BR-29: 6 chữ số, giữ số 0 ở đầu. */
    public String newOtp() {
        return String.format("%0" + OTP_LENGTH + "d", random.nextInt(OTP_BOUND));
    }

    /** BR-33: 32 byte ngẫu nhiên, mã hóa base64url không đệm. */
    public String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Chỉ bản băm SHA-256 (hex) của token được lưu và dùng để tra cứu. */
    public String hashToken(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("JVM không hỗ trợ SHA-256", e);
        }
    }

    public static boolean isOtpFormat(String otp) {
        return otp != null && otp.length() == OTP_LENGTH && otp.chars().allMatch(Character::isDigit);
    }
}
