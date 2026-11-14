package com.qlkho.web;

import com.qlkho.model.ReportLog;
import com.qlkho.model.UserAccount;
import com.qlkho.service.ActivityService;
import com.qlkho.service.AuthService;
import com.qlkho.service.ReportService;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Xuất báo cáo nhập – xuất – tồn và tải lại báo cáo cũ – chỉ Quản trị viên. Lịch sử báo cáo đi kèm GET /api/state. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final AuthService auth;
    private final ReportService reports;
    private final ActivityService activity;

    public ReportController(AuthService auth, ReportService reports, ActivityService activity) {
        this.auth = auth;
        this.reports = reports;
        this.activity = activity;
    }

    @PostMapping
    public Map<String, Object> export(@RequestBody Dto.ReportRequest req, HttpSession session) {
        UserAccount admin = auth.requireAdmin(session);
        Map<String, Object> r = reports.export(req.warehouseId(), admin);
        String id = String.valueOf(r.get("id"));
        activity.record(admin, "REPORT_EXPORT", "REPORT", id, id + " (" + r.get("warehouse") + ")");
        return r;
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable String id, HttpSession session) {
        auth.requireAdmin(session);
        ReportLog r = reports.report(id);
        ContentDisposition cd = ContentDisposition.attachment().filename(r.fileName, StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .body(reports.fileOf(r));
    }
}
