package com.qlkho.common;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Đếm số lần theo khóa (ví dụ địa chỉ IP) trong từng cửa sổ thời gian cố định, giữ trong bộ nhớ.
 * Dùng cho giới hạn không cần bền vững qua lần khởi động lại (AUTH-08: số lần kiểm tra OTP theo IP).
 */
public final class FixedWindowLimiter {
    private static final int CLEANUP_THRESHOLD = 10_000;

    private record Window(long startedAt, int count) {}

    private final int limit;
    private final long windowMs;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public FixedWindowLimiter(int limit, Duration window) {
        this.limit = limit;
        this.windowMs = window.toMillis();
    }

    /**
     * Ghi nhận một lần cho {@code key}. Trả về 0 nếu còn trong giới hạn,
     * ngược lại là số giây phải chờ đến khi cửa sổ mới bắt đầu.
     */
    public long hit(String key, long now) {
        if (windows.size() > CLEANUP_THRESHOLD) windows.values().removeIf(w -> w.startedAt() + windowMs <= now);
        Window w = windows.compute(key, (k, old) -> old == null || old.startedAt() + windowMs <= now
                ? new Window(now, 1) : new Window(old.startedAt(), old.count() + 1));
        return w.count() <= limit ? 0 : (w.startedAt() + windowMs - now + 999) / 1000;
    }
}
