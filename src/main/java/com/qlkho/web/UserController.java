package com.qlkho.web;

import com.qlkho.service.AuthService;
import com.qlkho.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Quản lý tài khoản – chỉ Quản trị viên. */
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AuthService auth;
    private final UserService users;

    public UserController(AuthService auth, UserService users) {
        this.auth = auth;
        this.users = users;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Dto.UserForm req, HttpSession session) {
        auth.requireAdmin(session);
        return users.create(req);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Dto.UserForm req, HttpSession session) {
        auth.requireAdmin(session);
        return users.update(id, req);
    }

    @PutMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable String id, @RequestBody Dto.StatusForm req, HttpSession session) {
        return users.setStatus(id, req.status(), auth.requireAdmin(session));
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id, HttpSession session) {
        return users.delete(id, auth.requireAdmin(session));
    }
}
