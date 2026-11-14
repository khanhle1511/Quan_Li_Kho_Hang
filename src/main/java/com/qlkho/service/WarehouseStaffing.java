package com.qlkho.service;

import com.qlkho.common.ApiException;
import com.qlkho.common.ConflictException;
import com.qlkho.common.Rules;
import com.qlkho.model.UserAccount;
import com.qlkho.model.Warehouse;
import com.qlkho.repo.UserRepo;
import com.qlkho.repo.WarehouseRepo;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * BR-36: phân công kho cho Quản lý kho và Nhân viên kho. Mỗi kho có tối đa một Quản lý kho (kể cả tài khoản
 * đang nháp hoặc bị khóa) và nhiều Nhân viên kho. Gán thêm Quản lý kho vào kho đã có người quản lý bị từ chối
 * bằng {@link ConflictException} kèm thông tin người đang quản lý để giao diện hiện popup.
 */
@Service
public class WarehouseStaffing {
    private final UserRepo users;
    private final WarehouseRepo warehouses;

    public WarehouseStaffing(UserRepo users, WarehouseRepo warehouses) {
        this.users = users;
        this.warehouses = warehouses;
    }

    public static boolean worksAtWarehouse(String role) {
        return Rules.MANAGER.equals(role) || Rules.STAFF.equals(role);
    }

    public Optional<UserAccount> managerOf(String warehouseId) {
        return users.findByRoleAndWarehouseId(Rules.MANAGER, warehouseId).stream().findFirst();
    }

    /**
     * Kiểm tra kho làm việc cho tài khoản có vai trò {@code role}; trả về mã kho hợp lệ (null = chưa phân kho).
     * {@code selfId} là tài khoản đang được sửa (null khi tạo mới), để không tự xung đột với chính mình.
     */
    public String checkAssignment(String role, String warehouseId, String selfId) {
        if (!worksAtWarehouse(role) || Rules.blank(warehouseId)) return null;
        Warehouse w = warehouses.findById(warehouseId.trim())
                .orElseThrow(() -> ApiException.bad("Kho đã chọn không còn tồn tại."));
        if (Rules.MANAGER.equals(role)) checkManagerSlot(w, selfId);
        return w.id;
    }

    /** Kho {@code w} chưa có Quản lý kho nào khác ngoài {@code selfId}. */
    public void checkManagerSlot(Warehouse w, String selfId) {
        managerOf(w.id).filter(m -> !m.id.equals(selfId)).ifPresent(m -> {
            throw new ConflictException(w.name + " đã có Quản lý kho là " + m.name + ". Mỗi kho chỉ có một Quản lý kho.",
                    managerConflict(w, m));
        });
    }

    private static Map<String, Object> managerConflict(Warehouse w, UserAccount m) {
        Map<String, Object> manager = new LinkedHashMap<>();
        manager.put("id", m.id);
        manager.put("name", m.name);
        manager.put("phone", m.phone);
        manager.put("email", m.email);
        manager.put("status", m.status);
        manager.put("opened", m.opened);
        return Map.of("warehouse", Map.of("id", w.id, "name", w.name), "manager", manager);
    }

    /** Đặt Quản lý kho cho kho {@code w} từ form sửa kho; {@code managerId} trống = bỏ phân công người đang quản lý. */
    public void setManager(Warehouse w, String managerId) {
        Optional<UserAccount> current = managerOf(w.id);
        String target = Rules.blank(managerId) ? null : managerId.trim();
        if (current.map(m -> m.id).equals(Optional.ofNullable(target))) return;
        if (target == null) {
            current.ifPresent(m -> assign(m, null));
            return;
        }
        UserAccount m = users.findById(target).orElseThrow(() -> ApiException.bad("Tài khoản đã chọn không còn tồn tại."));
        if (!Rules.MANAGER.equals(m.role)) throw ApiException.bad("Chỉ chọn được tài khoản Quản lý kho.");
        checkManagerSlot(w, m.id);
        assign(m, w.id);
    }

    /** Xóa kho: các tài khoản đang làm ở kho đó trở về trạng thái chưa phân kho. */
    public void releaseAll(String warehouseId) {
        users.findByWarehouseId(warehouseId).forEach(u -> assign(u, null));
    }

    private void assign(UserAccount u, String warehouseId) {
        u.warehouseId = warehouseId;
        users.save(u);
    }
}
