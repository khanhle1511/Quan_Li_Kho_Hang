package com.qlkho.common;

/** HTTP 429 kèm số giây phải chờ; ApiErrors trả thêm trường "retryAfter" và header Retry-After. */
public class TooManyRequestsException extends ApiException {
    private static final long serialVersionUID = 1L;
    private final long retryAfterSeconds;

    public TooManyRequestsException(String message, long retryAfterSeconds) {
        super(429, message);
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() { return retryAfterSeconds; }
}
