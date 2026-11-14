package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.PasswordPolicy;
import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.repo.UserRepo;
import com.qlkho.web.Dto;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** FR-02 – Quản trị viên quản lý tài khoản. */
@Service
public class UserService {
    private static final Set<String> STATUSES = Set.of(Rules.ACTIVE, Rules.DRAFT, Rules.LOCKED);
    /** Bằng độ dài cột nguoi_dung.name (UserAccount.name). */
    private static final int NAME_MAX = 100;
    /** Bằng độ dài cột nguoi_dung.email (UserAccount.email). */
    private static final int EMAIL_MAX = 254;

    private final UserRepo users;
    private final BCryptPasswordEncoder encoder;
    private final CreateTx create;
    /** BR-36: kho làm việc của Quản lý kho / Nhân viên kho. */
    private final WarehouseStaffing staffing;

    public UserService(UserRepo users, BCryptPasswordEncoder encoder, CreateTx create, WarehouseStaffing staffing) {
        this.users = users;
        this.encoder = encoder;
        this.create = create;
        this.staffing = staffing;
    }

    private UserAccount user(String id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản."));
    }

    private String checkPhone(String raw, String selfId) {
        String phone = Rules.normPhone(raw);
        if (!Rules.LOGIN_PHONE.matcher(phone).matches())
            throw ApiException.bad("Số điện thoại không hợp lệ: cần 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.");
        users.findByPhone(phone).ifPresent(o -> {
            if (!o.id.equals(selfId)) throw ApiException.bad("Số điện thoại " + phone + " đã được dùng cho tài khoản khác.");
        });
        return phone;
    }

    /**
     * AUTH-08 / BR-27: email không bắt buộc (trống → null), đúng định dạng, lưu chữ thường, không trùng tài khoản khác.
     */
    private String checkEmail(String raw, String selfId) {
        String email = Rules.trim(raw).toLowerCase(Locale.ROOT);
        if (email.isEmpty()) return null;
        if (email.length() > EMAIL_MAX || !Rules.EMAIL.matcher(email).matches())
            throw ApiException.bad("Email không hợp lệ.");
        users.findByEmail(email).ifPresent(o -> {
            if (!o.id.equals(selfId)) throw ApiException.bad("Email đã được dùng cho tài khoản khác.");
        });
        return email;
    }

    /** BUG-007: sinh mã + kiểm tra trùng SĐT + INSERT chạy tuần tự trong CreateTx, không ghi đè tài khoản cùng mã. */
    public Map<String, Object> create(Dto.UserForm f) {
        return create.run(() -> createTx(f));
    }

    private Map<String, Object> createTx(Dto.UserForm f) {
        String name = Rules.trim(f.name());
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập họ tên.");
        String phone = checkPhone(f.phone(), null);
        String email = checkEmail(f.email(), null);
        PasswordPolicy.check(f.password());
        if (!Rules.ROLES.contains(f.role())) throw ApiException.bad("Vai trò không hợp lệ.");
        if (!Rules.isIsoDate(f.opened())) throw ApiException.bad("Vui lòng chọn ngày mở tài khoản.");
        if (WarehouseStaffing.worksAtWarehouse(f.role()) && Rules.blank(f.warehouseId()))
            throw ApiException.bad("Vui lòng chọn kho làm việc cho " + Rules.ROLE_LABEL.get(f.role()) + ".");
        String warehouseId = staffing.checkAssignment(f.role(), f.warehouseId(), null);

        UserAccount u = new UserAccount();
        // BUG-011: lấy số từ bộ đếm chỉ tăng, không suy từ mã đang tồn tại, để mã tài khoản đã xóa không bị cấp lại
        u.id = "U" + create.nextNumber("U", users.findAllIds(), "U");
        u.name = name;
        u.phone = phone;
        u.email = email;
        u.passwordHash = encoder.encode(f.password());
        u.role = f.role();
        u.opened = f.opened();
        u.warehouseId = warehouseId;
        u.status = STATUSES.contains(f.status()) ? f.status() : Rules.DRAFT;
        create.insert(u);
        return Map.of("id", u.id, "name", u.name);
    }

    /**
     * Admin sửa được họ tên (CR-02), số điện thoại đăng nhập, email (AUTH-08), mật khẩu và kho làm việc (BR-36)
     * của mọi tài khoản; vai trò, ngày mở giữ nguyên.
     */
    @Transactional
    public Map<String, Object> update(String id, Dto.UserForm f) {
        UserAccount u = user(id);
        // CR-02 (07/11/2026): Admin sửa được thêm HỌ TÊN của mọi tài khoản. Không gửi "name" (client cũ) thì giữ tên cũ.
        String name = f.name() == null ? u.name : Rules.trim(f.name());
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập họ tên.");
        if (name.length() > NAME_MAX) throw ApiException.bad("Họ tên tối đa " + NAME_MAX + " ký tự.");
        String phone = checkPhone(f.phone(), u.id);
        // AUTH-08: không gửi "email" (client cũ) thì giữ email cũ; gửi chuỗi trống thì xóa email
        String email = f.email() == null ? u.email : checkEmail(f.email(), u.id);
        boolean changePass = !Rules.blank(f.password());
        if (changePass) PasswordPolicy.check(f.password());
        boolean changeEmail = !Objects.equals(email, u.email);
        // BR-36: không gửi "warehouseId" (client cũ) thì giữ kho cũ; chuỗi trống = bỏ phân kho
        String warehouseId = f.warehouseId() == null ? u.warehouseId : staffing.checkAssignment(u.role, f.warehouseId(), u.id);
        boolean changeWarehouse = !Objects.equals(warehouseId, u.warehouseId);
        if (name.equals(u.name) && phone.equals(u.phone) && !changeEmail && !changePass && !changeWarehouse)
            throw ApiException.bad("Chưa có thay đổi nào để lưu.");
        List<String> changes = new ArrayList<>(); // USR-07: ghi vào nhật ký những gì đã đổi
        if (!name.equals(u.name)) changes.add("họ tên");
        if (!phone.equals(u.phone)) changes.add("SĐT");
        if (changeEmail) changes.add("email");
        if (changePass) changes.add("mật khẩu");
        if (changeWarehouse) changes.add("kho làm việc");
        u.name = name;
        u.phone = phone;
        u.email = email;
        u.warehouseId = warehouseId;
        if (changePass) u.passwordHash = encoder.encode(f.password());
        users.save(u);
        return Map.of("id", u.id, "name", u.name, "changes", changes);
    }

    @Transactional
    public Map<String, Object> setStatus(String id, String status, UserAccount me) {
        UserAccount u = user(id);
        if (u.id.equals(me.id)) throw ApiException.bad("Bạn không thể đổi trạng thái tài khoản của chính mình.");
        if (!STATUSES.contains(status)) throw ApiException.bad("Trạng thái không hợp lệ.");
        String before = u.status;
        u.status = status;
        users.save(u);
        return Map.of("id", u.id, "name", u.name, "before", before, "status", status);
    }

    /** Chỉ xóa được tài khoản đã khóa; chứng từ cũ vẫn giữ tên người lập/duyệt. */
    @Transactional
    public Map<String, Object> delete(String id, UserAccount me) {
        UserAccount u = user(id);
        if (u.id.equals(me.id)) throw ApiException.bad("Bạn không thể xóa tài khoản của chính mình.");
        if (!Rules.LOCKED.equals(u.status))
            throw ApiException.bad("Hãy khóa tài khoản " + u.name + " trước, sau đó mới có thể xóa.");
        users.delete(u);
        return Map.of("name", u.name);
    }
}
