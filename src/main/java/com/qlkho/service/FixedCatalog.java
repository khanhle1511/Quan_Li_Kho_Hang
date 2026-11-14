package com.qlkho.service;

import com.qlkho.common.Rules;
import com.qlkho.model.Partner;
import com.qlkho.model.Warehouse;
import com.qlkho.repo.PartnerRepo;
import com.qlkho.repo.WarehouseRepo;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Danh mục cố định: 4 nhà cung cấp, 2 khách hàng, 3 kho. Ứng dụng không có chức năng tạo mới các loại này.
 * Mỗi lần khởi động, bản ghi nào còn thiếu (theo mã) sẽ được thêm vào; bản ghi đã có giữ nguyên
 * để không ghi đè những gì người dùng đã sửa (tên, liên hệ, ghi chú…). Quản lý kho / Nhân viên kho của từng kho
 * nằm ở tài khoản (UserAccount.warehouseId, BR-36).
 */
@Component
public class FixedCatalog {
    static final String NOTE_BY = "Trần Thị Bình";

    record PartnerSeed(String id, String type, String name, String phone, String email, String address,
                       String note, String noteAt) {}

    record WarehouseSeed(String id, String name, String address, String phone, int capacity, String opened) {}

    static final List<PartnerSeed> PARTNERS = List.of(
            new PartnerSeed("NCC-01", "sup", "Công ty TNHH Văn phòng phẩm Phú Thịnh", "0904618273",
                    "kinhdoanh@vppphuthinh.vn", "18 Trần Quốc Hoàn, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
                    "Giao hàng thứ Hai và thứ Năm. Chiết khấu 3% cho đơn từ 10 triệu đồng.", "28/10/2026 10:20"),
            new PartnerSeed("NCC-02", "sup", "Công ty CP Công nghệ Đại Việt Số", "02838624157",
                    "sales@daivietso.com.vn", "225 Lý Thường Kiệt, Phường 15, Quận 11, TP.HCM",
                    "Bảo hành thiết bị 12 tháng, đổi mới trong 7 ngày nếu lỗi nhà sản xuất.", "02/11/2026 15:05"),
            new PartnerSeed("NCC-03", "sup", "Công ty TNHH Hóa phẩm Thanh Bình", "0918352640",
                    "lienhe@hoaphamthanhbinh.vn", "Đường số 7, KCN Sóng Thần 2, Dĩ An, Bình Dương", "", ""),
            new PartnerSeed("NCC-04", "sup", "Công ty TNHH Vật tư In ấn Kim Long", "02363825519",
                    "banhang@inkimlong.vn", "72 Nguyễn Văn Linh, Nam Dương, Hải Châu, Đà Nẵng",
                    "Chuyên mực in và trống máy in chính hãng. Thanh toán trong 30 ngày kể từ ngày nhận hàng.", "05/11/2026 08:45"),
            new PartnerSeed("KH-01", "cus", "Công ty CP Đầu tư Xây dựng Hưng Phát", "02437762580",
                    "muahang@hungphat.com.vn", "45 Láng Hạ, Thành Công, Ba Đình, Hà Nội",
                    "Chỉ nhận hàng trong giờ hành chính, cần xuất hóa đơn VAT theo từng phiếu.", "30/10/2026 09:00"),
            new PartnerSeed("KH-02", "cus", "Nhà sách Tân Việt – Chi nhánh Quận 3", "02839306612",
                    "cungung@nhasachtanviet.vn", "120 Võ Văn Tần, Võ Thị Sáu, Quận 3, TP.HCM", "", ""));

    static final List<WarehouseSeed> WAREHOUSES = List.of(
            new WarehouseSeed("HN", "Kho Hà Nội", "Lô C2, KCN Sài Đồng B, Long Biên, Hà Nội", "02438752169", 2000, "2026-01-05"),
            new WarehouseSeed("HCM", "Kho TP.HCM", "Số 12 Đường số 6, KCX Linh Trung, Thủ Đức, TP.HCM", "02837241580", 1500, "2026-03-01"),
            new WarehouseSeed("DN", "Kho Đà Nẵng", "Lô 9 Đường số 3, KCN Hòa Khánh, Liên Chiểu, Đà Nẵng", "02363733418", 1000, "2026-06-15"));

    private final PartnerRepo partners;
    private final WarehouseRepo warehouses;

    public FixedCatalog(PartnerRepo partners, WarehouseRepo warehouses) {
        this.partners = partners;
        this.warehouses = warehouses;
    }

    /** Thêm các đối tác và kho cố định còn thiếu. */
    @Transactional
    public void ensure() {
        for (PartnerSeed s : PARTNERS) if (!partners.existsById(s.id())) partners.save(toPartner(s));
        for (WarehouseSeed s : WAREHOUSES) if (!warehouses.existsById(s.id())) warehouses.save(toWarehouse(s));
    }

    private static Partner toPartner(PartnerSeed s) {
        Partner p = new Partner();
        p.id = s.id(); p.partnerType = s.type(); p.name = s.name(); p.phone = s.phone(); p.email = s.email();
        p.address = s.address(); p.note = s.note(); p.noteAt = s.noteAt(); p.noteBy = s.note().isEmpty() ? "" : NOTE_BY;
        return p;
    }

    private static Warehouse toWarehouse(WarehouseSeed s) {
        Warehouse w = new Warehouse();
        w.id = s.id(); w.code = "KHO-" + s.id(); w.name = s.name(); w.address = s.address();
        w.phone = s.phone(); w.capacity = s.capacity(); w.opened = s.opened(); w.status = Rules.ACTIVE;
        return w;
    }
}
