package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import com.qlkho.web.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Nghiệp vụ tồn kho: lập phiếu nhập/xuất (UC02, UC03), duyệt/từ chối (UC04), kiểm kê (UC05).
 * Tồn chỉ thay đổi khi duyệt phiếu hoặc xác nhận kiểm kê, và mọi thay đổi đều ghi vào thẻ kho.
 */
@Service
public class InventoryService {
    private static final String IN = "in";
    private static final String OUT = "out";

    private final ProductRepo products;
    private final WarehouseRepo warehouses;
    private final StockRepo stocks;
    private final PartnerRepo partners;
    private final ReceiptRepo receipts;
    private final ReceiptLineRepo lines;
    private final StockHistoryRepo history;
    private final StocktakeRepo stocktakes;
    /** BUG-005: mã phiếu/kiểm kê sinh theo "mã lớn nhất + 1" nên việc tạo mới phải chạy tuần tự, xem {@link CreateTx}. */
    private final CreateTx create;

    public InventoryService(ProductRepo products, WarehouseRepo warehouses, StockRepo stocks, PartnerRepo partners,
                            ReceiptRepo receipts, ReceiptLineRepo lines, StockHistoryRepo history, StocktakeRepo stocktakes,
                            CreateTx create) {
        this.products = products;
        this.warehouses = warehouses;
        this.stocks = stocks;
        this.partners = partners;
        this.receipts = receipts;
        this.lines = lines;
        this.history = history;
        this.stocktakes = stocktakes;
        this.create = create;
    }

    // ---------- tồn kho ----------
    /** Bản ghi tồn hiện có, hoặc bản ghi mới với tồn 0 (chưa lưu). */
    private Stock stockOf(String productId, String warehouseId) {
        return stocks.findById(Stock.key(productId, warehouseId)).orElseGet(() -> Stock.of(productId, warehouseId, 0));
    }

    /**
     * Tải một lần tồn của nhiều mặt hàng tại một kho, kèm khóa dòng vì sẽ ghi lại; mặt hàng chưa có bản ghi
     * được coi là tồn 0. Khóa theo thứ tự mã tăng dần để hai transaction không chờ nhau vòng tròn (deadlock).
     */
    private Map<String, Stock> stocksOf(Collection<String> productIds, String warehouseId) {
        Map<String, Stock> byProduct = new HashMap<>();
        for (String pid : productIds) byProduct.put(pid, Stock.of(pid, warehouseId, 0));
        List<String> keys = productIds.stream().map(pid -> Stock.key(pid, warehouseId)).sorted().toList();
        for (Stock s : stocks.lockAllById(keys)) byProduct.put(s.productId, s);
        return byProduct;
    }

    /** Đặt tồn mới, lưu và ghi thẻ kho. */
    private void move(Stock s, int after, String kind, String ref, String time) {
        if (after < 0) throw ApiException.bad("Tồn kho không được âm.");
        int delta = after - s.qty;
        s.qty = after;
        stocks.save(s);
        history.save(StockHistory.of(time, s.productId, s.warehouseId, kind, delta, after, ref));
    }

    private Product product(String id) {
        return products.findById(Rules.nz(id)).orElseThrow(() -> ApiException.bad("Không tìm thấy hàng hóa " + id + "."));
    }

    /** Tải một lần các mặt hàng theo mã (không null); báo lỗi nếu thiếu mã nào. */
    private Map<String, Product> productsOf(Collection<String> ids) {
        Map<String, Product> byId = products.findAllById(ids).stream()
                .collect(Collectors.toMap(p -> p.id, Function.identity()));
        for (String id : ids)
            if (!byId.containsKey(id)) throw ApiException.bad("Không tìm thấy hàng hóa " + id + ".");
        return byId;
    }

    private Warehouse activeWarehouse(String id, String missingMsg, String action) {
        Warehouse w = warehouses.findById(Rules.trim(id)).orElseThrow(() -> ApiException.bad(missingMsg));
        if (!Rules.ACTIVE.equals(w.status)) throw ApiException.bad(w.name + " đang tạm ngưng, không thể " + action + ".");
        return w;
    }

    private static String notEnough(Product p, int have, Warehouse w) {
        return "“" + p.name + "” chỉ còn " + have + " " + p.unit + " tại " + w.name + ".";
    }

    // ---------- UC02, UC03: lập phiếu ----------
    public Map<String, Object> createReceipt(Dto.NewReceipt req, UserAccount me) {
        return create.run(() -> createReceiptTx(req, me));
    }

    private Map<String, Object> createReceiptTx(Dto.NewReceipt req, UserAccount me) {
        String type = req.type();
        if (!IN.equals(type) && !OUT.equals(type)) throw ApiException.bad("Loại phiếu không hợp lệ.");
        boolean in = IN.equals(type);
        Partner p = partners.findById(Rules.trim(req.partnerId()))
                .orElseThrow(() -> ApiException.bad(in ? "Vui lòng chọn nhà cung cấp." : "Vui lòng chọn khách hàng / đơn vị nhận."));
        if (!p.partnerType.equals(in ? "sup" : "cus")) throw ApiException.bad("Đối tác không phù hợp với loại phiếu.");
        Warehouse w = activeWarehouse(req.warehouseId(), "Vui lòng chọn kho.", "lập phiếu");
        if (req.lines() == null || req.lines().isEmpty())
            throw ApiException.bad("Phiếu chưa có mặt hàng nào. Hãy chọn hàng hóa ở danh sách bên trái.");

        Set<String> seen = new HashSet<>();
        for (Dto.Line l : req.lines()) {
            Product pr = product(l.productId());
            if (!seen.add(pr.id)) throw ApiException.bad("Mặt hàng “" + pr.name + "” bị trùng trong phiếu.");
            if (l.qty() == null || l.qty() <= 0)
                throw ApiException.bad("Số lượng của “" + pr.name + "” phải là số nguyên lớn hơn 0.");
            if (!in) {
                int have = stockOf(pr.id, w.id).qty;
                if (l.qty() > have) throw ApiException.bad("Không đủ tồn: " + notEnough(pr, have, w));
            }
        }

        String prefix = in ? "PN-" : "PX-";
        String code = Rules.nextCode(receipts.findIdsByPrefix(prefix), prefix, 4);
        Receipt r = new Receipt();
        r.id = code;
        r.receiptType = type;
        r.partnerId = p.id;
        r.warehouseId = w.id;
        r.createdAt = Rules.now();
        r.status = Rules.PENDING;
        r.creatorId = me.id;
        r.creatorName = me.name;
        r.note = Rules.trim(req.note());
        r.sortKey = System.currentTimeMillis();
        create.insert(r); // luôn INSERT; receipts.save() với mã gán tay sẽ merge() và ghi đè phiếu đã có cùng mã (BUG-005)
        lines.saveAll(req.lines().stream().map(l -> ReceiptLine.of(code, l.productId(), l.qty())).toList());
        return Map.of("code", code);
    }

    // ---------- UC04: duyệt / từ chối ----------
    private Receipt pendingReceipt(String id) {
        Receipt r = receipts.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy phiếu " + id + "."));
        if (!Rules.PENDING.equals(r.status)) throw ApiException.bad("Phiếu " + id + " đã được xử lý trước đó.");
        return r;
    }

    /**
     * BUG-004: giành quyền xử lý phiếu bằng UPDATE có điều kiện (status = pending). Các request duyệt cùng
     * một phiếu đồng thời phải chờ khóa dòng, rồi thấy phiếu đã đổi trạng thái nên cập nhật 0 dòng → bị từ chối.
     * Nếu bước sau ném lỗi (không đủ tồn…) thì transaction rollback và phiếu trở lại chờ duyệt.
     */
    private void finish(Receipt r, String status, UserAccount me) {
        if (receipts.finishPending(r.id, status, me.name) != 1)
            throw ApiException.bad("Phiếu " + r.id + " đã được xử lý trước đó.");
    }

    @Transactional
    public Map<String, Object> approve(String id, UserAccount me) {
        Receipt r = pendingReceipt(id);
        if (me.id.equals(r.creatorId)) throw ApiException.bad("Bạn không thể tự duyệt phiếu do chính mình lập.");
        finish(r, Rules.APPROVED, me);
        boolean in = IN.equals(r.receiptType);
        Warehouse w = warehouses.findById(r.warehouseId).orElseThrow(() -> ApiException.bad("Kho của phiếu không còn tồn tại."));
        List<ReceiptLine> ls = lines.findByReceiptIdOrderByIdAsc(id);
        List<String> pids = ls.stream().map(l -> l.productId).toList();
        Map<String, Product> prods = productsOf(pids);
        Map<String, Stock> stk = stocksOf(pids, w.id);

        // Kiểm tra lại tồn khả dụng: tồn có thể đã bị phiếu khác trừ sau khi lập phiếu
        if (!in) {
            for (ReceiptLine l : ls) {
                int have = stk.get(l.productId).qty;
                if (l.qty > have)
                    throw ApiException.bad("Không thể duyệt " + id + ": " + notEnough(prods.get(l.productId), have, w));
            }
        }

        String t = Rules.now();
        List<String> low = new ArrayList<>();
        for (ReceiptLine l : ls) {
            Stock s = stk.get(l.productId);
            int after = s.qty + (in ? l.qty : -l.qty);
            move(s, after, in ? "Nhập" : "Xuất", r.id, t);
            if (!in && after <= prods.get(l.productId).minStock) low.add(prods.get(l.productId).name);
        }
        return Map.of("code", r.id, "type", r.receiptType, "low", low);
    }

    @Transactional
    public Map<String, Object> reject(String id, UserAccount me) {
        Receipt r = pendingReceipt(id);
        finish(r, Rules.CANCELLED, me);
        return Map.of("code", r.id);
    }

    // ---------- UC05: kiểm kê ----------
    public Map<String, Object> stocktake(Dto.NewStocktake req, UserAccount me) {
        return create.run(() -> stocktakeTx(req, me));
    }

    /**
     * BUG-008 / RISK-04: chênh lệch kiểm kê = số thực tế − số hệ thống lúc MỞ phiên (trường {@code system} do giao
     * diện gửi kèm), rồi cộng/trừ phần chênh lệch đó vào tồn HIỆN TẠI. Nhờ vậy phiếu nhập/xuất được duyệt trong lúc
     * phiên kiểm kê đang mở không bị xóa mất, và xác nhận mà không sửa số thì không tạo dòng "Kiểm kê" nào.
     * Request không gửi {@code system} (gọi API trực tiếp) được hiểu là so với tồn hiện tại như trước.
     */
    private Map<String, Object> stocktakeTx(Dto.NewStocktake req, UserAccount me) {
        Warehouse w = activeWarehouse(req.warehouseId(), "Vui lòng chọn kho cần kiểm kê.", "kiểm kê");
        if (req.rows() == null || req.rows().isEmpty()) throw ApiException.bad("Phiếu kiểm kê chưa có mặt hàng nào.");
        List<String> pids = req.rows().stream().map(row -> Rules.nz(row.productId())).toList();
        Map<String, Product> prods = productsOf(pids);
        for (int i = 0; i < pids.size(); i++) {
            Integer actual = req.rows().get(i).actual();
            if (actual == null || actual < 0)
                throw ApiException.bad("Số thực tế của “" + prods.get(pids.get(i)).name + "” phải là số nguyên ≥ 0.");
        }

        String code = Rules.nextCode(stocktakes.findAllIds(), "KK-", 4);
        String t = Rules.now();
        Map<String, Stock> stk = stocksOf(pids, w.id);
        int diff = 0;
        List<String> moved = new ArrayList<>(); // mặt hàng có biến động trong lúc kiểm kê (tồn hiện tại ≠ số lúc mở phiên)
        for (int i = 0; i < pids.size(); i++) {
            Stock s = stk.get(pids.get(i));
            Dto.CountRow row = req.rows().get(i);
            int system = row.system() == null ? s.qty : row.system();
            int after = s.qty + (row.actual() - system);
            if (system != s.qty) moved.add(prods.get(s.productId).name);
            if (after < 0)
                throw ApiException.bad("Tồn của “" + prods.get(s.productId).name + "” đã thay đổi trong lúc kiểm kê (từ "
                        + system + " thành " + s.qty + "), số thực tế " + row.actual() + " làm tồn âm. Hãy đếm lại mặt hàng này.");
            if (after != s.qty) {
                move(s, after, "Kiểm kê", code, t);
                diff++;
            }
        }
        Stocktake s = new Stocktake();
        s.id = code;
        s.createdAt = t;
        s.warehouseId = w.id;
        s.checkedCount = req.rows().size();
        s.diffCount = diff;
        s.confirmedBy = me.name;
        s.sortKey = System.currentTimeMillis();
        create.insert(s); // luôn INSERT, không ghi đè phiếu kiểm kê cùng mã (xem BUG-005)
        return Map.of("code", code, "diff", diff, "warehouse", w.name, "moved", moved);
    }
}
