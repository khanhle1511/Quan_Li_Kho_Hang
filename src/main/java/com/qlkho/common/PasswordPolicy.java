package com.qlkho.common;

/** Quy tắc mật khẩu dùng chung cho Admin tạo/sửa tài khoản (FR-02) và người dùng tự đặt lại (AUTH-08). */
public final class PasswordPolicy {
    public static final int MIN_LENGTH = 6;

    private PasswordPolicy() {}

    /** Ném 400 với thông báo cụ thể nếu mật khẩu không hợp lệ. */
    public static void check(String pass) {
        if (pass == null || pass.length() < MIN_LENGTH)
            throw ApiException.bad("Mật khẩu phải có ít nhất " + MIN_LENGTH + " ký tự.");
        // BUG-002: chặn trước khi băm, vì BCrypt ném IllegalArgumentException (→ HTTP 500) khi mật khẩu dài hơn 72 byte
        if (Rules.passwordTooLong(pass))
            throw ApiException.bad("Mật khẩu quá dài: tối đa " + Rules.PASSWORD_MAX_BYTES + " byte (khoảng 72 ký tự không dấu).");
        if (pass.chars().anyMatch(Character::isWhitespace))
            throw ApiException.bad("Mật khẩu không được chứa khoảng trắng.");
    }
}
