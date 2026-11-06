package com.qlkho.web;

import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.InventoryService;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Phiếu nhập/xuất và kiểm kê. */
@RestController
@RequestMapping("/api")
public class InventoryController {
    private final AuthService auth;
    private final InventoryService inventory;
    private final ActivityService activity;

    public InventoryController(AuthService auth, InventoryService inventory, ActivityService activity) {
        this.auth = auth;
        this.inventory = inventory;
        this.activity = activity;
    }

    @PostMapping("/receipts")
    public Map<String, Object> create(@RequestBody Dto.NewReceipt req, HttpSession session) {
        UserAccount me = auth.require(session);
        Map<String, Object> r = inventory.createReceipt(req, me);
        String code = String.valueOf(r.get("code"));
        String kind = "in".equals(req.type()) ? "phiếu nhập" : "phiếu xuất";
        boolean autoApproved = Rules.APPROVED.equals(r.get("status"));
        activity.record(me, "RECEIPT_CREATE", "RECEIPT", code,
                code + " (" + kind + ", kho " + Rules.trim(req.warehouseId()) + (autoApproved ? ", duyệt ngay" : "") + ")");
        if (autoApproved) activity.record(me, "RECEIPT_APPROVE", "RECEIPT", code, code + " (duyệt ngay khi lập)");
        return r;
    }

    @PostMapping("/receipts/{id}/approve")
    public Map<String, Object> approve(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = inventory.approve(id, me);
        activity.record(me, "RECEIPT_APPROVE", "RECEIPT", id, id + " (" + ("in".equals(r.get("type")) ? "phiếu nhập" : "phiếu xuất") + ")");
        return r;
    }

    @PostMapping("/receipts/{id}/reject")
    public Map<String, Object> reject(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = inventory.reject(id, me);
        activity.record(me, "RECEIPT_REJECT", "RECEIPT", id, id);
        return r;
    }

    @PostMapping("/stocktakes")
    public Map<String, Object> stocktake(@RequestBody Dto.NewStocktake req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = inventory.stocktake(req, me);
        String code = String.valueOf(r.get("code"));
        activity.record(me, "STOCKTAKE_CONFIRM", "STOCKTAKE", code,
                code + " tại " + r.get("warehouse") + ", " + r.get("diff") + " mặt hàng chênh lệch");
        return r;
    }
}
