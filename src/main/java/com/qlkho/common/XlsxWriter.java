package com.qlkho.common;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Ghi một file Excel (.xlsx, SpreadsheetML) có một trang tính, không cần thư viện ngoài. Ô chữ ghi dạng chuỗi
 * nội tuyến nên giữ nguyên tiếng Việt; ô số hiển thị phân cách hàng nghìn. Mỗi dòng có thể in đậm.
 */
public final class XlsxWriter {
    private static final String NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static final String REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    private static final String PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
    private static final String XML_HEAD = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>";
    private static final int MAX_SHEET_NAME = 31;
    // Chỉ số kiểu ô trong styles.xml
    private static final int TEXT = 0, TEXT_BOLD = 1, NUMBER = 2, NUMBER_BOLD = 3;

    private final String sheetName;
    private final int[] columnWidths;
    private final List<String> rows = new ArrayList<>();

    /** {@code columnWidths} tính theo số ký tự. */
    public XlsxWriter(String sheetName, int... columnWidths) {
        this.sheetName = sheetName.length() > MAX_SHEET_NAME ? sheetName.substring(0, MAX_SHEET_NAME) : sheetName;
        this.columnWidths = columnWidths;
    }

    public XlsxWriter row(Object... values) { return addRow(false, values); }

    public XlsxWriter boldRow(Object... values) { return addRow(true, values); }

    public XlsxWriter blankRow() { return addRow(false); }

    private XlsxWriter addRow(boolean bold, Object... values) {
        int r = rows.size() + 1;
        StringBuilder sb = new StringBuilder("<row r=\"").append(r).append("\">");
        for (int i = 0; i < values.length; i++) {
            Object v = values[i];
            if (v == null) continue;
            sb.append("<c r=\"").append(column(i)).append(r);
            if (v instanceof Number n)
                sb.append("\" s=\"").append(bold ? NUMBER_BOLD : NUMBER).append("\"><v>").append(n.longValue()).append("</v></c>");
            else
                sb.append("\" t=\"inlineStr\" s=\"").append(bold ? TEXT_BOLD : TEXT)
                        .append("\"><is><t xml:space=\"preserve\">").append(escape(v.toString())).append("</t></is></c>");
        }
        rows.add(sb.append("</row>").toString());
        return this;
    }

    public byte[] toBytes() {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            put(zip, "[Content_Types].xml", contentTypes());
            put(zip, "_rels/.rels", relationships(rel("rId1", REL_NS + "/officeDocument", "xl/workbook.xml")));
            put(zip, "xl/workbook.xml", XML_HEAD + "<workbook xmlns=\"" + NS + "\" xmlns:r=\"" + REL_NS + "\"><sheets><sheet name=\""
                    + escape(sheetName) + "\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            put(zip, "xl/_rels/workbook.xml.rels", relationships(rel("rId1", REL_NS + "/worksheet", "worksheets/sheet1.xml")
                    + rel("rId2", REL_NS + "/styles", "styles.xml")));
            put(zip, "xl/styles.xml", styles());
            put(zip, "xl/worksheets/sheet1.xml", sheet());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out.toByteArray();
    }

    private static String contentTypes() {
        String ct = "application/vnd.openxmlformats-officedocument.spreadsheetml.";
        return XML_HEAD + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
                + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
                + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
                + "<Override PartName=\"/xl/workbook.xml\" ContentType=\"" + ct + "sheet.main+xml\"/>"
                + "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"" + ct + "worksheet+xml\"/>"
                + "<Override PartName=\"/xl/styles.xml\" ContentType=\"" + ct + "styles+xml\"/></Types>";
    }

    /** 4 kiểu ô: chữ, chữ đậm, số #,##0 (numFmtId 3), số đậm. */
    private static String styles() {
        String font = "<sz val=\"11\"/><name val=\"Calibri\"/>";
        String xf = "<xf numFmtId=\"%d\" fontId=\"%d\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyNumberFormat=\"1\"/>";
        return XML_HEAD + "<styleSheet xmlns=\"" + NS + "\">"
                + "<fonts count=\"2\"><font>" + font + "</font><font><b/>" + font + "</font></fonts>"
                + "<fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills>"
                + "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>"
                + "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
                + "<cellXfs count=\"4\">" + String.format(xf, 0, 0) + String.format(xf, 0, 1) + String.format(xf, 3, 0) + String.format(xf, 3, 1)
                + "</cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>";
    }

    private String sheet() {
        StringBuilder sb = new StringBuilder(XML_HEAD).append("<worksheet xmlns=\"").append(NS).append("\">");
        if (columnWidths.length > 0) {
            sb.append("<cols>");
            for (int i = 0; i < columnWidths.length; i++)
                sb.append("<col min=\"").append(i + 1).append("\" max=\"").append(i + 1).append("\" width=\"")
                        .append(columnWidths[i]).append("\" customWidth=\"1\"/>");
            sb.append("</cols>");
        }
        sb.append("<sheetData>");
        rows.forEach(sb::append);
        return sb.append("</sheetData></worksheet>").toString();
    }

    private static String relationships(String rels) {
        return XML_HEAD + "<Relationships xmlns=\"" + PKG_REL_NS + "\">" + rels + "</Relationships>";
    }

    private static String rel(String id, String type, String target) {
        return "<Relationship Id=\"" + id + "\" Type=\"" + type + "\" Target=\"" + target + "\"/>";
    }

    private static void put(ZipOutputStream zip, String name, String xml) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(xml.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    /** Chỉ số cột 0, 1, …, 25, 26 → A, B, …, Z, AA. */
    private static String column(int index) {
        StringBuilder sb = new StringBuilder();
        for (int n = index + 1; n > 0; n = (n - 1) / 26) sb.insert(0, (char) ('A' + (n - 1) % 26));
        return sb.toString();
    }

    /** Thoát ký tự đặc biệt XML và bỏ ký tự điều khiển (XML 1.0 không cho phép). */
    private static String escape(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                default -> { if (c >= 0x20 || c == '\t' || c == '\n' || c == '\r') sb.append(c); }
            }
        }
        return sb.toString();
    }
}
