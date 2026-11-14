package com.qlkho.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.Map;

/** Chuyển mọi lỗi thành JSON {"error": "..."} để giao diện hiển thị nguyên văn. */
@RestControllerAdvice
public class ApiErrors {
    private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

    private static ResponseEntity<Map<String, String>> error(int status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, String>> api(ApiException e) {
        return error(e.getStatus(), e.getMessage());
    }

    /** BR-36: kho đã có Quản lý kho → 409 với {"error", "conflict"} để giao diện hiện popup thông tin người đang quản lý. */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<Map<String, Object>> conflict(ConflictException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage(), "conflict", e.getConflict()));
    }

    /** AUTH-08 / BR-31: vượt giới hạn gửi mã → 429 với {"error", "retryAfter"} và header Retry-After. */
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<Map<String, Object>> tooMany(TooManyRequestsException e) {
        return ResponseEntity.status(e.getStatus())
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(e.getRetryAfterSeconds()))
                .body(Map.of("error", e.getMessage(), "retryAfter", e.getRetryAfterSeconds()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> tooBig(MaxUploadSizeExceededException e) {
        return error(HttpStatus.BAD_REQUEST.value(), "File vượt quá 10 MB.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
        return error(HttpStatus.BAD_REQUEST.value(), "Dữ liệu gửi lên không hợp lệ.");
    }

    /**
     * Lưới an toàn (BUG-009): CSDL từ chối vì giá trị dài hơn cột hoặc vi phạm ràng buộc duy nhất.
     * Các trường hợp đã biết được kiểm tra trước ở service với thông báo cụ thể; đây là lỗi dữ liệu của người gửi,
     * không phải lỗi máy chủ, nên trả 400 thay vì 500.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> integrity(DataIntegrityViolationException e) {
        log.warn("CSDL từ chối dữ liệu: {}", e.getMostSpecificCause().getMessage());
        return error(HttpStatus.BAD_REQUEST.value(),
                "Dữ liệu không hợp lệ: có trường quá dài so với giới hạn lưu trữ hoặc trùng với bản ghi khác.");
    }

    /**
     * Lỗi còn lại. Lỗi do Spring MVC phát hiện (sai đường dẫn, sai phương thức, thiếu tham số…) giữ nguyên mã HTTP;
     * lỗi không lường trước được ghi log đầy đủ ở máy chủ, giao diện chỉ nhận thông báo chung.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> other(Exception e) {
        if (e instanceof ErrorResponse er) {
            int status = er.getStatusCode().value();
            return error(status, "Yêu cầu không hợp lệ (HTTP " + status + ").");
        }
        log.error("Lỗi không xử lý được", e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Lỗi máy chủ. Vui lòng thử lại hoặc báo Quản trị viên.");
    }
}
