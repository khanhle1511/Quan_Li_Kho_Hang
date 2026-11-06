package com.qlkho.web;

import com.qlkho.model.PartnerFile;
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

    public CatalogController(AuthService auth, CatalogService catalog) {
        this.auth = auth;
        this.catalog = catalog;
    }

    // ----- hàng hóa -----
    @PostMapping("/products")
    public Map<String, Object> createProduct(@RequestBody Dto.NewProduct req, HttpSession session) {
        auth.requireManager(session);
        return catalog.createProduct(req);
    }

    // ----- đối tác -----
    @PostMapping("/partners")
    public Map<String, Object> createPartner(@RequestBody Dto.PartnerForm req, HttpSession session) {
        return catalog.createPartner(req, auth.requireManager(session));
    }

    @PutMapping("/partners/{id}")
    public Map<String, Object> updatePartner(@PathVariable String id, @RequestBody Dto.PartnerForm req, HttpSession session) {
        return catalog.updatePartner(id, req, auth.requireManager(session));
    }

    @PutMapping("/partners/{id}/note")
    public Map<String, Object> note(@PathVariable String id, @RequestBody Dto.NoteForm req, HttpSession session) {
        return catalog.saveNote(id, req.note(), auth.requireManager(session));
    }

    @PostMapping("/partners/{id}/files")
    public Map<String, Object> upload(@PathVariable String id, @RequestParam("file") MultipartFile file, HttpSession session) {
        return catalog.upload(id, file, auth.requireManager(session));
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
        catalog.deleteFile(id, auth.requireManager(session));
        return Map.of("ok", true);
    }

    // ----- kho (chỉ Quản trị viên) -----
    @PostMapping("/warehouses")
    public Map<String, Object> createWarehouse(@RequestBody Dto.WarehouseForm req, HttpSession session) {
        auth.requireAdmin(session);
        return catalog.createWarehouse(req);
    }

    @PutMapping("/warehouses/{id}")
    public Map<String, Object> updateWarehouse(@PathVariable String id, @RequestBody Dto.WarehouseForm req, HttpSession session) {
        auth.requireAdmin(session);
        return catalog.updateWarehouse(id, req);
    }

    @PutMapping("/warehouses/{id}/status")
    public Map<String, Object> warehouseStatus(@PathVariable String id, @RequestBody Dto.StatusForm req, HttpSession session) {
        auth.requireAdmin(session);
        return catalog.setWarehouseStatus(id, req.status());
    }

    @DeleteMapping("/warehouses/{id}")
    public Map<String, Object> deleteWarehouse(@PathVariable String id, HttpSession session) {
        auth.requireAdmin(session);
        return catalog.deleteWarehouse(id);
    }
}
