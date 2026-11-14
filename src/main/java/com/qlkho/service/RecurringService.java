package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.RecurringSchedule;
import com.qlkho.common.RecurringSchedule.Period;
import com.qlkho.common.Rules;
import com.qlkho.common.WarehouseScope;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import com.qlkho.web.Dto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Nhập/xuất định kỳ: kế hoạch theo tháng, quý hoặc năm tự lập phiếu chờ duyệt khi đến hạn.
 *
 * <ul>
 *   <li>Số lượng cố định theo kế hoạch; có thể điều chỉnh riêng cho kỳ tới mà không đổi kế hoạch gốc.</li>
 *   <li>Mỗi kỳ chỉ sinh một phiếu (ràng buộc duy nhất kế hoạch + kỳ); kỳ đã qua không được sinh bù,
 *       chỉ xử lý kỳ hiện tại khi ngày đến hạn của kỳ đó đã tới.</li>
 *   <li>Phiếu tự sinh luôn chờ duyệt, người lập là "Hệ thống" ({@link InventoryService#insertScheduledReceipt}).</li>
 * </ul>
 */
@Service
public class RecurringService {
    private static final Logger log = LoggerFactory.getLogger(RecurringService.class);
    private static final int NOTE_MAX = 300;
    /** Số kỳ tối đa duyệt tới khi tìm kỳ kế tiếp (kỳ trước ngày bắt đầu hoặc đã có kết quả được bỏ qua). */
    private static final int LOOKAHEAD = 24;
    private static final int RUNS_SHOWN = 12;

    static final String ACTIVE = Rules.ACTIVE;
    static final String PAUSED = Rules.PAUSED;
    static final String ENDED = "ended";

    private final RecurringPlanRepo plans;
    private final RecurringLineRepo planLines;
    private final RecurringOverrideRepo overrides;
    private final RecurringRunRepo runs;
    private final ProductRepo products;
    private final PartnerRepo partners;
    private final WarehouseRepo warehouses;
    private final InventoryService inventory;
    private final CreateTx create;

    public RecurringService(RecurringPlanRepo plans, RecurringLineRepo planLines, RecurringOverrideRepo overrides,
                            RecurringRunRepo runs, ProductRepo products, PartnerRepo partners, WarehouseRepo warehouses,
                            InventoryService inventory, CreateTx create) {
        this.plans = plans;
        this.planLines = planLines;
        this.overrides = overrides;
        this.runs = runs;
        this.products = products;
        this.partners = partners;
        this.warehouses = warehouses;
        this.inventory = inventory;
        this.create = create;
    }

    /** Kỳ kế tiếp chưa có kết quả của một kế hoạch và ngày đến hạn của kỳ đó. */
    public record Next(Period period, LocalDate due) {}

    // ---------- tra cứu ----------
    private RecurringPlan plan(String id) {
        return plans.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy kế hoạch " + id + "."));
    }

    private RecurringPlan editablePlan(String id, UserAccount me) {
        RecurringPlan p = plan(id);
        WarehouseScope.check(me, p.warehouseId, "quản lý kế hoạch định kỳ");
        if (ENDED.equals(p.status)) throw ApiException.bad("Kế hoạch " + id + " đã kết thúc, không thể thay đổi.");
        return p;
    }

    private static LocalDate date(String iso) {
        return LocalDate.parse(iso);
    }

    /**
     * Kỳ kế tiếp cần xử lý: kỳ hiện tại hoặc sau đó, có ngày đến hạn trong [ngày bắt đầu, ngày kết thúc] và chưa có kết quả.
     * Kế hoạch đã kết thúc không còn kỳ nào.
     */
    Optional<Next> nextOf(RecurringPlan p, LocalDate today, Predicate<String> alreadyRan) {
        if (ENDED.equals(p.status)) return Optional.empty();
        LocalDate start = date(p.startDate), end = p.endDate == null ? null : date(p.endDate);
        // Bắt đầu từ kỳ chứa ngày muộn hơn của (hôm nay, ngày bắt đầu): kế hoạch bắt đầu xa vẫn có kỳ tới đúng
        Period per = RecurringSchedule.periodOf(p.cycle, start.isAfter(today) ? start : today);
        for (int i = 0; i < LOOKAHEAD; i++, per = per.next()) {
            LocalDate due = RecurringSchedule.dueDate(per, p.dayOfMonth, p.monthInCycle);
            if (end != null && due.isAfter(end)) return Optional.empty();
            if (due.isBefore(start) || alreadyRan.test(per.key())) continue;
            return Optional.of(new Next(per, due));
        }
        return Optional.empty();
    }

    private Optional<Next> nextOf(RecurringPlan p) {
        return nextOf(p, Rules.today(), key -> runs.existsByPlanIdAndPeriodKey(p.id, key));
    }

    // ---------- kiểm tra dữ liệu ----------
    private List<Dto.Line> checkLines(List<Dto.Line> ls) {
        if (ls == null || ls.isEmpty()) throw ApiException.bad("Kế hoạch chưa có mặt hàng nào.");
        Map<String, Product> known = products.findAllById(ls.stream().map(l -> Rules.nz(l.productId())).toList()).stream()
                .collect(Collectors.toMap(p -> p.id, p -> p));
        Set<String> seen = new HashSet<>();
        for (Dto.Line l : ls) {
            Product pr = known.get(Rules.nz(l.productId()));
            if (pr == null) throw ApiException.bad("Không tìm thấy hàng hóa " + l.productId() + ".");
            if (!seen.add(pr.id)) throw ApiException.bad("Mặt hàng “" + pr.name + "” bị trùng trong kế hoạch.");
            if (l.qty() == null || l.qty() <= 0)
                throw ApiException.bad("Số lượng của “" + pr.name + "” phải là số nguyên lớn hơn 0.");
        }
        return ls;
    }

    private static LocalDate parseDate(String iso, String what) {
        try {
            if (!Rules.isIsoDate(iso)) throw new DateTimeParseException("", "", 0);
            return LocalDate.parse(iso);
        } catch (DateTimeParseException e) {
            throw ApiException.bad(what + " không hợp lệ.");
        }
    }

    /** Kiểm tra form và ghi các trường của kế hoạch (loại phiếu chỉ đặt khi tạo mới). */
    private void fill(RecurringPlan p, Dto.PlanForm f, UserAccount me) {
        boolean creating = p.receiptType == null;
        String type = creating ? Rules.trim(f.type()) : p.receiptType;
        if (!"in".equals(type) && !"out".equals(type)) throw ApiException.bad("Loại phiếu không hợp lệ.");
        Partner partner = partners.findById(Rules.trim(f.partnerId()))
                .orElseThrow(() -> ApiException.bad("in".equals(type) ? "Vui lòng chọn nhà cung cấp." : "Vui lòng chọn khách hàng / đơn vị nhận."));
        if (!partner.partnerType.equals("in".equals(type) ? "sup" : "cus")) throw ApiException.bad("Đối tác không phù hợp với loại phiếu.");
        Warehouse w = warehouses.findById(Rules.trim(f.warehouseId())).orElseThrow(() -> ApiException.bad("Vui lòng chọn kho."));
        WarehouseScope.check(me, w.id, "lập kế hoạch định kỳ");
        String cycle = Rules.trim(f.cycle());
        if (!RecurringSchedule.CYCLES.contains(cycle)) throw ApiException.bad("Chu kỳ không hợp lệ.");
        int day = f.day() == null ? 0 : f.day();
        if (day < 1 || day > 31) throw ApiException.bad("Ngày phát sinh phiếu phải từ 1 đến 31.");
        int maxMonth = RecurringSchedule.monthsInCycle(cycle);
        int monthIn = f.monthInCycle() == null ? 1 : f.monthInCycle();
        if (monthIn < 1 || monthIn > maxMonth) throw ApiException.bad("Tháng trong chu kỳ phải từ 1 đến " + maxMonth + ".");
        LocalDate start = parseDate(f.startDate(), "Ngày bắt đầu");
        LocalDate end = Rules.blank(f.endDate()) ? null : parseDate(f.endDate(), "Ngày kết thúc");
        if (end != null && end.isBefore(start)) throw ApiException.bad("Ngày kết thúc không được trước ngày bắt đầu.");
        String note = Rules.trim(f.note());
        if (note.length() > NOTE_MAX) throw ApiException.bad("Ghi chú tối đa " + NOTE_MAX + " ký tự.");

        p.receiptType = type;
        p.partnerId = partner.id;
        p.warehouseId = w.id;
        p.cycle = cycle;
        p.dayOfMonth = day;
        p.monthInCycle = monthIn;
        p.startDate = start.toString();
        p.endDate = end == null ? null : end.toString();
        p.note = note;
    }

    // ---------- tạo, sửa, đổi trạng thái ----------
    public Map<String, Object> createPlan(Dto.PlanForm f, UserAccount me) {
        Map<String, Object> r = create.run(() -> createPlanTx(f, me));
        runDueSafely();
        return r;
    }

    private Map<String, Object> createPlanTx(Dto.PlanForm f, UserAccount me) {
        List<Dto.Line> ls = checkLines(f.lines());
        RecurringPlan p = new RecurringPlan();
        fill(p, f, me);
        p.id = Rules.nextCode(plans.findAllIds(), "DK-", 4);
        p.status = ACTIVE;
        p.createdBy = me.name;
        p.createdAt = Rules.now();
        create.insert(p);
        planLines.saveAll(ls.stream().map(l -> RecurringLine.of(p.id, l.productId(), l.qty())).toList());
        return Map.of("id", p.id);
    }

    /** Sửa kế hoạch: chỉ ảnh hưởng các kỳ chưa chạy; phiếu đã sinh giữ nguyên. Đổi dòng hàng thì bỏ điều chỉnh riêng đang có. */
    @Transactional
    public Map<String, Object> updatePlan(String id, Dto.PlanForm f, UserAccount me) {
        RecurringPlan p = editablePlan(id, me);
        List<Dto.Line> ls = checkLines(f.lines());
        fill(p, f, me);
        plans.save(p);
        planLines.deleteByPlanId(id);
        planLines.saveAll(ls.stream().map(l -> RecurringLine.of(id, l.productId(), l.qty())).toList());
        overrides.deleteByPlanId(id);
        return Map.of("id", p.id);
    }

    @Transactional
    public Map<String, Object> setStatus(String id, String status, UserAccount me) {
        RecurringPlan p = editablePlan(id, me);
        if (!ACTIVE.equals(status) && !PAUSED.equals(status) && !ENDED.equals(status)) throw ApiException.bad("Trạng thái không hợp lệ.");
        p.status = status;
        plans.save(p);
        return Map.of("id", p.id, "status", p.status);
    }

    // ---------- điều chỉnh, bỏ qua, chạy ngay cho kỳ tới ----------
    private Next requireNext(RecurringPlan p) {
        return nextOf(p).orElseThrow(() -> ApiException.bad("Kế hoạch " + p.id + " không còn kỳ nào để thực hiện."));
    }

    @Transactional
    public Map<String, Object> setNextLines(String id, Dto.PlanLines f, UserAccount me) {
        RecurringPlan p = editablePlan(id, me);
        List<Dto.Line> ls = checkLines(f.lines());
        Next next = requireNext(p);
        overrides.deleteByPlanIdAndPeriodKey(id, next.period().key());
        overrides.saveAll(ls.stream().map(l -> RecurringOverride.of(id, next.period().key(), l.productId(), l.qty())).toList());
        return Map.of("id", id, "period", next.period().key());
    }

    @Transactional
    public Map<String, Object> clearNextLines(String id, UserAccount me) {
        RecurringPlan p = editablePlan(id, me);
        Next next = requireNext(p);
        overrides.deleteByPlanIdAndPeriodKey(id, next.period().key());
        return Map.of("id", id, "period", next.period().key());
    }

    @Transactional
    public Map<String, Object> skipNext(String id, UserAccount me) {
        RecurringPlan p = editablePlan(id, me);
        Next next = requireNext(p);
        record(p, next, RecurringRun.SKIPPED, null, "Bỏ qua theo yêu cầu của " + me.name);
        overrides.deleteByPlanIdAndPeriodKey(id, next.period().key());
        return Map.of("id", id, "period", next.period().key());
    }

    /** Sinh phiếu cho kỳ tới ngay, không chờ đến ngày đến hạn. */
    public Map<String, Object> runNow(String id, UserAccount me) {
        return create.run(() -> {
            RecurringPlan p = editablePlan(id, me);
            if (!ACTIVE.equals(p.status)) throw ApiException.bad("Hãy tiếp tục kế hoạch " + id + " trước khi chạy ngay.");
            Next next = requireNext(p);
            String problem = blocker(p);
            if (problem != null) throw ApiException.bad(problem);
            InventoryService.ScheduledReceipt r = generate(p, next, "Chạy ngay bởi " + me.name);
            return Map.of("id", id, "period", next.period().key(), "receipt", r.code(), "shortages", r.shortages());
        });
    }

    // ---------- tự động sinh phiếu ----------
    /** Lý do không sinh phiếu được (kho tạm ngưng/đã xóa, đối tác đã xóa), null nếu sinh được. */
    private String blocker(RecurringPlan p) {
        Warehouse w = warehouses.findById(p.warehouseId).orElse(null);
        if (w == null) return "Kho của kế hoạch không còn tồn tại.";
        if (!Rules.ACTIVE.equals(w.status)) return w.name + " đang tạm ngưng.";
        if (!partners.existsById(p.partnerId)) return "Đối tác của kế hoạch không còn tồn tại.";
        return null;
    }

    private List<Dto.Line> effectiveLines(RecurringPlan p, String periodKey) {
        List<RecurringOverride> o = overrides.findByPlanIdAndPeriodKeyOrderByIdAsc(p.id, periodKey);
        if (!o.isEmpty()) return o.stream().map(x -> new Dto.Line(x.productId, x.qty)).toList();
        return planLines.findByPlanIdOrderByIdAsc(p.id).stream().map(x -> new Dto.Line(x.productId, x.qty)).toList();
    }

    private InventoryService.ScheduledReceipt generate(RecurringPlan p, Next next, String reason) {
        String key = next.period().key();
        InventoryService.ScheduledReceipt r = inventory.insertScheduledReceipt(p.receiptType, p.partnerId, p.warehouseId,
                effectiveLines(p, key), p.id + " / " + key, p.note);
        overrides.deleteByPlanIdAndPeriodKey(p.id, key);
        record(p, next, RecurringRun.GENERATED, r.code(), reason);
        return r;
    }

    private void record(RecurringPlan p, Next next, String status, String receiptId, String reason) {
        RecurringRun run = new RecurringRun();
        run.planId = p.id;
        run.periodKey = next.period().key();
        run.dueDate = next.due().toString();
        run.status = status;
        run.receiptId = receiptId;
        run.reason = reason;
        run.createdAt = Rules.now();
        run.sortKey = System.currentTimeMillis();
        runs.save(run);
    }

    /**
     * Sinh phiếu cho mọi kế hoạch đang chạy có kỳ HIỆN TẠI đã đến hạn mà chưa có kết quả; kế hoạch quá ngày kết thúc
     * chuyển sang "đã kết thúc". Kỳ đã qua không được sinh bù. Gọi lúc khởi động, mỗi ngày một lần và khi có người đăng nhập;
     * chạy lại nhiều lần không sinh trùng. Trả về số phiếu đã sinh.
     */
    public int runDue() {
        LocalDate today = Rules.today();
        int made = 0;
        for (RecurringPlan p : plans.findByStatus(ACTIVE)) {
            if (create.run(() -> generateIfDue(p.id, today))) made++;
            if (p.endDate != null && today.isAfter(date(p.endDate))) endPlan(p.id);
        }
        return made;
    }

    /** Như {@link #runDue()} nhưng không ném lỗi: việc sinh phiếu không được làm hỏng đăng nhập hay thao tác chính. */
    public void runDueSafely() {
        try {
            int n = runDue();
            if (n > 0) log.info("Đã sinh {} phiếu định kỳ.", n);
        } catch (RuntimeException e) {
            log.warn("Không sinh được phiếu định kỳ: {}", e.toString());
        }
    }

    private void endPlan(String id) {
        plans.findById(id).filter(p -> ACTIVE.equals(p.status)).ifPresent(p -> {
            p.status = ENDED;
            plans.save(p);
        });
    }

    /** Chạy trong {@link CreateTx#run}: đọc lại kế hoạch và kiểm tra lại kỳ để hai lần gọi song song không sinh trùng. */
    private boolean generateIfDue(String id, LocalDate today) {
        RecurringPlan p = plans.findById(id).orElse(null);
        if (p == null || !ACTIVE.equals(p.status)) return false;
        Period per = RecurringSchedule.periodOf(p.cycle, today);
        LocalDate due = RecurringSchedule.dueDate(per, p.dayOfMonth, p.monthInCycle);
        boolean inRange = !due.isAfter(today) && !due.isBefore(date(p.startDate)) && (p.endDate == null || !due.isAfter(date(p.endDate)));
        if (!inRange || runs.existsByPlanIdAndPeriodKey(p.id, per.key())) return false;
        Next next = new Next(per, due);
        String problem = blocker(p);
        if (problem != null) {
            record(p, next, RecurringRun.SKIPPED, null, "Bỏ qua kỳ này: " + problem);
            return false;
        }
        generate(p, next, "Tự động theo lịch");
        return true;
    }

    // ---------- dữ liệu cho giao diện ----------
    /** Kế hoạch trong phạm vi kho của người xem, kèm dòng hàng, kỳ tới (và điều chỉnh riêng) và lịch sử các kỳ. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> view(UserAccount me) {
        LocalDate today = Rules.today();
        Map<String, List<RecurringLine>> linesBy = planLines.findAll().stream().collect(Collectors.groupingBy(l -> l.planId));
        Map<String, List<RecurringRun>> runsBy = runs.findAllByOrderBySortKeyDesc().stream().collect(Collectors.groupingBy(r -> r.planId));
        Map<String, List<RecurringOverride>> overBy = overrides.findAll().stream().collect(Collectors.groupingBy(o -> o.planId + "|" + o.periodKey));
        return plans.findAll().stream()
                .filter(p -> WarehouseScope.canUse(me, p.warehouseId))
                .sorted(Comparator.comparing((RecurringPlan p) -> p.id.length()).thenComparing(p -> p.id))
                .map(p -> {
                    List<RecurringRun> pr = runsBy.getOrDefault(p.id, List.of());
                    Set<String> ran = pr.stream().map(r -> r.periodKey).collect(Collectors.toSet());
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", p.id);
                    m.put("type", p.receiptType);
                    m.put("partner", p.partnerId);
                    m.put("wh", p.warehouseId);
                    m.put("cycle", p.cycle);
                    m.put("day", p.dayOfMonth);
                    m.put("monthInCycle", p.monthInCycle);
                    m.put("start", p.startDate);
                    m.put("end", p.endDate);
                    m.put("status", p.status);
                    m.put("note", Rules.nz(p.note));
                    m.put("by", p.createdBy);
                    m.put("at", p.createdAt);
                    m.put("lines", lineMaps(linesBy.getOrDefault(p.id, List.of()), l -> l.productId, l -> l.qty));
                    m.put("next", nextMap(p, nextOf(p, today, ran::contains), overBy));
                    m.put("runs", pr.stream().limit(RUNS_SHOWN).map(this::runMap).toList());
                    return m;
                }).toList();
    }

    private static <T> List<Map<String, Object>> lineMaps(List<T> ls, java.util.function.Function<T, String> pid,
                                                          java.util.function.Function<T, Integer> qty) {
        return ls.stream().map(l -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("pid", pid.apply(l));
            m.put("qty", qty.apply(l));
            return m;
        }).toList();
    }

    private static Map<String, Object> nextMap(RecurringPlan p, Optional<Next> next, Map<String, List<RecurringOverride>> overBy) {
        if (next.isEmpty()) return null;
        Next n = next.get();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("period", n.period().key());
        m.put("due", n.due().toString());
        List<RecurringOverride> o = overBy.get(p.id + "|" + n.period().key());
        m.put("override", o == null ? null : lineMaps(o, x -> x.productId, x -> x.qty));
        return m;
    }

    private Map<String, Object> runMap(RecurringRun r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("period", r.periodKey);
        m.put("due", r.dueDate);
        m.put("status", r.status);
        m.put("receipt", r.receiptId);
        m.put("reason", Rules.nz(r.reason));
        m.put("at", r.createdAt);
        return m;
    }
}
