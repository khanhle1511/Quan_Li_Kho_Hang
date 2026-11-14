package com.qlkho.service;

import com.qlkho.common.RecurringSchedule;
import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Khởi tạo dữ liệu mẫu khi CSDL còn trống (lần chạy đầu tiên). Mật khẩu mọi tài khoản: 123456. */
@Component
@Order(1) // trước ActivityBackfill (USR-07)
public class DataSeeder implements CommandLineRunner {
    private static final String MANAGER_NAME = FixedCatalog.NOTE_BY;
    private static final String STAFF_HN = "Lê Minh Cường";
    private static final String STAFF_HCM = "Bùi Thanh Tâm";

    private final UserRepo users;
    private final ProductRepo products;
    private final StockRepo stocks;
    private final ReceiptRepo receipts;
    private final ReceiptLineRepo lines;
    private final StockHistoryRepo history;
    private final StocktakeRepo stocktakes;
    private final CatalogService catalog;
    private final FixedCatalog fixed;
    private final RecurringPlanRepo plans;
    private final RecurringLineRepo planLines;
    private final BCryptPasswordEncoder encoder;

    public DataSeeder(UserRepo users, ProductRepo products, StockRepo stocks, ReceiptRepo receipts, ReceiptLineRepo lines,
                      StockHistoryRepo history, StocktakeRepo stocktakes, CatalogService catalog, FixedCatalog fixed,
                      RecurringPlanRepo plans, RecurringLineRepo planLines,
                      BCryptPasswordEncoder encoder) {
        this.users = users;
        this.products = products;
        this.stocks = stocks;
        this.receipts = receipts;
        this.lines = lines;
        this.history = history;
        this.stocktakes = stocktakes;
        this.catalog = catalog;
        this.fixed = fixed;
        this.plans = plans;
        this.planLines = planLines;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        fixed.ensure(); // nhà cung cấp, khách hàng, kho cố định: chạy cả với CSDL đã có dữ liệu
        if (users.count() > 0) return;
        String hash = encoder.encode("123456");
        // AUTH-08: email demo nhận OTP qua Mailpit khi chạy local; U5 để trống email (kiểm thử tài khoản chưa có email)
        // BR-36: mỗi kho một Quản lý kho (U2 Hà Nội, U6 TP.HCM, U7 Đà Nẵng) và có thể nhiều Nhân viên kho
        user("U1", "Nguyễn Văn An", "0901111111", "an.nguyen@qlkho.local", hash, Rules.ADMIN, "2026-09-01", Rules.ACTIVE, null);
        user("U2", MANAGER_NAME, "0902222222", "binh.tran@qlkho.local", hash, Rules.MANAGER, "2026-09-01", Rules.ACTIVE, "HN");
        user("U3", STAFF_HN, "0903333333", "cuong.le@qlkho.local", hash, Rules.STAFF, "2026-09-15", Rules.ACTIVE, "HN");
        user("U4", "Phạm Thu Dung", "0904444444", "dung.pham@qlkho.local", hash, Rules.STAFF, "2026-09-15", Rules.LOCKED, "HCM");
        user("U5", "Hoàng Gia Huy", "0905555555", null, hash, Rules.STAFF, "2026-11-03", Rules.DRAFT, "DN");
        user("U6", "Đỗ Quang Hải", "0906666666", "hai.do@qlkho.local", hash, Rules.MANAGER, "2026-09-01", Rules.ACTIVE, "HCM");
        user("U7", "Vũ Ngọc Lan", "0907777777", "lan.vu@qlkho.local", hash, Rules.MANAGER, "2026-09-01", Rules.ACTIVE, "DN");
        user("U8", STAFF_HCM, "0908888888", "tam.bui@qlkho.local", hash, Rules.STAFF, "2026-09-15", Rules.ACTIVE, "HCM");

        product("P01", "SP-0001", "Giấy in A4 70gsm", "Văn phòng phẩm", "Ram", 50);
        product("P02", "SP-0002", "Bút bi xanh (hộp 20)", "Văn phòng phẩm", "Hộp", 30);
        product("P03", "SP-0003", "Bìa hồ sơ nhựa", "Văn phòng phẩm", "Cái", 100);
        product("P04", "SP-0004", "Mực in laser đen", "Vật tư in", "Hộp", 10);
        product("P05", "SP-0005", "Chuột không dây", "Thiết bị điện tử", "Cái", 15);
        product("P06", "SP-0006", "Bàn phím có dây", "Thiết bị điện tử", "Cái", 10);
        product("P07", "SP-0007", "Cáp USB-C 1m", "Thiết bị điện tử", "Sợi", 40);
        product("P08", "SP-0008", "Nước rửa tay 500ml", "Hóa phẩm", "Chai", 24);

        // Tồn ban đầu theo thứ tự kho HN, HCM, DN (kho cố định trong FixedCatalog)
        String[] whs = {"HN", "HCM", "DN"};
        int[][] qty = {{120, 35, 40}, {80, 60, 25}, {90, 150, 60}, {6, 14, 8}, {22, 18, 12}, {12, 4, 9}, {55, 70, 30}, {30, 26, 18}};
        for (int i = 0; i < qty.length; i++)
            for (int k = 0; k < whs.length; k++) stocks.save(Stock.of("P0" + (i + 1), whs[k], qty[i][k]));

        // Phiếu do Nhân viên kho của chính kho đó lập (BR-37)
        receipt("PN-0001", "in", "NCC-01", "HN", "U3", "01/11/2026 09:15", Rules.APPROVED, 1, new String[][]{{"P01", "100"}, {"P02", "50"}});
        receipt("PX-0001", "out", "KH-01", "HN", "U3", "02/11/2026 14:30", Rules.APPROVED, 2, new String[][]{{"P01", "30"}, {"P03", "40"}});
        receipt("PN-0002", "in", "NCC-02", "HCM", "U8", "03/11/2026 10:05", Rules.PENDING, 3, new String[][]{{"P05", "20"}, {"P06", "15"}});
        receipt("PX-0002", "out", "KH-02", "HCM", "U8", "04/11/2026 08:40", Rules.PENDING, 4, new String[][]{{"P02", "20"}});

        // Thẻ kho: ghi theo thứ tự thời gian (cũ trước) để hiển thị mới nhất lên đầu
        history.save(StockHistory.of("01/11/2026 09:15", "P01", "HN", "Nhập", 100, 150, "PN-0001"));
        history.save(StockHistory.of("01/11/2026 09:15", "P02", "HN", "Nhập", 50, 80, "PN-0001"));
        history.save(StockHistory.of("02/11/2026 14:30", "P01", "HN", "Xuất", -30, 120, "PX-0001"));
        history.save(StockHistory.of("02/11/2026 14:30", "P03", "HN", "Xuất", -40, 90, "PX-0001"));

        Stocktake kk = new Stocktake();
        kk.id = "KK-0001";
        kk.createdAt = "31/10/2026 16:00";
        kk.warehouseId = "HN";
        kk.checkedCount = 8;
        kk.diffCount = 0;
        kk.confirmedBy = MANAGER_NAME;
        kk.sortKey = 1;
        stocktakes.save(kk);

        catalog.storeSample("NCC-01", "HopDong_NguyenTac_PhuThinh_2026.pdf", "15/09/2026 09:30", MANAGER_NAME, "HOP DONG NGUYEN TAC 2026",
                List.of("Ben A: Kho cong ty", "Ben B: Cong ty TNHH Van phong pham Phu Thinh (NCC-01)", "Thoi han: 01/2026 - 12/2026", "Tai lieu mau"));
        catalog.storeSample("NCC-01", "GiayPhepKinhDoanh_PhuThinh.pdf", "15/09/2026 09:32", MANAGER_NAME, "GIAY CHUNG NHAN DANG KY KINH DOANH",
                List.of("Cong ty TNHH Van phong pham Phu Thinh", "Tai lieu mau"));
        catalog.storeSample("NCC-02", "DanhMuc_ThietBi_T11-2026.pdf", "01/11/2026 14:10", MANAGER_NAME, "DANH MUC THIET BI CUNG CAP THANG 11/2026",
                List.of("Cong ty CP Cong nghe Dai Viet So (NCC-02)", "Chuot khong day", "Ban phim co day", "Tai lieu mau"));
        catalog.storeSample("KH-01", "HopDong_CungUng_HungPhat.pdf", "20/09/2026 11:00", MANAGER_NAME, "HOP DONG CUNG UNG VAN PHONG PHAM",
                List.of("Cong ty CP Dau tu Xay dung Hung Phat (KH-01)", "Tai lieu mau"));

        // Kế hoạch định kỳ mẫu, bắt đầu từ 2027 nên chưa tự sinh phiếu: dùng "Chạy ngay" để xem phiếu "Hệ thống" lập
        plan("DK-0001", "in", "NCC-01", "HN", RecurringSchedule.QUARTER, 5, 1, "2027-01-01", "Nhập văn phòng phẩm đầu mỗi quý",
                new String[][]{{"P01", "100"}, {"P02", "50"}, {"P03", "80"}});
        plan("DK-0002", "out", "KH-02", "HCM", RecurringSchedule.MONTH, 10, 1, "2027-01-01", "Giao hàng hằng tháng cho nhà sách",
                new String[][]{{"P02", "20"}, {"P07", "30"}});
    }

    private void plan(String id, String type, String partnerId, String wid, String cycle, int day, int monthInCycle, String start,
                      String note, String[][] ls) {
        RecurringPlan p = new RecurringPlan();
        p.id = id; p.receiptType = type; p.partnerId = partnerId; p.warehouseId = wid; p.cycle = cycle; p.dayOfMonth = day;
        p.monthInCycle = monthInCycle; p.startDate = start; p.status = Rules.ACTIVE; p.note = note;
        p.createdBy = MANAGER_NAME; p.createdAt = "10/11/2026 09:00";
        plans.save(p);
        for (String[] l : ls) planLines.save(RecurringLine.of(id, l[0], Integer.parseInt(l[1])));
    }

    private void user(String id, String name, String phone, String email, String hash, String role, String opened, String status,
                      String warehouseId) {
        UserAccount u = new UserAccount();
        u.id = id; u.name = name; u.phone = phone; u.email = email; u.passwordHash = hash; u.role = role; u.opened = opened; u.status = status;
        u.warehouseId = warehouseId;
        users.save(u);
    }

    private void product(String id, String sku, String name, String cat, String unit, int min) {
        Product p = new Product();
        p.id = id; p.sku = sku; p.name = name; p.category = cat; p.unit = unit; p.minStock = min;
        products.save(p);
    }

    private void receipt(String id, String type, String partnerId, String wid, String creatorId, String date, String status,
                         long sortKey, String[][] ls) {
        Receipt r = new Receipt();
        r.id = id; r.receiptType = type; r.partnerId = partnerId; r.warehouseId = wid; r.createdAt = date; r.status = status;
        r.creatorId = creatorId; r.creatorName = "U3".equals(creatorId) ? STAFF_HN : STAFF_HCM;
        r.approverName = Rules.APPROVED.equals(status) ? MANAGER_NAME : "";
        r.note = ""; r.sortKey = sortKey;
        receipts.save(r);
        for (String[] l : ls) lines.save(ReceiptLine.of(id, l[0], Integer.parseInt(l[1])));
    }
}
