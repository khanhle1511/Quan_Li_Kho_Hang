package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.PdfMaker;
import com.qlkho.common.Rules;
import com.qlkho.model.*;
import com.qlkho.repo.*;
import com.qlkho.web.Dto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Danh mục: hàng hóa (FR-03), nhà cung cấp/khách hàng + hồ sơ PDF (FR-04, FR-05), kho (FR-06). */
@Service
public class CatalogService {
    private static final long MAX_PDF_BYTES = 10L * 1024 * 1024;
    private static final byte[] PDF_MAGIC = "%PDF".getBytes(StandardCharsets.US_ASCII);

    private final ProductRepo products;
    private final PartnerRepo partners;
    private final PartnerFileRepo files;
    private final PartnerFileContentRepo contents;
    private final WarehouseRepo warehouses;
    private final StockRepo stocks;
    private final ReceiptRepo receipts;
    private final UserRepo users;
    /** Thư mục chứa file của bản cũ (trước khi chuyển sang lưu trong CSDL). */
    private final Path uploadDir;

    public CatalogService(ProductRepo products, PartnerRepo partners, PartnerFileRepo files, PartnerFileContentRepo contents,
                          WarehouseRepo warehouses, StockRepo stocks, ReceiptRepo receipts, UserRepo users,
                          @Value("${app.upload-dir:./uploads}") String uploadDir) {
        this.products = products;
        this.partners = partners;
        this.files = files;
        this.contents = contents;
        this.warehouses = warehouses;
        this.stocks = stocks;
        this.receipts = receipts;
        this.users = users;
        this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    // ---------- hàng hóa ----------
    @Transactional
    public Map<String, Object> createProduct(Dto.NewProduct f) {
        String sku = Rules.trim(f.sku()), name = Rules.trim(f.name()), unit = Rules.trim(f.unit());
        if (sku.isEmpty() || name.isEmpty() || unit.isEmpty())
            throw ApiException.bad("Vui lòng nhập Mã SKU, Tên hàng hóa và Đơn vị tính.");
        if (products.existsBySkuIgnoreCase(sku)) throw ApiException.bad("Mã SKU “" + sku + "” đã tồn tại.");
        if (f.minStock() == null || f.minStock() < 0) throw ApiException.bad("Tồn tối thiểu phải là số nguyên ≥ 0.");
        long price = f.price() == null ? 0 : f.price();
        if (price < 0) throw ApiException.bad("Giá vốn không hợp lệ.");

        Product p = new Product();
        p.id = Rules.nextCode(products.findAllIds(), "P", 2);
        p.sku = sku;
        p.name = name;
        p.category = Rules.blank(f.category()) ? "Khác" : f.category().trim();
        p.unit = unit;
        p.minStock = f.minStock();
        p.price = price;
        products.save(p);
        return Map.of("id", p.id, "name", p.name);
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

    @Transactional
    public Map<String, Object> createPartner(Dto.PartnerForm f, UserAccount me) {
        String type = f.type();
        if (!"sup".equals(type) && !"cus".equals(type)) throw ApiException.bad("Loại đối tác không hợp lệ.");
        String name = Rules.trim(f.name()), phone = Rules.normPhone(f.phone()), email = Rules.trim(f.email());
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập tên đối tác.");
        checkContact(phone, email);

        String prefix = "sup".equals(type) ? "NCC-" : "KH-";
        Partner p = new Partner();
        p.id = Rules.nextCode(partners.findIdsByPrefix(prefix), prefix, 2);
        p.partnerType = type;
        p.name = name;
        p.phone = phone;
        p.email = email;
        p.address = Rules.trim(f.address());
        p.note = Rules.trim(f.note());
        if (!p.note.isEmpty()) {
            p.noteAt = Rules.now();
            p.noteBy = me.name;
        }
        partners.save(p);
        return Map.of("id", p.id);
    }

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

    // ---------- hồ sơ PDF ----------
    public PartnerFile file(String fileId, UserAccount me) {
        PartnerFile pf = files.findById(fileId).orElseThrow(() -> ApiException.notFound("Không tìm thấy file."));
        visiblePartner(pf.partnerId, me);
        return pf;
    }

    /** Đọc nội dung file: từ CSDL, hoặc từ thư mục uploads với file của bản cũ. */
    public byte[] readFile(PartnerFile pf) {
        Optional<byte[]> data;
        if (pf.inDb()) {
            data = contents.findById(pf.id).map(c -> c.data);
        } else {
            try {
                data = Optional.of(Files.readAllBytes(uploadDir.resolve(pf.storedPath)));
            } catch (IOException e) {
                data = Optional.empty();
            }
        }
        return data.orElseThrow(() -> ApiException.notFound("File " + pf.fileName + " không còn trên máy chủ."));
    }

    @Transactional
    public Map<String, Object> upload(String partnerId, MultipartFile mf, UserAccount me) {
        Partner p = visiblePartner(partnerId, me);
        if (mf == null || mf.isEmpty()) throw ApiException.bad("Chưa chọn file.");
        String name = Optional.ofNullable(mf.getOriginalFilename()).orElse("hoso.pdf");
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
        if (pf.inDb()) {
            contents.deleteById(pf.id);
        } else {
            try {
                Files.deleteIfExists(uploadDir.resolve(pf.storedPath));
            } catch (IOException ignored) {
                // file vật lý có thể đã bị xóa tay; vẫn xóa bản ghi
            }
        }
        files.delete(pf);
    }

    // ---------- kho ----------
    private Warehouse warehouse(String id) {
        return warehouses.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy kho."));
    }

    private long pendingCount(String warehouseId) {
        return receipts.countByWarehouseIdAndStatus(warehouseId, Rules.PENDING);
    }

    private void checkKeeper(String keeperId, String currentKeeperId) {
        if (Rules.blank(keeperId)) return;
        UserAccount k = users.findById(keeperId).orElseThrow(() -> ApiException.bad("Thủ kho đã chọn không còn tồn tại."));
        if (!Rules.MANAGER.equals(k.role) && !Rules.STAFF.equals(k.role))
            throw ApiException.bad("Thủ kho phải là Quản lý kho hoặc Nhân viên kho.");
        if (!Rules.ACTIVE.equals(k.status) && !keeperId.equals(currentKeeperId))
            throw ApiException.bad("Chỉ chọn được tài khoản đang hoạt động làm thủ kho.");
    }

    private static String statusOf(Dto.WarehouseForm f) {
        return Rules.PAUSED.equals(f.status()) ? Rules.PAUSED : Rules.ACTIVE;
    }

    @Transactional
    public Map<String, Object> createWarehouse(Dto.WarehouseForm f) {
        String code = Rules.trim(f.code()).toUpperCase();
        if (!Rules.WH_CODE.matcher(code).matches())
            throw ApiException.bad("Mã kho phải có dạng KHO-XXX (2–10 chữ in hoa hoặc số), ví dụ KHO-DN.");
        if (warehouses.existsByCode(code)) throw ApiException.bad("Mã kho " + code + " đã tồn tại.");
        if (!Rules.isIsoDate(f.opened())) throw ApiException.bad("Vui lòng chọn ngày đưa vào sử dụng.");

        Warehouse w = new Warehouse();
        fillWarehouse(w, f);
        w.id = code.substring("KHO-".length());
        if (warehouses.existsById(w.id)) w.id = w.id + "-" + (System.currentTimeMillis() % 1000);
        w.code = code;
        w.opened = f.opened();
        w.status = statusOf(f);
        warehouses.save(w);
        return Map.of("id", w.id, "name", w.name);
    }

    /** Kiểm tra và ghi các trường sửa được của kho (tên, địa chỉ, SĐT, sức chứa, thủ kho). */
    private void fillWarehouse(Warehouse w, Dto.WarehouseForm f) {
        String name = Rules.trim(f.name()), address = Rules.trim(f.address()), phone = Rules.normPhone(f.phone());
        int cap = f.capacity() == null ? 0 : f.capacity();
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập tên kho.");
        boolean dupName = w.id == null ? warehouses.existsByNameIgnoreCase(name)
                : warehouses.existsByNameIgnoreCaseAndIdNot(name, w.id);
        if (dupName) throw ApiException.bad("Tên kho “" + name + "” đã được dùng.");
        if (address.isEmpty()) throw ApiException.bad("Vui lòng nhập địa chỉ kho.");
        if (!phone.isEmpty() && !Rules.ANY_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại kho không hợp lệ (10–11 chữ số, bắt đầu bằng 0).");
        if (cap < 0) throw ApiException.bad("Sức chứa phải là số nguyên ≥ 0 (để trống nếu không giới hạn).");
        checkKeeper(f.keeperId(), w.keeperId);
        w.name = name;
        w.address = address;
        w.phone = phone;
        w.capacity = cap;
        w.keeperId = Rules.blank(f.keeperId()) ? null : f.keeperId();
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
        warehouses.delete(w);
        // Phiếu, thẻ kho và phiếu kiểm kê cũ được giữ nguyên để tra cứu lịch sử
        return Map.of("name", w.name);
    }
}
