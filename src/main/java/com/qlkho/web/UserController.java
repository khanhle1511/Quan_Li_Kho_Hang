package com.qlkho.web;

import com.qlkho.common.ApiException;
import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Quản lý tài khoản – chỉ Quản trị viên. */
@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AuthService auth;
    private final UserService users;
    private final ActivityService activity;

    public UserController(AuthService auth, UserService users, ActivityService activity) {
        this.auth = auth;
        this.users = users;
        this.activity = activity;
    }

    private UserAccount target(String id) {
        return activity.userById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản " + id + "."));
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Dto.UserForm req, HttpSession session) {
        UserAccount admin = auth.requireAdmin(session);
        Map<String, Object> r = users.create(req);
        activity.userById(String.valueOf(r.get("id"))).ifPresent(t ->
                activity.userAction(admin, t, "USER_CREATE", "vai trò " + com.qlkho.common.Rules.ROLE_LABEL.get(t.role)
                        + ", tình trạng " + ActivityService.USER_STATUS_LABEL.getOrDefault(t.status, t.status)));
        return r;
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Dto.UserForm req, HttpSession session) {
        UserAccount admin = auth.requireAdmin(session);
        Map<String, Object> r = users.update(id, req);
        @SuppressWarnings("unchecked") List<String> changes = (List<String>) r.get("changes");
        activity.userAction(admin, target(id), "USER_UPDATE", "đổi " + String.join(", ", changes));
        return r;
    }

    @PutMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable String id, @RequestBody Dto.StatusForm req, HttpSession session) {
        UserAccount admin = auth.requireAdmin(session);
        Map<String, Object> r = users.setStatus(id, req.status(), admin);
        String before = ActivityService.USER_STATUS_LABEL.getOrDefault(String.valueOf(r.get("before")), String.valueOf(r.get("before")));
        String after = ActivityService.USER_STATUS_LABEL.getOrDefault(req.status(), req.status());
        activity.userAction(admin, target(id), "USER_STATUS", before + " → " + after);
        return r;
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable String id, HttpSession session) {
        UserAccount admin = auth.requireAdmin(session);
        UserAccount t = target(id); // lấy trước khi xóa để còn tên, vai trò ghi vào nhật ký
        Map<String, Object> r = users.delete(id, admin);
        activity.userAction(admin, t, "USER_DELETE", "");
        return r;
    }

    /** USR-07: lịch sử hoạt động của một tài khoản (thống kê + tối đa 500 dòng mới nhất). */
    @GetMapping("/{id}/activity")
    public Map<String, Object> activity(@PathVariable String id, HttpSession session) {
        auth.requireAdmin(session);
        return activity.history(id);
    }
}
