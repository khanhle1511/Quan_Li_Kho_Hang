package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.PdfMaker;
import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import com.qlkho.web.Dto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Danh mục: hàng hóa (FR-03), nhà cung cấp/khách hàng + hồ sơ PDF (FR-04, FR-05), kho (FR-06). */
@Service
public class CatalogService {
    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;
    /** Bằng độ dài cột ho_so_doi_tac.file_name (PartnerFile.fileName). */
    private static final int MAX_FILE_NAME = 255;
    private static final byte[] PDF_MAGIC = "%PDF".getBytes(StandardCharsets.US_ASCII);

    private final ProductRepo products;
    private final PartnerRepo partners;
    private final PartnerFileRepo files;
    private final PartnerFileContentRepo contents;
    private final WarehouseRepo warehouses;
    private final StockRepo stocks;
    private final ReceiptRepo receipts;
    /** BR-36: Quản lý kho của từng kho. */
    private final WarehouseStaffing staffing;
    /** BUG-007: tạo hàng hóa chạy tuần tự và INSERT thật, không ghi đè bản ghi cùng mã. */
    private final CreateTx create;

    public CatalogService(ProductRepo products, PartnerRepo partners, PartnerFileRepo files, PartnerFileContentRepo contents,
                          WarehouseRepo warehouses, StockRepo stocks, ReceiptRepo receipts, WarehouseStaffing staffing, CreateTx create) {
        this.products = products;
        this.partners = partners;
        this.files = files;
        this.contents = contents;
        this.warehouses = warehouses;
        this.stocks = stocks;
        this.receipts = receipts;
        this.staffing = staffing;
        this.create = create;
    }

    // ---------- hàng hóa ----------
    public Map<String, Object> createProduct(Dto.NewProduct f) {
        return create.run(() -> createProductTx(f));
    }

    private Map<String, Object> createProductTx(Dto.NewProduct f) {
        Product p = new Product();
        p.id = Rules.nextCode(products.findAllIds(), "P", 2);
        fillProduct(p, f);
        create.insert(p);
        return Map.of("id", p.id, "name", p.name);
    }

    /** Quản trị viên sửa hàng hóa: mã SKU, tên, danh mục, đơn vị tính, tồn tối thiểu. Tồn kho và chứng từ giữ nguyên. */
    @Transactional
    public Map<String, Object> updateProduct(String id, Dto.NewProduct f) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy hàng hóa " + id + "."));
        fillProduct(p, f);
        products.save(p);
        return Map.of("id", p.id, "name", p.name, "sku", p.sku);
    }

    /** Kiểm tra và ghi các trường của hàng hóa; mã SKU không trùng với mặt hàng khác. */
    private void fillProduct(Product p, Dto.NewProduct f) {
        String sku = Rules.trim(f.sku()), name = Rules.trim(f.name()), unit = Rules.trim(f.unit());
        if (sku.isEmpty() || name.isEmpty() || unit.isEmpty())
            throw ApiException.bad("Vui lòng nhập Mã SKU, Tên hàng hóa và Đơn vị tính.");
        boolean skuTaken = p.id == null ? products.existsBySkuIgnoreCase(sku) : products.existsBySkuIgnoreCaseAndIdNot(sku, p.id);
        if (skuTaken) throw ApiException.bad("Mã SKU “" + sku + "” đã tồn tại.");
        if (f.minStock() == null || f.minStock() < 0) throw ApiException.bad("Tồn tối thiểu phải là số nguyên ≥ 0.");
        p.sku = sku;
        p.name = name;
        p.category = Rules.blank(f.category()) ? "Khác" : f.category().trim();
        p.unit = unit;
        p.minStock = f.minStock();
    }

    // ---------- đối tác ----------
    private Partner partner(String id) {
        return partners.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đối tác " + id + "."));
    }

    /** Đối tác mà người dùng hiện tại được xem liên hệ và hồ sơ. */
    private Partner visiblePartner(String id, UserAccount me) {
        Partner p = partner(id);
        if (Rules.hideContact(p.partnerType, me.role)) throw ApiException.forbidden();
        return p;
    }

    private void checkContact(String phone, String email) {
        if (phone.isEmpty() && email.isEmpty())
            throw ApiException.bad("Cần ít nhất một thông tin liên hệ: số điện thoại hoặc email.");
        if (!phone.isEmpty() && !Rules.ANY_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại không hợp lệ (10–11 chữ số, bắt đầu bằng 0).");
        if (!email.isEmpty() && !Rules.EMAIL.matcher(email).matches()) throw ApiException.bad("Email không hợp lệ.");
    }

    // Nhà cung cấp / khách hàng là danh sách cố định (FixedCatalog), không tạo mới; chỉ sửa thông tin, ghi chú, hồ sơ.
    @Transactional
    public Map<String, Object> updatePartner(String id, Dto.PartnerForm f, UserAccount me) {
        Partner p = partner(id);
        String name = Rules.trim(f.name());
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập tên đối tác.");
        // Vai trò không được xem SĐT/email thì cũng không được sửa: giữ nguyên giá trị cũ
        if (!Rules.hideContact(p.partnerType, me.role)) {
            String phone = Rules.normPhone(f.phone()), email = Rules.trim(f.email());
            checkContact(phone, email);
            p.phone = phone;
            p.email = email;
        }
        p.name = name;
        p.address = Rules.trim(f.address());
        partners.save(p);
        return Map.of("id", p.id);
    }

    @Transactional
    public Map<String, Object> saveNote(String id, String note, UserAccount me) {
        Partner p = partner(id);
        p.note = Rules.trim(note);
        p.noteAt = Rules.now();
        p.noteBy = me.name;
        partners.save(p);
        return Map.of("id", p.id);
    }

    // ---------- hồ sơ PDF (nội dung lưu trong bảng ho_so_noi_dung) ----------
    public PartnerFile file(String fileId, UserAccount me) {
        PartnerFile pf = files.findById(fileId).orElseThrow(() -> ApiException.notFound("Không tìm thấy file."));
        visiblePartner(pf.partnerId, me);
        return pf;
    }

    public byte[] readFile(PartnerFile pf) {
        return contents.findById(pf.id).map(c -> c.data)
                .orElseThrow(() -> ApiException.notFound("File " + pf.fileName + " không còn trên máy chủ."));
    }

    @Transactional
    public Map<String, Object> upload(String partnerId, MultipartFile mf, UserAccount me) {
        Partner p = visiblePartner(partnerId, me);
        if (mf == null || mf.isEmpty()) throw ApiException.bad("Chưa chọn file.");
        String name = Optional.ofNullable(mf.getOriginalFilename()).orElse("hoso.pdf");
        // BUG-009: cột ho_so_doi_tac.file_name là VARCHAR(255); dài hơn thì CSDL từ chối → 500. Chặn trước và báo rõ.
        if (name.length() > MAX_FILE_NAME)
            throw ApiException.bad("Tên file quá dài (tối đa " + MAX_FILE_NAME + " ký tự). Vui lòng đổi tên rồi tải lại.");
        if (!name.toLowerCase().endsWith(".pdf")) throw ApiException.bad(name + " không phải file PDF.");
        if (mf.getSize() > MAX_PDF_BYTES) throw ApiException.bad(name + " vượt quá 10 MB.");
        byte[] bytes;
        try {
            bytes = mf.getBytes();
        } catch (IOException e) {
            throw ApiException.bad("Không đọc được file " + name + ".");
        }
        if (bytes.length < PDF_MAGIC.length || !Arrays.equals(bytes, 0, PDF_MAGIC.length, PDF_MAGIC, 0, PDF_MAGIC.length))
            throw ApiException.bad(name + " không phải file PDF hợp lệ.");
        return Map.of("id", store(p.id, name, bytes, me.name, Rules.now()).id);
    }

    /** Lưu nội dung file vào bảng ho_so_noi_dung và thông tin file vào ho_so_doi_tac. */
    @Transactional
    public PartnerFile store(String partnerId, String fileName, byte[] bytes, String by, String at) {
        String id = UUID.randomUUID().toString();
        PartnerFileContent c = new PartnerFileContent();
        c.id = id;
        c.data = bytes;
        contents.save(c);
        PartnerFile pf = new PartnerFile();
        pf.id = id;
        pf.partnerId = partnerId;
        pf.fileName = fileName;
        pf.fileSize = bytes.length;
        pf.uploadedAt = at;
        pf.uploadedBy = by;
        pf.storedPath = PartnerFile.IN_DB;
        return files.save(pf);
    }

    /** Hồ sơ mẫu dùng khi khởi tạo dữ liệu. */
    @Transactional
    public void storeSample(String partnerId, String fileName, String at, String by, String title, List<String> lines) {
        store(partnerId, fileName, PdfMaker.simplePdf(title, lines), by, at);
    }

    @Transactional
    public void deleteFile(String fileId, UserAccount me) {
        PartnerFile pf = file(fileId, me);
        contents.deleteById(pf.id);
        files.delete(pf);
    }

    // ---------- kho ----------
    private Warehouse warehouse(String id) {
        return warehouses.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy kho."));
    }

    private long pendingCount(String warehouseId) {
        return receipts.countByWarehouseIdAndStatus(warehouseId, Rules.PENDING);
    }

    private static String statusOf(Dto.WarehouseForm f) {
        return Rules.PAUSED.equals(f.status()) ? Rules.PAUSED : Rules.ACTIVE;
    }

    // Kho là danh sách cố định (FixedCatalog), không tạo mới; chỉ sửa, tạm ngưng/mở lại, xóa.

    /** Kiểm tra và ghi các trường sửa được của kho (tên, địa chỉ, SĐT, sức chứa) và Quản lý kho (BR-36). */
    private void fillWarehouse(Warehouse w, Dto.WarehouseForm f) {
        String name = Rules.trim(f.name()), address = Rules.trim(f.address()), phone = Rules.normPhone(f.phone());
        int cap = f.capacity() == null ? 0 : f.capacity();
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập tên kho.");
        if (warehouses.existsByNameIgnoreCaseAndIdNot(name, w.id)) throw ApiException.bad("Tên kho “" + name + "” đã được dùng.");
        if (address.isEmpty()) throw ApiException.bad("Vui lòng nhập địa chỉ kho.");
        if (!phone.isEmpty() && !Rules.ANY_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại kho không hợp lệ (10–11 chữ số, bắt đầu bằng 0).");
        if (cap < 0) throw ApiException.bad("Sức chứa phải là số nguyên ≥ 0 (để trống nếu không giới hạn).");
        w.name = name;
        w.address = address;
        w.phone = phone;
        w.capacity = cap;
        staffing.setManager(w, f.managerId());
    }

    @Transactional
    public Map<String, Object> updateWarehouse(String id, Dto.WarehouseForm f) {
        Warehouse w = warehouse(id);
        int cap = f.capacity() == null ? 0 : f.capacity();
        long qty = stocks.sumQtyByWarehouseId(id);
        if (cap > 0 && cap < qty)
            throw ApiException.bad("Sức chứa (" + Rules.fmt(cap) + ") không được nhỏ hơn số lượng đang tồn (" + Rules.fmt(qty) + ").");
        String newStatus = statusOf(f);
        if (Rules.PAUSED.equals(newStatus) && !Rules.PAUSED.equals(w.status)) checkCanPause(w);
        fillWarehouse(w, f);
        w.status = newStatus;
        warehouses.save(w);
        return Map.of("id", w.id, "name", w.name);
    }

    private void checkCanPause(Warehouse w) {
        long pend = pendingCount(w.id);
        if (pend > 0)
            throw ApiException.bad("Không thể tạm ngưng " + w.name + ": còn " + pend + " phiếu chờ duyệt. Hãy xử lý các phiếu này trước.");
        if (warehouses.countByStatus(Rules.ACTIVE) <= 1) throw ApiException.bad("Phải có ít nhất một kho đang hoạt động.");
    }

    @Transactional
    public Map<String, Object> setWarehouseStatus(String id, String status) {
        Warehouse w = warehouse(id);
        if (!Rules.ACTIVE.equals(status) && !Rules.PAUSED.equals(status)) throw ApiException.bad("Trạng thái không hợp lệ.");
        if (Rules.PAUSED.equals(status) && !Rules.PAUSED.equals(w.status)) checkCanPause(w);
        w.status = status;
        warehouses.save(w);
        return Map.of("id", w.id, "name", w.name, "status", w.status);
    }

    @Transactional
    public Map<String, Object> deleteWarehouse(String id) {
        Warehouse w = warehouse(id);
        if (!Rules.PAUSED.equals(w.status)) throw ApiException.bad("Hãy tạm ngưng " + w.name + " trước, sau đó mới có thể xóa.");
        long qty = stocks.sumQtyByWarehouseId(id);
        if (qty > 0)
            throw ApiException.bad("Không thể xóa " + w.name + ": kho còn " + Rules.fmt(qty) + " đơn vị hàng. Hãy xuất hết hàng trước.");
        if (pendingCount(id) > 0) throw ApiException.bad("Không thể xóa " + w.name + ": còn phiếu chờ duyệt.");
        stocks.deleteByWarehouseId(id);
        staffing.releaseAll(id);
        warehouses.delete(w);
        // Phiếu, thẻ kho và phiếu kiểm kê cũ được giữ nguyên để tra cứu lịch sử
        return Map.of("name", w.name);
    }
}
