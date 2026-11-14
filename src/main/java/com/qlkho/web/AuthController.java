package com.qlkho.web;

import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.PasswordResetService;
import com.qlkho.service.RecurringService;
import com.qlkho.service.StateService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.Map;

/** Đăng nhập/đăng xuất, dữ liệu phiên và số liệu công khai. */
@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    private final StateService state;
    private final ActivityService activity;
    private final PasswordResetService passwordReset;
    private final RecurringService recurring;

    public AuthController(AuthService auth, StateService state, ActivityService activity, PasswordResetService passwordReset,
                          RecurringService recurring) {
        this.auth = auth;
        this.state = state;
        this.activity = activity;
        this.passwordReset = passwordReset;
        this.recurring = recurring;
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Dto.Login req, HttpSession session) {
        UserAccount u = auth.login(req.phone(), req.password(), session);
        recurring.runDueSafely(); // sinh phiếu định kỳ đến hạn: bản chạy miễn phí có thể ngủ qua ngày đến hạn
        return auth.me(u);
    }

    @PostMapping("/auth/logout")
    public Map<String, Object> logout(HttpSession session) {
        auth.find(session).ifPresent(u -> activity.record(u, "LOGOUT", "USER", u.id, "")); // USR-07
        session.invalidate();
        return Map.of("ok", true);
    }

    // ---------- AUTH-08: quên mật khẩu (công khai, không cần phiên) ----------
    /** B1 – luôn trả cùng một kết quả khi SĐT đúng định dạng (BR-28). IP lấy qua X-Forwarded-For của proxy (SEC-06). */
    @PostMapping("/auth/forgot")
    public Map<String, Object> forgot(@RequestBody Dto.ForgotRequest req, HttpServletRequest http) {
        PasswordResetService.RequestResult r = passwordReset.request(req.phone(), http.getRemoteAddr());
        return Map.of("ok", true, "expiresIn", r.expiresIn(), "resendAfter", r.resendAfter());
    }

    @PostMapping("/auth/forgot/verify")
    public Map<String, Object> forgotVerify(@RequestBody Dto.ForgotVerify req, HttpServletRequest http) {
        PasswordResetService.VerifyResult r = passwordReset.verify(req.phone(), req.otp(), http.getRemoteAddr());
        return Map.of("resetToken", r.resetToken(), "expiresIn", r.expiresIn());
    }

    @PostMapping("/auth/forgot/reset")
    public Map<String, Object> forgotReset(@RequestBody Dto.ForgotReset req, HttpServletRequest http) {
        String phone = passwordReset.reset(req.resetToken(), req.password(), req.confirm(), http.getRemoteAddr());
        return Map.of("ok", true, "phone", phone);
    }

    /** Trả về {"user": null} nếu chưa đăng nhập, để giao diện quyết định hiển thị trang chủ hay vào thẳng ứng dụng. */
    @GetMapping("/auth/me")
    public Map<String, Object> me(HttpSession session) {
        Object user = auth.find(session).map(auth::me).orElse(null);
        return Collections.singletonMap("user", user);
    }

    @GetMapping("/public/summary")
    public Map<String, Object> summary() {
        return state.publicSummary();
    }

    @GetMapping("/state")
    public Map<String, Object> state(HttpSession session) {
        return state.build(auth.current(session));
    }
}
