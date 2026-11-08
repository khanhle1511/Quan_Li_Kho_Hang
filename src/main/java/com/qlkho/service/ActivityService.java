package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * USR-07 – Lịch sử hoạt động của nhân viên.
 * <ul>
 *   <li>{@link #record} ghi một thao tác do chính tài khoản làm; {@link #userAction} ghi thao tác quản trị lên
 *       tài khoản khác: một dòng cho Admin (target = tài khoản bị tác động) và một dòng cho tài khoản đó (byOther = Admin).</li>
 *   <li>{@link #history} trả lịch sử một tài khoản: thống kê + tối đa {@value #MAX_ITEMS} dòng mới nhất.</li>
 *   <li>{@link #backfill} suy ra lịch sử cũ từ phiếu, kiểm kê, hồ sơ và ghi chú đang có (inferred = true).</li>
 * </ul>
 */
@Service
public class ActivityService {
    public static final int MAX_ITEMS = 500;

    /** Mã hành động → nhãn hiển thị (thứ tự cũng là thứ tự nhóm). */
    public static final Map<String, String> LABEL = new LinkedHashMap<>();
    /** Mã hành động → nhóm. */
    public static final Map<String, String> CATEGORY = new HashMap<>();
    /** Nhóm → nhãn hiển thị. */
    public static final Map<String, String> CATEGORY_LABEL = new LinkedHashMap<>();
    static {
        CATEGORY_LABEL.put("AUTH", "Đăng nhập");
        CATEGORY_LABEL.put("RECEIPT", "Nhập/Xuất kho");
        CATEGORY_LABEL.put("STOCKTAKE", "Kiểm kê");
        CATEGORY_LABEL.put("CATALOG", "Hàng hóa & đối tác");
        CATEGORY_LABEL.put("USER", "Tài khoản");
        CATEGORY_LABEL.put("WAREHOUSE", "Kho");
        def("AUTH", "LOGIN", "Đăng nhập");
        def("AUTH", "LOGOUT", "Đăng xuất");
        def("AUTH", "LOGIN_FAIL", "Đăng nhập thất bại");
        def("AUTH", "LOGIN_BLOCKED", "Đăng nhập bị từ chối");
        def("RECEIPT", "RECEIPT_CREATE", "Lập phiếu");
        def("RECEIPT", "RECEIPT_APPROVE", "Duyệt phiếu");
        def("RECEIPT", "RECEIPT_REJECT", "Từ chối phiếu");
        def("STOCKTAKE", "STOCKTAKE_CONFIRM", "Xác nhận kiểm kê");
        def("CATALOG", "PRODUCT_CREATE", "Thêm hàng hóa");
        def("CATALOG", "PARTNER_CREATE", "Thêm đối tác");
        def("CATALOG", "PARTNER_UPDATE", "Sửa đối tác");
        def("CATALOG", "PARTNER_NOTE", "Cập nhật ghi chú");
        def("CATALOG", "FILE_UPLOAD", "Tải lên hồ sơ");
        def("CATALOG", "FILE_DELETE", "Xóa hồ sơ");
        def("USER", "USER_CREATE", "Tạo tài khoản");
        def("USER", "USER_UPDATE", "Sửa tài khoản");
        def("USER", "USER_STATUS", "Đổi trạng thái tài khoản");
        def("USER", "USER_DELETE", "Xóa tài khoản");
        // AUTH-08: quên mật khẩu (BR-35)
        def("USER", "PWD_RESET_REQUEST", "Yêu cầu đặt lại mật khẩu");
        def("USER", "PWD_RESET_OTP_FAIL", "Nhập sai mã xác nhận");
        def("USER", "PWD_RESET_OTP_LOCKED", "Mã xác nhận bị hủy");
        def("USER", "PWD_RESET", "Đặt lại mật khẩu");
        def("USER", "PWD_RESET_MAIL_FAIL", "Không gửi được email");
        def("WAREHOUSE", "WH_CREATE", "Thêm kho");
        def("WAREHOUSE", "WH_UPDATE", "Sửa kho");
        def("WAREHOUSE", "WH_STATUS", "Đổi trạng thái kho");
        def("WAREHOUSE", "WH_DELETE", "Xóa kho");
    }
    private static void def(String category, String action, String label) {
        LABEL.put(action, label);
        CATEGORY.put(action, category);
    }
    public static final Map<String, String> USER_STATUS_LABEL = Map.of(
            Rules.ACTIVE, "Hoạt động", Rules.DRAFT, "Nháp", Rules.LOCKED, "Đã khóa");
    public static final Map<String, String> WH_STATUS_LABEL = Map.of(Rules.ACTIVE, "Hoạt động", Rules.PAUSED, "Tạm ngưng");

    private final ActivityLogRepo logs;
    private final UserRepo users;
    private final ReceiptRepo receipts;
    private final StockHistoryRepo history;
    private final StocktakeRepo stocktakes;
    private final PartnerFileRepo files;
    private final PartnerRepo partners;
    private final WarehouseRepo warehouses;

    public ActivityService(ActivityLogRepo logs, UserRepo users, ReceiptRepo receipts, StockHistoryRepo history,
                           StocktakeRepo stocktakes, PartnerFileRepo files, PartnerRepo partners, WarehouseRepo warehouses) {
        this.logs = logs;
        this.users = users;
        this.receipts = receipts;
        this.history = history;
        this.stocktakes = stocktakes;
        this.files = files;
        this.partners = partners;
        this.warehouses = warehouses;
    }

    public Optional<UserAccount> userById(String id) { return users.findById(Rules.nz(id)); }

    // ---------- ghi nhật ký ----------
    /** Thao tác do chính tài khoản thực hiện. */
    public void record(UserAccount who, String action, String targetType, String targetId, String detail) {
        logs.save(row(who, action, targetType, targetId, detail, null, Rules.now(), System.currentTimeMillis(), false));
    }

    /** Thao tác quản trị của {@code by} lên {@code target}: ghi cho cả hai bên. */
    public void userAction(UserAccount by, UserAccount target, String action, String detail) {
        String at = Rules.now();
        long key = System.currentTimeMillis();
        logs.save(row(by, action, "USER", target.id, target.name + (detail.isEmpty() ? "" : ": " + detail), null, at, key, false));
        if (!by.id.equals(target.id))
            logs.save(row(target, action, "USER", target.id, detail, by.name, at, key, false));
    }

    private static ActivityLog row(UserAccount u, String action, String targetType, String targetId, String detail,
                                   String byOther, String at, long sortKey, boolean inferred) {
        if (!LABEL.containsKey(action)) throw new IllegalArgumentException("Mã hành động không hợp lệ: " + action);
        ActivityLog l = new ActivityLog();
        l.userId = u.id;
        l.userName = u.name;
        l.userRole = u.role;
        l.category = CATEGORY.get(action);
        l.action = action;
        l.targetType = targetType;
        l.targetId = targetId;
        l.detail = detail == null ? "" : (detail.length() > 500 ? detail.substring(0, 500) : detail);
        l.createdAt = at;
        l.sortKey = sortKey;
        l.inferred = inferred;
        l.byOther = byOther;
        return l;
    }

    // ---------- tra cứu ----------
    @Transactional(readOnly = true)
    public Map<String, Object> history(String userId) {
        UserAccount u = users.findById(Rules.nz(userId))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản " + userId + "."));
        List<ActivityLog> all = logs.findByUserIdOrderBySortKeyDescIdDesc(u.id);

        Map<String, Integer> byCategory = new LinkedHashMap<>();
        for (String c : CATEGORY_LABEL.keySet()) byCategory.put(c, 0);
        long created = 0, decided = 0, failed = 0;
        String lastLogin = null;
        for (ActivityLog l : all) {
            byCategory.merge(l.category, 1, Integer::sum);
            switch (l.action) {
                case "RECEIPT_CREATE" -> created++;
                case "RECEIPT_APPROVE", "RECEIPT_REJECT" -> decided++;
                case "LOGIN_FAIL" -> failed++;
                case "LOGIN" -> { if (lastLogin == null) lastLogin = l.createdAt; }
                default -> { }
            }
        }
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", all.size());
        stats.put("lastLogin", lastLogin);
        stats.put("receiptsCreated", created);
        stats.put("receiptsDecided", decided);
        stats.put("failedLogins", failed);
        stats.put("byCategory", byCategory);

        List<Map<String, Object>> items = all.stream().limit(MAX_ITEMS).map(ActivityService::item).toList();
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("id", u.id);
        user.put("name", u.name);
        user.put("role", u.role);
        user.put("roleLabel", Rules.ROLE_LABEL.get(u.role));
        user.put("status", u.status);
        user.put("phone", u.phone);
        user.put("email", u.email); // AUTH-08
        user.put("opened", u.opened);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", user);
        out.put("stats", stats);
        out.put("items", items);
        out.put("truncated", all.size() > MAX_ITEMS);
        return out;
    }

    private static Map<String, Object> item(ActivityLog l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.id);
        m.put("at", l.createdAt);
        m.put("category", l.category);
        m.put("action", l.action);
        m.put("label", LABEL.getOrDefault(l.action, l.action));
        m.put("targetType", l.targetType);
        m.put("targetId", l.targetId);
        m.put("detail", l.detail);
        m.put("inferred", l.inferred);
        m.put("byOther", l.byOther);
        return m;
    }

    // ---------- suy ra lịch sử cũ ----------
    /**
     * Suy ra lịch sử từ chứng từ đang có khi bảng nhật ký còn trống (lần đầu chạy bản có USR-07, hoặc sau reset CSDL).
     * Người duyệt phiếu, người xác nhận kiểm kê, người tải hồ sơ và người ghi chú chỉ được lưu bằng TÊN, nên dò theo tên:
     * hai tài khoản trùng tên có thể bị gán nhầm (hạn chế đã biết). Thời điểm duyệt lấy từ thẻ kho.
     * @return số dòng đã ghi
     */
    @Transactional
    public int backfill() {
        if (logs.count() > 0) return 0;
        Map<String, UserAccount> byId = new HashMap<>();
        Map<String, UserAccount> byName = new HashMap<>();
        for (UserAccount u : users.findAll()) {
            byId.put(u.id, u);
            byName.putIfAbsent(u.name, u);
        }
        Map<String, String> whName = new HashMap<>();
        for (Warehouse w : warehouses.findAll()) whName.put(w.id, w.name);
        Map<String, String> partnerName = new HashMap<>();
        for (Partner p : partners.findAll()) partnerName.put(p.id, p.name);
        // Thời điểm duyệt = dòng thẻ kho đầu tiên tham chiếu mã phiếu
        Map<String, String> decidedAt = new HashMap<>();
        for (StockHistory h : history.findAll()) decidedAt.putIfAbsent(h.ref, h.happenedAt);

        List<ActivityLog> out = new ArrayList<>();
        for (Receipt r : receipts.findAll()) {
            String kind = "in".equals(r.receiptType) ? "phiếu nhập" : "phiếu xuất";
            String where = kind + ", " + whName.getOrDefault(r.warehouseId, r.warehouseId);
            UserAccount creator = byId.get(Rules.nz(r.creatorId));
            if (creator != null) out.add(inferred(creator, "RECEIPT_CREATE", "RECEIPT", r.id, r.id + " (" + where + ")", r.createdAt));
            if (!Rules.blank(r.approverName) && !Rules.PENDING.equals(r.status)) {
                UserAccount approver = byName.get(r.approverName);
                boolean approved = Rules.APPROVED.equals(r.status);
                if (approver != null)
                    out.add(inferred(approver, approved ? "RECEIPT_APPROVE" : "RECEIPT_REJECT", "RECEIPT", r.id,
                            r.id + " (" + where + ")", approved ? decidedAt.getOrDefault(r.id, r.createdAt) : r.createdAt));
            }
        }
        for (Stocktake s : stocktakes.findAll()) {
            UserAccount by = byName.get(Rules.nz(s.confirmedBy));
            if (by != null)
                out.add(inferred(by, "STOCKTAKE_CONFIRM", "STOCKTAKE", s.id,
                        s.id + " tại " + whName.getOrDefault(s.warehouseId, s.warehouseId) + ", " + s.diffCount + " mặt hàng chênh lệch", s.createdAt));
        }
        for (PartnerFile f : files.findAll()) {
            UserAccount by = byName.get(Rules.nz(f.uploadedBy));
            if (by != null)
                out.add(inferred(by, "FILE_UPLOAD", "FILE", f.id, f.fileName + " cho " + partnerName.getOrDefault(f.partnerId, f.partnerId), f.uploadedAt));
        }
        for (Partner p : partners.findAll()) {
            if (Rules.blank(p.note) || Rules.blank(p.noteBy)) continue;
            UserAccount by = byName.get(p.noteBy);
            if (by != null) out.add(inferred(by, "PARTNER_NOTE", "PARTNER", p.id, p.name, p.noteAt));
        }
        out.sort(Comparator.comparingLong((ActivityLog l) -> l.sortKey));
        logs.saveAll(out);
        return out.size();
    }

    private static ActivityLog inferred(UserAccount u, String action, String targetType, String targetId, String detail, String at) {
        String ts = Rules.blank(at) ? "" : at;
        return row(u, action, targetType, targetId, detail, null, ts, Rules.toMillis(ts), true);
    }
}
