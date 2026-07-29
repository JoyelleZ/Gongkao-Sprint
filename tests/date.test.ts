import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, initialReviewDate, nextReviewDate } from "../src/utils/date";

describe("date utilities", () => {
  const baseDate = new Date("2026-07-29T12:00:00");

  it("formats dates as YYYY-MM-DD", () => {
    expect(formatDate(baseDate)).toBe("2026-07-29");
  });

  it("adds days without mutating the original date", () => {
    const next = addDays(baseDate, 3);
    expect(formatDate(next)).toBe("2026-08-01");
    expect(formatDate(baseDate)).toBe("2026-07-29");
  });

  it("schedules initial review dates by mastery", () => {
    expect(initialReviewDate(0, baseDate)).toBe("2026-07-30");
    expect(initialReviewDate(1, baseDate)).toBe("2026-08-01");
    expect(initialReviewDate(2, baseDate)).toBe("2026-08-05");
    expect(initialReviewDate(3, baseDate)).toBe("2026-08-19");
  });

  it("schedules next review dates by review result", () => {
    expect(nextReviewDate("again", 1, baseDate)).toBe("2026-07-30");
    expect(nextReviewDate("hard", 1, baseDate)).toBe("2026-08-01");
    expect(nextReviewDate("good", 3, baseDate)).toBe("2026-08-08");
    expect(nextReviewDate("easy", 3, baseDate)).toBe("2026-08-28");
  });

  it("computes date distance in days", () => {
    expect(daysBetween("2026-07-29", "2026-08-01")).toBe(3);
  });
});
