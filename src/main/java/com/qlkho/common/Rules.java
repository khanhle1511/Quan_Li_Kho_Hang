package com.qlkho.common;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Hằng số và quy tắc nghiệp vụ dùng chung. */
public final class Rules {
    private Rules() {}

    // ---------- vai trò ----------
    public static final String ADMIN = "admin";
    public static final String MANAGER = "manager";
    public static final String STAFF = "staff";
    public static final Set<String> ROLES = Set.of(ADMIN, MANAGER, STAFF);

    public static final Map<String, String> ROLE_LABEL = Map.of(
            ADMIN, "Quản trị viên", MANAGER, "Quản lý kho", STAFF, "Nhân viên kho");

    /** Vai trò bị ẩn SĐT, email và hồ sơ PDF theo từng tab: sup (nhà cung cấp), cus (khách hàng), wh (kho). */
    public static final Map<String, Set<String>> HIDE_CONTACT = Map.of(
            "sup", Set.of(MANAGER, STAFF),
            "cus", Set.of(STAFF),
            "wh", Set.of(STAFF));

    public static boolean hideContact(String kind, String role) {
        return HIDE_CONTACT.getOrDefault(kind, Set.of()).contains(role);
    }

    // ---------- trạng thái ----------
    public static final String ACTIVE = "active";
    public static final String PAUSED = "paused";
    public static final String LOCKED = "locked";
    public static final String DRAFT = "draft";
    public static final String PENDING = "pending";
    public static final String APPROVED = "approved";
    public static final String CANCELLED = "cancelled";

    // ---------- định dạng hợp lệ ----------
    /** SĐT di động đăng nhập: 10 số, đầu 03/05/07/08/09 */
    public static final Pattern LOGIN_PHONE = Pattern.compile("^0[35789]\\d{8}$");
    /** SĐT đối tác/kho: 10–11 số, bắt đầu bằng 0 (cho phép số bàn) */
    public static final Pattern ANY_PHONE = Pattern.compile("^0\\d{9,10}$");
    public static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    public static final Pattern ISO_DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    public static final Pattern WH_CODE = Pattern.compile("^KHO-[A-Z0-9]{2,10}$");
    /** BCrypt chỉ băm được tối đa 72 byte UTF-8 (tính theo byte, nên chữ có dấu tốn 2–3 byte); dài hơn thư viện ném lỗi. */
    public static final int PASSWORD_MAX_BYTES = 72;

    private static final Pattern PHONE_SEPARATORS = Pattern.compile("[\\s.\\-]");
    private static final Pattern NON_DIGIT_TAIL = Pattern.compile("\\D.*$");
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Locale VI = Locale.forLanguageTag("vi-VN");

    public static String now() { return LocalDateTime.now(VN).format(TS); }

    public static String normPhone(String v) {
        return v == null ? "" : PHONE_SEPARATORS.matcher(v).replaceAll("");
    }

    public static String trim(String v) { return v == null ? "" : v.trim(); }

    public static String nz(String v) { return v == null ? "" : v; }

    public static boolean blank(String v) { return v == null || v.isBlank(); }

    public static boolean isIsoDate(String v) { return v != null && ISO_DATE.matcher(v).matches(); }

    public static boolean passwordTooLong(String pass) {
        return pass != null && pass.getBytes(StandardCharsets.UTF_8).length > PASSWORD_MAX_BYTES;
    }

    public static String pad(int n, int width) {
        return String.format("%0" + width + "d", n);
    }

    /** Lấy số lớn nhất sau tiền tố trong danh sách mã (vd. PN-0007 → 7) để sinh mã kế tiếp. */
    public static int maxNumber(Collection<String> ids, String prefix) {
        int max = 0;
        for (String id : ids) {
            if (id != null && id.startsWith(prefix)) {
                String rest = NON_DIGIT_TAIL.matcher(id.substring(prefix.length())).replaceAll("");
                if (!rest.isEmpty()) max = Math.max(max, Integer.parseInt(rest));
            }
        }
        return max;
    }

    /** Mã kế tiếp theo mẫu tiền tố + số thứ tự đệm 0 (vd. "PN-", 4 → PN-0008). */
    public static String nextCode(Collection<String> ids, String prefix, int width) {
        return prefix + pad(maxNumber(ids, prefix) + 1, width);
    }

    public static String fmt(long n) {
        return String.format(VI, "%,d", n);
    }
}
