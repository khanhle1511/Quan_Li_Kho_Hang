package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.FixedWindowLimiter;
import com.qlkho.common.PasswordPolicy;
import com.qlkho.common.Rules;
import com.qlkho.common.TooManyRequestsException;
import com.qlkho.config.ResetProperties;
import com.qlkho.model.PasswordReset;
import com.qlkho.model.UserAccount;
import com.qlkho.repo.PasswordResetRepo;
import com.qlkho.repo.UserRepo;
import com.qlkho.service.mail.PasswordResetMailer;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * AUTH-08 – Quên mật khẩu, đặt lại bằng mã OTP gửi qua email (đặc tả docs/AUTH-08_quen-mat-khau.md).
 * <ol>
 *   <li>{@link #request}: tạo OTP, gửi mail nền. Luôn trả cùng một kết quả để không lộ tài khoản có thật (BR-28).</li>
 *   <li>{@link #verify}: kiểm tra OTP, cấp reset token dùng một lần.</li>
 *   <li>{@link #reset}: đặt mật khẩu mới, hủy mọi phiên cũ, xóa khóa tạm đăng nhập (BR-34).</li>
 * </ol>
 * Bước verify/reset dùng {@code noRollbackFor = ApiException}: trả lỗi cho người dùng nhưng vẫn lưu
 * số lần nhập sai và trạng thái đã hủy.
 */
@Service
public class PasswordResetService {
    public record RequestResult(long expiresIn, long resendAfter) {}

    public record VerifyResult(String resetToken, long expiresIn) {}

    static final String MSG_WRONG_OTP = "Mã xác nhận không đúng hoặc đã hết hạn.";
    static final String MSG_SESSION_EXPIRED = "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thực hiện lại từ đầu.";
    private static final Duration HOUR = Duration.ofHours(1);
    private static final Duration KEEP_RECORDS = Duration.ofHours(24);
    /** Yêu cầu còn có thể bị thay bởi yêu cầu mới (BR-30). */
    private static final List<String> OPEN = List.of(PasswordReset.PENDING, PasswordReset.VERIFIED);
    /** Yêu cầu mà bước verify xét tới: INELIGIBLE vẫn được so mã để thời gian xử lý như nhau, nhưng luôn thất bại. */
    private static final List<String> VERIFIABLE = List.of(PasswordReset.PENDING, PasswordReset.INELIGIBLE);

    private final PasswordResetRepo resets;
    private final UserRepo users;
    private final BCryptPasswordEncoder encoder;
    private final ResetCodes codes;
    private final ResetProperties props;
    private final PasswordResetMailer mailer;
    private final ActivityService activity;
    private final AuthService auth;
    private final FixedWindowLimiter verifyLimiter;

    public PasswordResetService(PasswordResetRepo resets, UserRepo users, BCryptPasswordEncoder encoder, ResetCodes codes,
                                ResetProperties props, PasswordResetMailer mailer, ActivityService activity, AuthService auth) {
        this.resets = resets;
        this.users = users;
        this.encoder = encoder;
        this.codes = codes;
        this.props = props;
        this.mailer = mailer;
        this.activity = activity;
        this.auth = auth;
        this.verifyLimiter = new FixedWindowLimiter(props.maxVerifiesPerIpHour(), HOUR);
    }

    // ---------- B1: gửi mã ----------
    public RequestResult request(String phoneRaw, String ip) {
        String phone = requireLoginPhone(phoneRaw);
        long now = System.currentTimeMillis();
        enforceSendLimits(phone, ip, now);

        UserAccount u = users.findByPhone(phone).orElse(null);
        String skipReason = ineligibility(u);
        String otp = codes.newOtp();
        supersedeOpenRequests(phone);
        resets.save(newRequest(phone, u, otp, skipReason == null, ip, now));

        if (u != null) activity.record(u, "PWD_RESET_REQUEST", "USER", u.id,
                skipReason == null ? "đã gửi mã xác nhận tới email" : "không gửi mã: " + skipReason);
        if (skipReason == null) mailer.sendOtp(u, otp, props.otpTtl());
        return new RequestResult(props.otpTtlSeconds(), props.resendCooldownSeconds());
    }

    private static String requireLoginPhone(String raw) {
        String phone = Rules.normPhone(raw);
        if (phone.isEmpty()) throw ApiException.bad("Vui lòng nhập số điện thoại.");
        if (!Rules.LOGIN_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
        return phone;
    }

    /** BR-31: giới hạn theo IP và theo SĐT (áp dụng cả SĐT không tồn tại). */
    private void enforceSendLimits(String phone, String ip, long now) {
        long hourAgo = now - HOUR.toMillis();
        if (resets.countByRequestIpAndCreatedAtGreaterThanEqual(ip, hourAgo) >= props.maxRequestsPerIpHour()) {
            long oldest = resets.findFirstByRequestIpAndCreatedAtGreaterThanEqualOrderByCreatedAtAsc(ip, hourAgo)
                    .map(r -> r.createdAt).orElse(now);
            throw tooManyRequests(oldest + HOUR.toMillis() - now);
        }
        List<PasswordReset> recent = resets.findByPhoneAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(phone, hourAgo);
        if (recent.isEmpty()) return;
        long cooldownLeft = recent.get(0).createdAt + props.resendCooldown().toMillis() - now;
        if (cooldownLeft > 0) {
            long seconds = toSeconds(cooldownLeft);
            throw new TooManyRequestsException("Vui lòng đợi " + seconds + " giây trước khi gửi lại mã.", seconds);
        }
        if (recent.size() >= props.maxRequestsPerPhoneHour())
            throw tooManyRequests(recent.get(recent.size() - 1).createdAt + HOUR.toMillis() - now);
    }

    private static TooManyRequestsException tooManyRequests(long waitMs) {
        long seconds = toSeconds(waitMs);
        long minutes = Math.max(1, (seconds + 59) / 60);
        return new TooManyRequestsException("Bạn đã yêu cầu mã quá nhiều lần. Vui lòng thử lại sau " + minutes + " phút.", seconds);
    }

    private static long toSeconds(long ms) { return Math.max(1, (ms + 999) / 1000); }

    /** Lý do không gửi mã (ghi nhật ký), hoặc null nếu tài khoản đủ điều kiện nhận OTP. */
    private static String ineligibility(UserAccount u) {
        if (u == null) return "số điện thoại không thuộc tài khoản nào";
        if (Rules.DRAFT.equals(u.status)) return "tài khoản chưa kích hoạt";
        if (Rules.LOCKED.equals(u.status)) return "tài khoản đã khóa";
        if (Rules.blank(u.email)) return "tài khoản chưa có email";
        return null;
    }

    /** BR-30: mỗi SĐT chỉ có một yêu cầu còn hiệu lực. */
    private void supersedeOpenRequests(String phone) {
        List<PasswordReset> open = resets.findByPhoneAndStatusIn(phone, OPEN);
        open.forEach(r -> r.status = PasswordReset.SUPERSEDED);
        resets.saveAll(open);
    }

    /** Luôn băm OTP (kể cả khi không gửi) để thời gian xử lý như nhau (BR-28). */
    private PasswordReset newRequest(String phone, UserAccount u, String otp, boolean eligible, String ip, long now) {
        PasswordReset r = new PasswordReset();
        r.phone = phone;
        r.userId = u == null ? null : u.id;
        r.otpHash = encoder.encode(otp);
        r.createdAt = now;
        r.expiresAt = now + props.otpTtl().toMillis();
        r.status = eligible ? PasswordReset.PENDING : PasswordReset.INELIGIBLE;
        r.requestIp = ip;
        return r;
    }

    // ---------- B2: kiểm tra mã ----------
    @Transactional(noRollbackFor = ApiException.class)
    public VerifyResult verify(String phoneRaw, String otp, String ip) {
        long now = System.currentTimeMillis();
        long waitSeconds = verifyLimiter.hit(ip, now);
        if (waitSeconds > 0) throw tooManyRequests(waitSeconds * 1000);

        String phone = Rules.normPhone(phoneRaw);
        if (!ResetCodes.isOtpFormat(otp)) throw ApiException.bad(MSG_WRONG_OTP);
        PasswordReset r = resets.lockByPhoneAndStatusIn(phone, VERIFIABLE).stream().findFirst()
                .orElseThrow(() -> ApiException.bad(MSG_WRONG_OTP));
        boolean matches = encoder.matches(otp, r.otpHash);
        if (!PasswordReset.PENDING.equals(r.status) || r.expiresAt <= now) throw ApiException.bad(MSG_WRONG_OTP);

        UserAccount u = requireActiveUser(r, MSG_WRONG_OTP);
        if (!matches) {
            registerWrongOtp(r, u);
            throw ApiException.bad(MSG_WRONG_OTP);
        }
        String token = codes.newToken();
        r.status = PasswordReset.VERIFIED;
        r.tokenHash = codes.hashToken(token);
        r.tokenExpiresAt = now + props.tokenTtl().toMillis();
        return new VerifyResult(token, props.tokenTtlSeconds());
    }

    /** BR-32: sai đủ số lần thì hủy yêu cầu. */
    private void registerWrongOtp(PasswordReset r, UserAccount u) {
        r.failedAttempts++;
        String attempt = "lần " + r.failedAttempts + "/" + props.maxOtpAttempts();
        if (r.failedAttempts >= props.maxOtpAttempts()) {
            r.status = PasswordReset.LOCKED;
            activity.record(u, "PWD_RESET_OTP_LOCKED", "USER", u.id, "nhập sai mã xác nhận " + attempt + ", mã bị hủy");
        } else {
            activity.record(u, "PWD_RESET_OTP_FAIL", "USER", u.id, "nhập sai mã xác nhận " + attempt);
        }
    }

    /** A12: tài khoản bị khóa/xóa giữa chừng thì hủy yêu cầu (vẫn lưu nhờ noRollbackFor) và trả lỗi {@code message}. */
    private UserAccount requireActiveUser(PasswordReset r, String message) {
        Optional<UserAccount> u = r.userId == null ? Optional.empty()
                : users.findById(r.userId).filter(x -> Rules.ACTIVE.equals(x.status));
        if (u.isEmpty()) {
            r.status = PasswordReset.SUPERSEDED;
            throw ApiException.bad(message);
        }
        return u.get();
    }

    // ---------- B3: đặt mật khẩu mới ----------
    @Transactional(noRollbackFor = ApiException.class)
    public String reset(String token, String password, String confirm, String ip) {
        PasswordReset r = requireVerifiedRequest(token, System.currentTimeMillis());
        UserAccount u = requireActiveUser(r, MSG_SESSION_EXPIRED);
        checkNewPassword(u, password, confirm);
        r.status = PasswordReset.USED; // trước applyNewPassword để không bị tính là yêu cầu còn mở
        applyNewPassword(u, password, ip);
        return u.phone;
    }

    /** BR-33: token phải khớp một yêu cầu đã xác minh OTP, còn hạn và chưa dùng. */
    private PasswordReset requireVerifiedRequest(String token, long now) {
        PasswordReset r = Rules.blank(token) ? null : resets.lockByTokenHash(codes.hashToken(token)).orElse(null);
        if (r == null || !PasswordReset.VERIFIED.equals(r.status) || r.tokenExpiresAt == null || r.tokenExpiresAt <= now)
            throw ApiException.bad(MSG_SESSION_EXPIRED);
        return r;
    }

    private void checkNewPassword(UserAccount u, String password, String confirm) {
        if (!Objects.equals(password, confirm)) throw ApiException.bad("Mật khẩu nhập lại không khớp.");
        PasswordPolicy.check(password);
        if (encoder.matches(password, u.passwordHash)) throw ApiException.bad("Mật khẩu mới phải khác mật khẩu hiện tại.");
    }

    /** BR-34: đổi mật khẩu, hủy mọi phiên cũ, hủy các yêu cầu còn lại, gỡ khóa tạm đăng nhập; BR-35/36: nhật ký + mail báo. */
    private void applyNewPassword(UserAccount u, String password, String ip) {
        u.passwordHash = encoder.encode(password);
        u.bumpSessionVersion();
        users.save(u);
        supersedeOpenRequests(u.phone);
        auth.clearFailures(u.phone);
        activity.record(u, "PWD_RESET", "USER", u.id, "tự đặt lại mật khẩu bằng mã xác nhận qua email");
        mailer.sendPasswordChanged(u, ip);
    }

    /** Dọn yêu cầu cũ hơn 24 giờ; giới hạn tần suất chỉ cần dữ liệu 1 giờ gần nhất. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    @Transactional
    public void purgeOldRequests() {
        resets.deleteCreatedBefore(System.currentTimeMillis() - KEEP_RECORDS.toMillis());
    }
}
