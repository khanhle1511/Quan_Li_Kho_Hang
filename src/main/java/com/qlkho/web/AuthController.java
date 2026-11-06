package com.qlkho.web;

import com.qlkho.model.UserAccount;
import com.qlkho.service.AuthService;
import com.qlkho.service.StateService;
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

    public AuthController(AuthService auth, StateService state) {
        this.auth = auth;
        this.state = state;
    }

    @PostMapping("/auth/login")
    public Map<String, Object> login(@RequestBody Dto.Login req, HttpSession session) {
        UserAccount u = auth.login(req.phone(), req.password(), session);
        return auth.me(u);
    }

    @PostMapping("/auth/logout")
    public Map<String, Object> logout(HttpSession session) {
        session.invalidate();
        return Map.of("ok", true);
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
