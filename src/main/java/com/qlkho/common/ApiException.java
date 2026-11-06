package com.qlkho.common;

/** Lỗi nghiệp vụ trả về cho giao diện dưới dạng {"error": "..."} kèm mã HTTP. */
public class ApiException extends RuntimeException {
    private final int status;

    public ApiException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() { return status; }

    public static ApiException bad(String message) { return new ApiException(400, message); }
    public static ApiException notFound(String message) { return new ApiException(404, message); }
    public static ApiException forbidden() { return new ApiException(403, "Bạn không có quyền thực hiện thao tác này."); }
}
