package com.qlkho.common;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Tạo một file PDF một trang rất đơn giản (dùng cho hồ sơ mẫu khi khởi tạo dữ liệu). */
public final class PdfMaker {
    private PdfMaker() {}

    private static String esc(String s) {
        StringBuilder b = new StringBuilder();
        for (char ch : s.toCharArray()) {
            if (ch == '\\' || ch == '(' || ch == ')') b.append('\\').append(ch);
            else if (ch < 32 || ch > 126) b.append('?');
            else b.append(ch);
        }
        return b.toString();
    }

    public static byte[] simplePdf(String title, List<String> lines) {
        StringBuilder c = new StringBuilder();
        int y = 760;
        c.append("BT /F1 20 Tf 72 ").append(y).append(" Td (").append(esc(title)).append(") Tj ET\n");
        for (String l : lines) {
            y -= 26;
            c.append("BT /F1 12 Tf 72 ").append(y).append(" Td (").append(esc(l)).append(") Tj ET\n");
        }
        String content = c.toString();
        String[] objs = {
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
                "<< /Length " + content.length() + " >>\nstream\n" + content + "endstream"
        };
        StringBuilder out = new StringBuilder("%PDF-1.4\n");
        List<Integer> offsets = new ArrayList<>();
        for (int i = 0; i < objs.length; i++) {
            offsets.add(out.length());
            out.append(i + 1).append(" 0 obj\n").append(objs[i]).append("\nendobj\n");
        }
        int xref = out.length();
        out.append("xref\n0 ").append(objs.length + 1).append("\n0000000000 65535 f \n");
        for (int o : offsets) out.append(String.format("%010d 00000 n \n", o));
        out.append("trailer\n<< /Size ").append(objs.length + 1).append(" /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF");
        return out.toString().getBytes(StandardCharsets.US_ASCII);
    }
}
