package com.qlkho.common;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Set;

/**
 * Lịch của kế hoạch định kỳ: chia thời gian thành các kỳ theo tháng, quý hoặc năm và tính ngày đến hạn của từng kỳ.
 * Mã kỳ: tháng "2027-03", quý "2027-Q1", năm "2027". Thuần tính toán, không đọc CSDL hay đồng hồ.
 */
public final class RecurringSchedule {
    private RecurringSchedule() {}

    public static final String MONTH = "month";
    public static final String QUARTER = "quarter";
    public static final String YEAR = "year";
    public static final Set<String> CYCLES = Set.of(MONTH, QUARTER, YEAR);

    /** Một kỳ cụ thể: năm và chỉ số trong năm (tháng 1–12, quý 1–4, năm thì luôn 1). */
    public record Period(String cycle, int year, int index) {
        public String key() {
            return switch (cycle) {
                case MONTH -> year + "-" + Rules.pad(index, 2);
                case QUARTER -> year + "-Q" + index;
                default -> String.valueOf(year);
            };
        }

        /** Kỳ liền sau. */
        public Period next() {
            int per = periodsPerYear(cycle);
            return index < per ? new Period(cycle, year, index + 1) : new Period(cycle, year + 1, 1);
        }
    }

    private static int periodsPerYear(String cycle) {
        return switch (cycle) {
            case MONTH -> 12;
            case QUARTER -> 4;
            default -> 1;
        };
    }

    /** Số tháng của một kỳ: giới hạn cho "tháng thứ mấy trong chu kỳ". */
    public static int monthsInCycle(String cycle) {
        return switch (cycle) {
            case MONTH -> 1;
            case QUARTER -> 3;
            default -> 12;
        };
    }

    /** Kỳ chứa ngày {@code date}. */
    public static Period periodOf(String cycle, LocalDate date) {
        return switch (cycle) {
            case MONTH -> new Period(cycle, date.getYear(), date.getMonthValue());
            case QUARTER -> new Period(cycle, date.getYear(), (date.getMonthValue() - 1) / 3 + 1);
            default -> new Period(cycle, date.getYear(), 1);
        };
    }

    /** Ngày đến hạn của kỳ: ngày {@code day} của tháng thứ {@code monthInCycle} trong kỳ; tháng ngắn thì lấy ngày cuối tháng. */
    public static LocalDate dueDate(Period p, int day, int monthInCycle) {
        int month = switch (p.cycle()) {
            case MONTH -> p.index();
            case QUARTER -> (p.index() - 1) * 3 + monthInCycle;
            default -> monthInCycle;
        };
        YearMonth ym = YearMonth.of(p.year(), month);
        return ym.atDay(Math.min(day, ym.lengthOfMonth()));
    }
}
