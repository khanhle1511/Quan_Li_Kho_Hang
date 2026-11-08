package com.qlkho.model;

import jakarta.persistence.*;

/**
 * Bảng yeu_cau_dat_lai_mk – mỗi lần bấm "Gửi mã xác nhận" là một dòng (AUTH-08).
 * Dòng được ghi cả khi SĐT không tồn tại hoặc tài khoản không đủ điều kiện (status = ineligible),
 * để giới hạn tần suất và thời gian xử lý giống hệt nhau, không lộ tài khoản nào có thật (BR-28, BR-31).
 * Chỉ lưu bản băm của OTP (BCrypt) và của reset token (SHA-256), không lưu mã gốc.
 */
@Entity
@Table(name = "yeu_cau_dat_lai_mk", indexes = {
        @Index(name = "idx_dl_phone_created", columnList = "phone, created_at"),
        @Index(name = "idx_dl_ip_created", columnList = "request_ip, created_at"),
        @Index(name = "idx_dl_token", columnList = "token_hash")
})
public class PasswordReset {
    /** Đang chờ nhập OTP. */
    public static final String PENDING = "pending";
    /** Không gửi mã (SĐT không tồn tại, tài khoản nháp/khóa, chưa có email). Không bao giờ verify được. */
    public static final String INELIGIBLE = "ineligible";
    /** OTP đúng, đã cấp reset token. */
    public static final String VERIFIED = "verified";
    /** Đã đặt mật khẩu mới. */
    public static final String USED = "used";
    /** Nhập sai OTP quá số lần cho phép. */
    public static final String LOCKED = "locked";
    /** Bị thay bởi yêu cầu mới hơn hoặc bị hủy sau khi đặt lại thành công. */
    public static final String SUPERSEDED = "superseded";

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    /** Null khi SĐT không thuộc tài khoản nào. */
    @Column(name = "user_id", length = 20) public String userId;
    @Column(nullable = false, length = 15) public String phone;
    @Column(name = "otp_hash", nullable = false, length = 100) public String otpHash;
    @Column(name = "created_at", nullable = false) public long createdAt;
    @Column(name = "expires_at", nullable = false) public long expiresAt;
    @Column(name = "failed_attempts", nullable = false) public int failedAttempts;
    @Column(nullable = false, length = 12) public String status;
    @Column(name = "token_hash", length = 64) public String tokenHash;
    @Column(name = "token_expires_at") public Long tokenExpiresAt;
    @Column(name = "request_ip", nullable = false, length = 45) public String requestIp;
}
