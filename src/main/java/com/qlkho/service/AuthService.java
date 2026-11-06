package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.repo.UserRepo;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** UC01 – Đăng nhập bằng số điện thoại và mật khẩu; kiểm tra quyền theo vai trò. */
@Service
public class AuthService {
    public static final String SESSION_KEY = "uid";

    /** BUG-001 / RISK-07: sai liên tiếp MAX_FAILED lần thì khóa tạm LOCK_MINUTES phút. */
    public static final int MAX_FAILED = 5;
    public static final int LOCK_MINUTES = 15;
    private static final long LOCK_MS = LOCK_MINUTES * 60_000L;

    /** Số lần sai gần đây của một SĐT (kể cả SĐT không tồn tại, để không lộ tài khoản nào có thật). */
    private static final class Attempts {
        int failed;
        long lastFailAt;
        long lockedUntil;
    }

    /**
     * Bộ đếm giữ trong bộ nhớ, không cần thêm cột vào CSDL. Mất khi khởi động lại máy chủ,
     * nhưng đủ để chặn dò mật khẩu vì kẻ dò không thể tự khởi động lại máy chủ.
     */
    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    private final UserRepo users;
    private final BCryptPasswordEncoder encoder;

    public AuthService(UserRepo users, BCryptPasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    public UserAccount login(String phoneRaw, String password, HttpSession session) {
        String phone = Rules.normPhone(phoneRaw);
        if (phone.isEmpty() || Rules.blank(password))
            throw ApiException.bad("Vui lòng nhập số điện thoại và mật khẩu.");
        if (!Rules.LOGIN_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).");
        long now = System.currentTimeMillis();
        Attempts a = attempts.get(phone);
        // Đang khóa tạm: từ chối ngay, kể cả khi mật khẩu đúng, và không chạm vào CSDL
        if (a != null && a.lockedUntil > now) throw ApiException.bad(lockedMessage(a.lockedUntil - now));
        UserAccount u = users.findByPhone(phone).orElse(null);
        // Thông báo chung, không cho biết sai số điện thoại hay sai mật khẩu.
        // Mật khẩu dài hơn 72 byte chắc chắn sai (không thể băm được) nên không đưa vào BCrypt.
        if (u == null || Rules.passwordTooLong(password) || !encoder.matches(password, u.passwordHash)) {
            long lockedUntil = recordFailure(phone, now);
            if (lockedUntil > now) throw ApiException.bad(lockedMessage(lockedUntil - now));
            throw ApiException.bad("Sai số điện thoại hoặc mật khẩu.");
        }
        attempts.remove(phone); // Đúng mật khẩu: bộ đếm về 0
        if (Rules.LOCKED.equals(u.status))
            throw ApiException.bad("Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên.");
        if (Rules.DRAFT.equals(u.status))
            throw ApiException.bad("Tài khoản chưa được kích hoạt. Vui lòng liên hệ Quản trị viên.");
        session.setAttribute(SESSION_KEY, u.id);
        return u;
    }

    /**
     * Ghi nhận một lần sai cho SĐT. Trả về thời điểm hết khóa (0 nếu chưa bị khóa).
     * Lần sai cách lần trước hơn LOCK_MINUTES phút thì đếm lại từ đầu; đủ MAX_FAILED lần thì khóa.
     */
    private long recordFailure(String phone, long now) {
        // Dọn các SĐT đã lâu không sai để map không phình mãi (chỉ chạy khi map đã lớn)
        if (attempts.size() > 10_000)
            attempts.entrySet().removeIf(e -> e.getValue().lastFailAt + LOCK_MS < now && e.getValue().lockedUntil < now);
        Attempts a = attempts.computeIfAbsent(phone, k -> new Attempts());
        synchronized (a) {
            if (a.lastFailAt + LOCK_MS < now) a.failed = 0;
            a.failed++;
            a.lastFailAt = now;
            if (a.failed >= MAX_FAILED) {
                a.failed = 0;
                a.lockedUntil = now + LOCK_MS;
            }
            return a.lockedUntil;
        }
    }

    private static String lockedMessage(long remainingMs) {
        long minutes = Math.max(1, (remainingMs + 59_999) / 60_000);
        return "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau " + minutes + " phút.";
    }

    /** Người dùng đang hoạt động của phiên, nếu có. Phiên của tài khoản đã khóa/xóa bị hủy ngay. */
    public Optional<UserAccount> find(HttpSession session) {
        Object id = session.getAttribute(SESSION_KEY);
        if (id == null) return Optional.empty();
        Optional<UserAccount> u = users.findById(id.toString()).filter(x -> Rules.ACTIVE.equals(x.status));
        if (u.isEmpty()) session.invalidate();
        return u;
    }

    public UserAccount current(HttpSession session) {
        if (session.getAttribute(SESSION_KEY) == null) throw new ApiException(401, "Bạn chưa đăng nhập.");
        return find(session).orElseThrow(() ->
                new ApiException(401, "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại."));
    }

    /** Yêu cầu đăng nhập và (nếu truyền vào) thuộc một trong các vai trò. */
    public UserAccount require(HttpSession session, String... roles) {
        UserAccount u = current(session);
        if (roles.length > 0 && !List.of(roles).contains(u.role)) throw ApiException.forbidden();
        return u;
    }

    public UserAccount requireAdmin(HttpSession session) {
        return require(session, Rules.ADMIN);
    }

    /** Quản lý kho hoặc Quản trị viên. */
    public UserAccount requireManager(HttpSession session) {
        return require(session, Rules.ADMIN, Rules.MANAGER);
    }

    public Map<String, Object> me(UserAccount u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.id);
        m.put("name", u.name);
        m.put("role", u.role);
        m.put("roleLabel", Rules.ROLE_LABEL.get(u.role));
        return m;
    }
}
