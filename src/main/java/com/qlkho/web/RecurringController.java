package com.qlkho.web;

import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.RecurringService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Kế hoạch nhập/xuất định kỳ – Quản trị viên (mọi kho) và Quản lý kho (kho của mình). Nhân viên kho chỉ xem qua /api/state. */
@RestController
@RequestMapping("/api/plans")
public class RecurringController {
    private final AuthService auth;
    private final RecurringService recurring;
    private final ActivityService activity;

    public RecurringController(AuthService auth, RecurringService recurring, ActivityService activity) {
        this.auth = auth;
        this.recurring = recurring;
        this.activity = activity;
    }

    @PostMapping
    public Map<String, Object> create(@RequestBody Dto.PlanForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.createPlan(req, me);
        activity.record(me, "PLAN_CREATE", "PLAN", String.valueOf(r.get("id")),
                r.get("id") + " (" + ("in".equals(req.type()) ? "nhập" : "xuất") + ", kho " + req.warehouseId() + ")");
        return r;
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable String id, @RequestBody Dto.PlanForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.updatePlan(id, req, me);
        recurring.runDueSafely(); // ngày bắt đầu/chu kỳ mới có thể làm kỳ hiện tại đã đến hạn
        activity.record(me, "PLAN_UPDATE", "PLAN", id, id);
        return r;
    }

    @PutMapping("/{id}/status")
    public Map<String, Object> status(@PathVariable String id, @RequestBody Dto.StatusForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.setStatus(id, req.status(), me);
        if ("active".equals(req.status())) recurring.runDueSafely();
        activity.record(me, "PLAN_STATUS", "PLAN", id,
                id + ": " + ActivityService.PLAN_STATUS_LABEL.getOrDefault(req.status(), req.status()));
        return r;
    }

    @PutMapping("/{id}/next")
    public Map<String, Object> setNext(@PathVariable String id, @RequestBody Dto.PlanLines req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.setNextLines(id, req, me);
        activity.record(me, "PLAN_NEXT_EDIT", "PLAN", id, id + " kỳ " + r.get("period"));
        return r;
    }

    @DeleteMapping("/{id}/next")
    public Map<String, Object> clearNext(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.clearNextLines(id, me);
        activity.record(me, "PLAN_NEXT_EDIT", "PLAN", id, id + " kỳ " + r.get("period") + ": bỏ điều chỉnh riêng");
        return r;
    }

    @PostMapping("/{id}/skip")
    public Map<String, Object> skip(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.skipNext(id, me);
        activity.record(me, "PLAN_SKIP", "PLAN", id, id + " kỳ " + r.get("period"));
        return r;
    }

    @PostMapping("/{id}/run")
    public Map<String, Object> run(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = recurring.runNow(id, me);
        activity.record(me, "PLAN_RUN", "PLAN", id, id + " kỳ " + r.get("period") + " → " + r.get("receipt"));
        return r;
    }
}
