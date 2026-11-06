package com.qlkho.web;

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

    public InventoryController(AuthService auth, InventoryService inventory) {
        this.auth = auth;
        this.inventory = inventory;
    }

    @PostMapping("/receipts")
    public Map<String, Object> create(@RequestBody Dto.NewReceipt req, HttpSession session) {
        return inventory.createReceipt(req, auth.require(session));
    }

    @PostMapping("/receipts/{id}/approve")
    public Map<String, Object> approve(@PathVariable String id, HttpSession session) {
        return inventory.approve(id, auth.requireManager(session));
    }

    @PostMapping("/receipts/{id}/reject")
    public Map<String, Object> reject(@PathVariable String id, HttpSession session) {
        return inventory.reject(id, auth.requireManager(session));
    }

    @PostMapping("/stocktakes")
    public Map<String, Object> stocktake(@RequestBody Dto.NewStocktake req, HttpSession session) {
        return inventory.stocktake(req, auth.requireManager(session));
    }
}
