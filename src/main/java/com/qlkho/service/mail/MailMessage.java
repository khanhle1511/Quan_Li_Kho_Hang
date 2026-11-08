package com.qlkho.service.mail;

/** Một email cần gửi: luôn có cả bản HTML và bản văn bản thuần. */
public record MailMessage(String to, String toName, String subject, String text, String html) {}
