package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.repo.UserRepo;
import com.qlkho.web.Dto;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

/** FR-02 – Quản trị viên quản lý tài khoản. */
@Service
public class UserService {
    private static final Set<String> STATUSES = Set.of(Rules.ACTIVE, Rules.DRAFT, Rules.LOCKED);

    private final UserRepo users;
    private final BCryptPasswordEncoder encoder;

    public UserService(UserRepo users, BCryptPasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
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

    private void checkPassword(String pass) {
        if (pass == null || pass.length() < 6) throw ApiException.bad("Mật khẩu phải có ít nhất 6 ký tự.");
        if (pass.chars().anyMatch(Character::isWhitespace)) throw ApiException.bad("Mật khẩu không được chứa khoảng trắng.");
    }

    @Transactional
    public Map<String, Object> create(Dto.UserForm f) {
        String name = Rules.trim(f.name());
        if (name.isEmpty()) throw ApiException.bad("Vui lòng nhập họ tên.");
        String phone = checkPhone(f.phone(), null);
        checkPassword(f.password());
        if (!Rules.ROLES.contains(f.role())) throw ApiException.bad("Vai trò không hợp lệ.");
        if (!Rules.isIsoDate(f.opened())) throw ApiException.bad("Vui lòng chọn ngày mở tài khoản.");

        UserAccount u = new UserAccount();
        u.id = Rules.nextCode(users.findAllIds(), "U", 1);
        u.name = name;
        u.phone = phone;
        u.passwordHash = encoder.encode(f.password());
        u.role = f.role();
        u.opened = f.opened();
        u.status = STATUSES.contains(f.status()) ? f.status() : Rules.DRAFT;
        users.save(u);
        return Map.of("id", u.id, "name", u.name);
    }

    /** Admin chỉ sửa được số điện thoại đăng nhập và mật khẩu. */
    @Transactional
    public Map<String, Object> update(String id, Dto.UserForm f) {
        UserAccount u = user(id);
        String phone = checkPhone(f.phone(), u.id);
        boolean changePass = !Rules.blank(f.password());
        if (changePass) checkPassword(f.password());
        if (phone.equals(u.phone) && !changePass) throw ApiException.bad("Chưa có thay đổi nào để lưu.");
        u.phone = phone;
        if (changePass) u.passwordHash = encoder.encode(f.password());
        users.save(u);
        return Map.of("id", u.id, "name", u.name);
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
