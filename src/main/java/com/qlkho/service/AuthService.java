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

/** UC01 – Đăng nhập bằng số điện thoại và mật khẩu; kiểm tra quyền theo vai trò. */
@Service
public class AuthService {
    public static final String SESSION_KEY = "uid";

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
        UserAccount u = users.findByPhone(phone).orElse(null);
        // Thông báo chung, không cho biết sai số điện thoại hay sai mật khẩu
        if (u == null || !encoder.matches(password, u.passwordHash))
            throw ApiException.bad("Sai số điện thoại hoặc mật khẩu.");
        if (Rules.LOCKED.equals(u.status))
            throw ApiException.bad("Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên.");
        if (Rules.DRAFT.equals(u.status))
            throw ApiException.bad("Tài khoản chưa được kích hoạt. Vui lòng liên hệ Quản trị viên.");
        session.setAttribute(SESSION_KEY, u.id);
        return u;
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
