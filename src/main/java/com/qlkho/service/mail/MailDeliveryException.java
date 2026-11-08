package com.qlkho.service.mail;

/** Không gửi được mail (máy chủ SMTP không phản hồi, API key sai…). */
public class MailDeliveryException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public MailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}
