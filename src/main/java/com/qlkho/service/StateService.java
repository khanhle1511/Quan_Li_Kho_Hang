package com.qlkho.service;

import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static com.qlkho.common.Rules.nz;

/**
 * Tập hợp toàn bộ dữ liệu giao diện cần trong một lần gọi (GET /api/state).
 * Thông tin liên hệ và hồ sơ bị lược bỏ ngay tại máy chủ theo vai trò người xem.
 */
@Service
public class StateService {
    private final UserRepo users;
    private final WarehouseRepo warehouses;
    private final ProductRepo products;
    private final StockRepo stocks;
    private final PartnerRepo partners;
    private final ReceiptRepo receipts;
    private final ReceiptLineRepo lines;
    private final StockHistoryRepo history;
    private final StocktakeRepo stocktakes;
    private final PartnerFileRepo files;
    private final AuthService auth;

    public StateService(UserRepo users, WarehouseRepo warehouses, ProductRepo products, StockRepo stocks,
                        PartnerRepo partners, ReceiptRepo receipts, ReceiptLineRepo lines, StockHistoryRepo history,
                        StocktakeRepo stocktakes, PartnerFileRepo files, AuthService auth) {
        this.users = users;
        this.warehouses = warehouses;
        this.products = products;
        this.stocks = stocks;
        this.partners = partners;
        this.receipts = receipts;
        this.lines = lines;
        this.history = history;
        this.stocktakes = stocktakes;
        this.files = files;
        this.auth = auth;
    }

    /** Map giữ thứ tự khóa, viết gọn: m("a", 1, "b", 2). */
    private static Map<String, Object> m(Object... kv) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) map.put((String) kv[i], kv[i + 1]);
        return map;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> build(UserAccount me) {
        String role = me.role;
        boolean hideWh = Rules.hideContact("wh", role);
        // BUG-010: SĐT người dùng (cũng là tên đăng nhập) chỉ Admin được xem, không gắn với quyền xem SĐT kho
        boolean showUserPhone = Rules.ADMIN.equals(role);

        List<UserAccount> allUsers = users.findAll();
        // RCPT-10: vai trò người lập phiếu (tài khoản đã xóa: không tra được → null, không che)
        Map<String, String> roleOf = allUsers.stream().collect(Collectors.toMap(u -> u.id, u -> u.role));
        boolean viewerIsManager = Rules.MANAGER.equals(role);

        List<Map<String, Object>> userList = allUsers.stream()
                .sorted(Comparator.comparingInt((UserAccount u) -> u.id.length()).thenComparing(u -> u.id))
                .map(u -> m("id", u.id, "name", u.name, "phone", showUserPhone ? u.phone : null,
                        "role", u.role, "opened", u.opened, "status", u.status))
                .toList();

        List<Map<String, Object>> whList = warehouses.findAllByOrderByOpenedAsc().stream()
                .map(w -> m("id", w.id, "code", w.code, "name", w.name, "address", w.address, "keeperId", w.keeperId,
                        "phone", hideWh ? null : w.phone, "capacity", w.capacity, "opened", w.opened, "status", w.status))
                .toList();

        List<Map<String, Object>> productList = products.findAllByOrderByIdAsc().stream()
                .map(p -> m("id", p.id, "sku", p.sku, "name", p.name, "cat", p.category, "unit", p.unit,
                        "min", p.minStock, "price", p.price))
                .toList();

        Map<String, Integer> stockMap = new LinkedHashMap<>();
        for (Stock s : stocks.findAll()) stockMap.put(s.id, s.qty);

        // Đối tác: tải một lần, chia theo loại; vai trò bị ẩn liên hệ thì không thấy SĐT, email và hồ sơ
        Map<String, List<Partner>> byType = partners.findAllByOrderByIdAsc().stream()
                .collect(Collectors.groupingBy(p -> p.partnerType));
        Set<String> visiblePartners = byType.entrySet().stream()
                .filter(e -> !Rules.hideContact(e.getKey(), role))
                .flatMap(e -> e.getValue().stream().map(p -> p.id))
                .collect(Collectors.toSet());

        Map<String, List<ReceiptLine>> linesBy = lines.findAllByOrderByIdAsc().stream()
                .collect(Collectors.groupingBy(l -> l.receiptId));
        List<Receipt> rs = receipts.findAllByOrderBySortKeyDesc();
        // Phiếu duyệt trước khi có cột decided_at: lấy thời điểm từ dòng thẻ kho đầu tiên của phiếu
        List<StockHistory> histAll = history.findAllByOrderByIdDesc();
        Map<String, String> firstMove = new HashMap<>();
        for (StockHistory h : histAll) firstMove.put(h.ref, h.happenedAt); // duyệt từ mới → cũ, giá trị cuối là dòng cũ nhất
        List<Map<String, Object>> receiptList = rs.stream().map(r -> {
            List<ReceiptLine> ls = linesBy.getOrDefault(r.id, List.of());
            String creatorRole = r.creatorId == null ? null : roleOf.get(r.creatorId);
            // BR-25 (RCPT-10): Quản lý kho không xem số liệu phiếu do Quản trị viên lập: bỏ dòng hàng và ghi chú
            boolean masked = viewerIsManager && Rules.ADMIN.equals(creatorRole);
            return m("id", r.id, "code", r.id, "type", r.receiptType,
                    "partner", r.partnerId, "wh", r.warehouseId, "date", r.createdAt, "status", r.status,
                    "creator", r.creatorName, "creatorId", r.creatorId, "creatorRole", creatorRole,
                    "approver", nz(r.approverName), "note", masked ? "" : nz(r.note),
                    "decidedAt", r.decidedAt != null ? r.decidedAt : Rules.APPROVED.equals(r.status) ? firstMove.get(r.id) : null,
                    "masked", masked, "lineCount", ls.size(),
                    "lines", masked ? List.of() : ls.stream().map(l -> m("pid", l.productId, "qty", l.qty)).toList());
        }).toList();

        List<Map<String, Object>> historyList = histAll.stream()
                .map(h -> m("t", h.happenedAt, "pid", h.productId, "wh", h.warehouseId, "kind", h.kind,
                        "delta", h.delta, "after", h.qtyAfter, "ref", h.ref))
                .toList();

        List<Stocktake> kks = stocktakes.findAllByOrderBySortKeyDesc();
        List<Map<String, Object>> kkList = kks.stream()
                .map(k -> m("code", k.id, "date", k.createdAt, "wh", k.warehouseId, "checked", k.checkedCount,
                        "diff", k.diffCount, "by", k.confirmedBy))
                .toList();

        List<Map<String, Object>> fileList = files.findAll().stream()
                .filter(f -> visiblePartners.contains(f.partnerId))
                .sorted(Comparator.comparing((PartnerFile f) -> nz(f.uploadedAt)).reversed())
                .map(f -> m("id", f.id, "partnerId", f.partnerId, "name", f.fileName, "size", f.fileSize,
                        "date", f.uploadedAt, "by", f.uploadedBy))
                .toList();

        List<String> rIds = rs.stream().map(r -> r.id).toList();
        List<String> kIds = kks.stream().map(k -> k.id).toList();

        return m(
                "me", auth.me(me),
                "users", userList,
                "warehouses", whList,
                "products", productList,
                "stock", stockMap,
                "suppliers", partnerList(byType.getOrDefault("sup", List.of()), Rules.hideContact("sup", role)),
                "customers", partnerList(byType.getOrDefault("cus", List.of()), Rules.hideContact("cus", role)),
                "receipts", receiptList,
                "history", historyList,
                "kkList", kkList,
                "files", fileList,
                "seq", m("in", Rules.maxNumber(rIds, "PN-") + 1, "out", Rules.maxNumber(rIds, "PX-") + 1,
                        "kk", Rules.maxNumber(kIds, "KK-") + 1),
                "hideContact", Rules.HIDE_CONTACT);
    }

    private static List<Map<String, Object>> partnerList(List<Partner> list, boolean hide) {
        return list.stream()
                .map(p -> m("id", p.id, "name", p.name, "phone", hide ? "" : nz(p.phone), "email", hide ? "" : nz(p.email),
                        "address", nz(p.address), "note", nz(p.note), "noteAt", nz(p.noteAt), "noteBy", nz(p.noteBy)))
                .toList();
    }

    /** Số liệu công khai hiển thị trên trang chủ và trang đăng nhập (không cần đăng nhập). */
    @Transactional(readOnly = true)
    public Map<String, Object> publicSummary() {
        List<Warehouse> active = warehouses.findByStatus(Rules.ACTIVE);
        Map<String, Integer> stockMap = new HashMap<>();
        long total = 0;
        for (Stock s : stocks.findAll()) {
            stockMap.put(s.id, s.qty);
            total += s.qty;
        }
        int low = 0;
        for (Product p : products.findAll())
            for (Warehouse w : active)
                if (stockMap.getOrDefault(Stock.key(p.id, w.id), 0) <= p.minStock) low++;
        return m("low", low, "pending", receipts.countByStatus(Rules.PENDING), "total", total, "warehouses", active.size());
    }
}
