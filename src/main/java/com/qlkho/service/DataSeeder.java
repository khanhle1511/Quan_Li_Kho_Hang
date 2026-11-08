package com.qlkho.service;

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
    private static final String MANAGER_NAME = "Trần Thị Bình";

    private final UserRepo users;
    private final WarehouseRepo warehouses;
    private final ProductRepo products;
    private final StockRepo stocks;
    private final PartnerRepo partners;
    private final ReceiptRepo receipts;
    private final ReceiptLineRepo lines;
    private final StockHistoryRepo history;
    private final StocktakeRepo stocktakes;
    private final CatalogService catalog;
    private final BCryptPasswordEncoder encoder;

    public DataSeeder(UserRepo users, WarehouseRepo warehouses, ProductRepo products, StockRepo stocks, PartnerRepo partners,
                      ReceiptRepo receipts, ReceiptLineRepo lines, StockHistoryRepo history, StocktakeRepo stocktakes,
                      CatalogService catalog, BCryptPasswordEncoder encoder) {
        this.users = users;
        this.warehouses = warehouses;
        this.products = products;
        this.stocks = stocks;
        this.partners = partners;
        this.receipts = receipts;
        this.lines = lines;
        this.history = history;
        this.stocktakes = stocktakes;
        this.catalog = catalog;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) return;
        String hash = encoder.encode("123456");
        // AUTH-08: email demo nhận OTP qua Mailpit khi chạy local; U5 để trống email (kiểm thử tài khoản chưa có email)
        user("U1", "Nguyễn Văn An", "0901111111", "an.nguyen@qlkho.local", hash, Rules.ADMIN, "2026-09-01", Rules.ACTIVE);
        user("U2", MANAGER_NAME, "0902222222", "binh.tran@qlkho.local", hash, Rules.MANAGER, "2026-09-01", Rules.ACTIVE);
        user("U3", "Lê Minh Cường", "0903333333", "cuong.le@qlkho.local", hash, Rules.STAFF, "2026-09-15", Rules.ACTIVE);
        user("U4", "Phạm Thu Dung", "0904444444", "dung.pham@qlkho.local", hash, Rules.STAFF, "2026-09-15", Rules.LOCKED);
        user("U5", "Hoàng Gia Huy", "0905555555", null, hash, Rules.STAFF, "2026-11-03", Rules.DRAFT);

        warehouse("HN", "KHO-HN", "Kho Hà Nội", "Long Biên, Hà Nội", "U2", "0243999888", 2000, "2026-01-05");
        warehouse("HCM", "KHO-HCM", "Kho TP.HCM", "Thủ Đức, TP.HCM", "U3", "0283777666", 1500, "2026-03-01");

        product("P01", "SP-0001", "Giấy in A4 70gsm", "Văn phòng phẩm", "Ram", 50, 65000);
        product("P02", "SP-0002", "Bút bi xanh (hộp 20)", "Văn phòng phẩm", "Hộp", 30, 48000);
        product("P03", "SP-0003", "Bìa hồ sơ nhựa", "Văn phòng phẩm", "Cái", 100, 6000);
        product("P04", "SP-0004", "Mực in laser đen", "Vật tư in", "Hộp", 10, 420000);
        product("P05", "SP-0005", "Chuột không dây", "Thiết bị điện tử", "Cái", 15, 180000);
        product("P06", "SP-0006", "Bàn phím có dây", "Thiết bị điện tử", "Cái", 10, 250000);
        product("P07", "SP-0007", "Cáp USB-C 1m", "Thiết bị điện tử", "Sợi", 40, 55000);
        product("P08", "SP-0008", "Nước rửa tay 500ml", "Hóa phẩm", "Chai", 24, 42000);

        int[][] qty = {{120, 35}, {80, 60}, {90, 150}, {6, 14}, {22, 18}, {12, 4}, {55, 70}, {30, 26}};
        for (int i = 0; i < qty.length; i++) {
            String pid = "P0" + (i + 1);
            stocks.save(Stock.of(pid, "HN", qty[i][0]));
            stocks.save(Stock.of(pid, "HCM", qty[i][1]));
        }

        partner("NCC-01", "sup", "Công ty TNHH VPP Minh An", "0901234567", "kinhdoanh@vppminhan.vn", "Cầu Giấy, Hà Nội",
                "Giao hàng thứ Hai và thứ Năm. Chiết khấu 3% cho đơn trên 10 triệu đồng.", "28/10/2026 10:20");
        partner("NCC-02", "sup", "Công ty CP Thiết bị số Hoàng Long", "0912345678", "sales@hoanglongtech.vn", "Quận 10, TP.HCM",
                "Bảo hành thiết bị 12 tháng, đổi trả trong 7 ngày nếu lỗi nhà sản xuất.", "02/11/2026 15:05");
        partner("NCC-03", "sup", "Công ty TNHH Hóa phẩm Sao Mai", "0987654321", "lienhe@saomai.com.vn", "Thuận An, Bình Dương", "", "");
        partner("KH-01", "cus", "Phòng Hành chính – Chi nhánh 1", "0243111222", "hanhchinh.cn1@congty.vn", "Đống Đa, Hà Nội",
                "Chỉ nhận hàng trong giờ hành chính.", "30/10/2026 09:00");
        partner("KH-02", "cus", "Cửa hàng Quận 3", "0283333444", "cuahangq3@congty.vn", "Quận 3, TP.HCM", "", "");
        partner("KH-03", "cus", "Công ty TNHH An Phát", "0905777888", "muahang@anphat.vn", "Hải Châu, Đà Nẵng", "", "");

        receipt("PN-0001", "in", "NCC-01", "HN", "01/11/2026 09:15", Rules.APPROVED, 1, new String[][]{{"P01", "100"}, {"P02", "50"}});
        receipt("PX-0001", "out", "KH-01", "HN", "02/11/2026 14:30", Rules.APPROVED, 2, new String[][]{{"P01", "30"}, {"P03", "40"}});
        receipt("PN-0002", "in", "NCC-02", "HCM", "03/11/2026 10:05", Rules.PENDING, 3, new String[][]{{"P05", "20"}, {"P06", "15"}});
        receipt("PX-0002", "out", "KH-02", "HCM", "04/11/2026 08:40", Rules.PENDING, 4, new String[][]{{"P02", "20"}});

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

        catalog.storeSample("NCC-01", "HopDong_NguyenTac_MinhAn_2026.pdf", "15/09/2026 09:30", MANAGER_NAME, "HOP DONG NGUYEN TAC 2026",
                List.of("Ben A: Kho cong ty", "Ben B: Cong ty TNHH VPP Minh An (NCC-01)", "Thoi han: 01/2026 - 12/2026", "Tai lieu mau"));
        catalog.storeSample("NCC-01", "GiayPhepKinhDoanh_MinhAn.pdf", "15/09/2026 09:32", MANAGER_NAME, "GIAY CHUNG NHAN DANG KY KINH DOANH",
                List.of("Cong ty TNHH VPP Minh An", "Tai lieu mau"));
        catalog.storeSample("NCC-02", "BaoGia_ThietBi_T11-2026.pdf", "01/11/2026 14:10", MANAGER_NAME, "BAO GIA THIET BI THANG 11/2026",
                List.of("Cong ty CP Thiet bi so Hoang Long (NCC-02)", "Chuot khong day: 180.000 d", "Ban phim co day: 250.000 d", "Tai lieu mau"));
        catalog.storeSample("KH-01", "HopDong_CungUng_CN1.pdf", "20/09/2026 11:00", MANAGER_NAME, "HOP DONG CUNG UNG NOI BO",
                List.of("Phong Hanh chinh - Chi nhanh 1 (KH-01)", "Tai lieu mau"));
    }

    private void user(String id, String name, String phone, String email, String hash, String role, String opened, String status) {
        UserAccount u = new UserAccount();
        u.id = id; u.name = name; u.phone = phone; u.email = email; u.passwordHash = hash; u.role = role; u.opened = opened; u.status = status;
        users.save(u);
    }

    private void warehouse(String id, String code, String name, String address, String keeperId, String phone, int cap, String opened) {
        Warehouse w = new Warehouse();
        w.id = id; w.code = code; w.name = name; w.address = address; w.keeperId = keeperId; w.phone = phone;
        w.capacity = cap; w.opened = opened; w.status = Rules.ACTIVE;
        warehouses.save(w);
    }

    private void product(String id, String sku, String name, String cat, String unit, int min, long price) {
        Product p = new Product();
        p.id = id; p.sku = sku; p.name = name; p.category = cat; p.unit = unit; p.minStock = min; p.price = price;
        products.save(p);
    }

    private void partner(String id, String type, String name, String phone, String email, String address, String note, String noteAt) {
        Partner p = new Partner();
        p.id = id; p.partnerType = type; p.name = name; p.phone = phone; p.email = email; p.address = address;
        p.note = note; p.noteAt = noteAt; p.noteBy = note.isEmpty() ? "" : MANAGER_NAME;
        partners.save(p);
    }

    private void receipt(String id, String type, String partnerId, String wid, String date, String status, long sortKey, String[][] ls) {
        Receipt r = new Receipt();
        r.id = id; r.receiptType = type; r.partnerId = partnerId; r.warehouseId = wid; r.createdAt = date; r.status = status;
        r.creatorId = "U3"; r.creatorName = "Lê Minh Cường";
        r.approverName = Rules.APPROVED.equals(status) ? MANAGER_NAME : "";
        r.note = ""; r.sortKey = sortKey;
        receipts.save(r);
        for (String[] l : ls) lines.save(ReceiptLine.of(id, l[0], Integer.parseInt(l[1])));
    }
}
