package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.common.XlsxWriter;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Báo cáo nhập – xuất – tồn (FR-16, FR-17) do Quản trị viên xuất ra file Excel. Mỗi lần xuất được lưu lại
 * (bản ghi + nội dung file) để xem lịch sử và tải lại đúng số liệu tại thời điểm xuất.
 * Cách tính giống trang Báo cáo: Tồn đầu kỳ = Tồn cuối − Nhập + Xuất − Điều chỉnh, tồn cuối là tồn hiện tại.
 */
@Service
public class ReportService {
    private static final String ALL = "all";
    private static final String ALL_LABEL = "Tất cả kho";

    private final ProductRepo products;
    private final WarehouseRepo warehouses;
    private final StockRepo stocks;
    private final StockHistoryRepo history;
    private final ReportLogRepo reports;
    private final ReportFileRepo files;
    private final CreateTx create;

    public ReportService(ProductRepo products, WarehouseRepo warehouses, StockRepo stocks, StockHistoryRepo history,
                         ReportLogRepo reports, ReportFileRepo files, CreateTx create) {
        this.products = products;
        this.warehouses = warehouses;
        this.stocks = stocks;
        this.history = history;
        this.reports = reports;
        this.files = files;
        this.create = create;
    }

    /** Một dòng báo cáo: biến động của một mặt hàng trong phạm vi kho đã chọn. */
    private record Line(Product product, long begin, long in, long out, long adjust, long end) {}

    /** Cộng dồn biến động thẻ kho của một mặt hàng theo loại (Nhập, Xuất, còn lại là điều chỉnh kiểm kê). */
    private static final class Movement {
        long in, out, adjust;

        void add(StockHistory h) {
            switch (h.kind) {
                case "Nhập" -> in += h.delta;
                case "Xuất" -> out -= h.delta;
                default -> adjust += h.delta;
            }
        }
    }

    public Map<String, Object> export(String warehouseId, UserAccount me) {
        return create.run(() -> exportTx(warehouseId, me));
    }

    /** Phạm vi báo cáo: một kho, hoặc tất cả kho (warehouseId = null). */
    private record Scope(String warehouseId, String label, String fileTag, Set<String> ids) {}

    private Scope scopeOf(String warehouseId) {
        if (Rules.blank(warehouseId) || ALL.equals(warehouseId))
            return new Scope(null, ALL_LABEL, "TatCaKho", warehouses.findAll().stream().map(w -> w.id).collect(Collectors.toSet()));
        Warehouse w = warehouses.findById(warehouseId.trim()).orElseThrow(() -> ApiException.bad("Không tìm thấy kho."));
        return new Scope(w.id, w.name, w.code, Set.of(w.id));
    }

    private Map<String, Object> exportTx(String warehouseId, UserAccount me) {
        Scope scope = scopeOf(warehouseId);
        List<Line> lines = compute(scope.ids());

        String now = Rules.now();
        String month = now.substring(3, 10); // dd/MM/yyyy HH:mm → MM/yyyy
        ReportLog r = new ReportLog();
        r.id = Rules.nextCode(reports.findAllIds(), "BC-", 4);
        r.createdAt = now;
        r.sortKey = System.currentTimeMillis();
        r.creatorId = me.id;
        r.creatorName = me.name;
        r.warehouseId = scope.warehouseId();
        r.warehouseLabel = scope.label();
        r.period = "Tháng " + month;
        r.productCount = lines.size();
        for (Line l : lines) {
            r.totalBegin += l.begin();
            r.totalIn += l.in();
            r.totalOut += l.out();
            r.totalAdjust += l.adjust();
            r.totalEnd += l.end();
        }
        r.fileName = "BaoCao_NXT_" + scope.fileTag() + "_T" + month.replace('/', '-') + "_" + r.id + ".xlsx";
        create.insert(r);

        ReportFile f = new ReportFile();
        f.id = r.id;
        f.data = toExcel(r, lines);
        create.insert(f);
        return Map.of("id", r.id, "fileName", r.fileName, "warehouse", r.warehouseLabel);
    }

    private List<Line> compute(Set<String> scope) {
        Map<String, Long> endBy = new HashMap<>();
        for (Stock s : stocks.findAll())
            if (scope.contains(s.warehouseId)) endBy.merge(s.productId, (long) s.qty, Long::sum);
        Map<String, Movement> moves = new HashMap<>();
        for (StockHistory h : history.findAll())
            if (scope.contains(h.warehouseId)) moves.computeIfAbsent(h.productId, k -> new Movement()).add(h);
        return products.findAllByOrderByIdAsc().stream().map(p -> {
            long end = endBy.getOrDefault(p.id, 0L);
            Movement m = moves.getOrDefault(p.id, new Movement());
            return new Line(p, end - m.in + m.out - m.adjust, m.in, m.out, m.adjust, end);
        }).toList();
    }

    private static byte[] toExcel(ReportLog r, List<Line> lines) {
        XlsxWriter x = new XlsxWriter("Nhap-Xuat-Ton", 6, 12, 34, 20, 10, 14, 12, 12, 13, 14)
                .boldRow("BÁO CÁO NHẬP – XUẤT – TỒN KHO")
                .row("Mã báo cáo:", null, r.id)
                .row("Kỳ báo cáo:", null, r.period)
                .row("Kho:", null, r.warehouseLabel)
                .row("Thời điểm xuất:", null, r.createdAt)
                .row("Người xuất:", null, r.creatorName)
                .blankRow()
                .boldRow("STT", "SKU", "Hàng hóa", "Danh mục", "ĐVT", "Tồn đầu kỳ", "Nhập", "Xuất", "Điều chỉnh", "Tồn cuối kỳ");
        int i = 0;
        for (Line l : lines) {
            Product p = l.product();
            x.row(++i, p.sku, p.name, p.category, p.unit, l.begin(), l.in(), l.out(), l.adjust(), l.end());
        }
        return x.boldRow(null, null, "Tổng cộng", null, null, r.totalBegin, r.totalIn, r.totalOut, r.totalAdjust, r.totalEnd)
                .blankRow()
                .row("Ghi chú: Tồn đầu kỳ = Tồn cuối kỳ − Nhập + Xuất − Điều chỉnh. Tồn cuối kỳ là tồn tại thời điểm xuất báo cáo.")
                .toBytes();
    }

    @Transactional(readOnly = true)
    public ReportLog report(String id) {
        return reports.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy báo cáo " + id + "."));
    }

    @Transactional(readOnly = true)
    public byte[] fileOf(ReportLog r) {
        return files.findById(r.id).map(f -> f.data)
                .orElseThrow(() -> ApiException.notFound("File của báo cáo " + r.id + " không còn trên máy chủ."));
    }

    /** Lịch sử báo cáo, mới nhất trước (không kèm nội dung file). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> history() {
        return reports.findAllByOrderBySortKeyDesc().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.id);
            m.put("date", r.createdAt);
            m.put("by", r.creatorName);
            m.put("wh", r.warehouseId);
            m.put("whLabel", r.warehouseLabel);
            m.put("period", r.period);
            m.put("products", r.productCount);
            m.put("begin", r.totalBegin);
            m.put("in", r.totalIn);
            m.put("out", r.totalOut);
            m.put("adjust", r.totalAdjust);
            m.put("end", r.totalEnd);
            m.put("fileName", r.fileName);
            return m;
        }).toList();
    }
}
