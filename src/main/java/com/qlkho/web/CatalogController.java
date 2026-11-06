package com.qlkho.web;

import com.qlkho.common.Rules;
import com.qlkho.model.PartnerFile;
import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.CatalogService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Hàng hóa, đối tác (+ hồ sơ PDF) và kho. */
@RestController
@RequestMapping("/api")
public class CatalogController {
    private final AuthService auth;
    private final CatalogService catalog;
    private final ActivityService activity;

    public CatalogController(AuthService auth, CatalogService catalog, ActivityService activity) {
        this.auth = auth;
        this.catalog = catalog;
        this.activity = activity;
    }

    // ----- hàng hóa -----
    @PostMapping("/products")
    public Map<String, Object> createProduct(@RequestBody Dto.NewProduct req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = catalog.createProduct(req);
        activity.record(me, "PRODUCT_CREATE", "PRODUCT", String.valueOf(r.get("id")), r.get("name") + " (" + Rules.trim(req.sku()) + ")");
        return r;
    }

    // ----- đối tác -----
    @PostMapping("/partners")
    public Map<String, Object> createPartner(@RequestBody Dto.PartnerForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = catalog.createPartner(req, me);
        activity.record(me, "PARTNER_CREATE", "PARTNER", String.valueOf(r.get("id")),
                Rules.trim(req.name()) + " (" + ("sup".equals(req.type()) ? "nhà cung cấp" : "khách hàng") + ")");
        return r;
    }

    @PutMapping("/partners/{id}")
    public Map<String, Object> updatePartner(@PathVariable String id, @RequestBody Dto.PartnerForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = catalog.updatePartner(id, req, me);
        activity.record(me, "PARTNER_UPDATE", "PARTNER", id, Rules.trim(req.name()));
        return r;
    }

    @PutMapping("/partners/{id}/note")
    public Map<String, Object> note(@PathVariable String id, @RequestBody Dto.NoteForm req, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = catalog.saveNote(id, req.note(), me);
        activity.record(me, "PARTNER_NOTE", "PARTNER", id, id);
        return r;
    }

    @PostMapping("/partners/{id}/files")
    public Map<String, Object> upload(@PathVariable String id, @RequestParam("file") MultipartFile file, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        Map<String, Object> r = catalog.upload(id, file, me);
        activity.record(me, "FILE_UPLOAD", "FILE", String.valueOf(r.get("id")), Rules.nz(file.getOriginalFilename()) + " cho " + id);
        return r;
    }

    @GetMapping("/files/{id}")
    public ResponseEntity<byte[]> file(@PathVariable String id, @RequestParam(value = "download", required = false) String download,
                                       HttpSession session) {
        PartnerFile pf = catalog.file(id, auth.require(session));
        ContentDisposition cd = (download != null ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(pf.fileName, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .body(catalog.readFile(pf));
    }

    @DeleteMapping("/files/{id}")
    public Map<String, Object> deleteFile(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireManager(session);
        PartnerFile pf = catalog.file(id, me); // lấy tên file trước khi xóa để ghi nhật ký
        catalog.deleteFile(id, me);
        activity.record(me, "FILE_DELETE", "FILE", id, pf.fileName + " của " + pf.partnerId);
        return Map.of("ok", true);
    }

    // ----- kho (chỉ Quản trị viên) -----
    @PostMapping("/warehouses")
    public Map<String, Object> createWarehouse(@RequestBody Dto.WarehouseForm req, HttpSession session) {
        UserAccount me = auth.requireAdmin(session);
        Map<String, Object> r = catalog.createWarehouse(req);
        activity.record(me, "WH_CREATE", "WAREHOUSE", String.valueOf(r.get("id")), String.valueOf(r.get("name")));
        return r;
    }

    @PutMapping("/warehouses/{id}")
    public Map<String, Object> updateWarehouse(@PathVariable String id, @RequestBody Dto.WarehouseForm req, HttpSession session) {
        UserAccount me = auth.requireAdmin(session);
        Map<String, Object> r = catalog.updateWarehouse(id, req);
        activity.record(me, "WH_UPDATE", "WAREHOUSE", id, String.valueOf(r.get("name")));
        return r;
    }

    @PutMapping("/warehouses/{id}/status")
    public Map<String, Object> warehouseStatus(@PathVariable String id, @RequestBody Dto.StatusForm req, HttpSession session) {
        UserAccount me = auth.requireAdmin(session);
        Map<String, Object> r = catalog.setWarehouseStatus(id, req.status());
        activity.record(me, "WH_STATUS", "WAREHOUSE", id,
                r.get("name") + ": " + ActivityService.WH_STATUS_LABEL.getOrDefault(req.status(), req.status()));
        return r;
    }

    @DeleteMapping("/warehouses/{id}")
    public Map<String, Object> deleteWarehouse(@PathVariable String id, HttpSession session) {
        UserAccount me = auth.requireAdmin(session);
        Map<String, Object> r = catalog.deleteWarehouse(id);
        activity.record(me, "WH_DELETE", "WAREHOUSE", id, String.valueOf(r.get("name")));
        return r;
    }
}
