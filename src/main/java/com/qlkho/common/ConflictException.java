package com.qlkho.common;

import java.util.Map;

/** Lỗi 409 kèm dữ liệu để giao diện hiện popup chi tiết, trả về dạng {"error": "...", "conflict": {...}}. */
public class ConflictException extends ApiException {
    private static final long serialVersionUID = 1L;
    private final transient Map<String, Object> conflict;

    public ConflictException(String message, Map<String, Object> conflict) {
        super(409, message);
        this.conflict = conflict;
    }

    public Map<String, Object> getConflict() { return conflict; }
}
