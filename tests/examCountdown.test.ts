import { describe, expect, it } from "vitest";
import { buildCountdownSummary, normalizeCountdowns } from "../src/services/ExamCountdownService";
import type { ExamCountdown } from "../src/types";

describe("ExamCountdownService", () => {
  const countdown = (overrides: Partial<ExamCountdown>): ExamCountdown => ({
    countdown_id: "exam-1",
    name: "2027 国考",
    date: "2027-11-28",
    enabled: true,
    created: "2026-08-02",
    updated: "2026-08-02",
    ...overrides,
  });

  it("returns unset when there are no valid countdowns", () => {
    expect(buildCountdownSummary([], "2026-08-02").status).toBe("unset");
  });

  it("selects the nearest upcoming enabled countdown", () => {
    const summary = buildCountdownSummary(
      [
        countdown({ countdown_id: "exam-2", name: "省考", date: "2027-03-15" }),
        countdown({ countdown_id: "exam-3", name: "国考", date: "2026-11-29" }),
      ],
      "2026-08-02",
    );

    expect(summary.countdown?.name).toBe("国考");
    expect(summary.days).toBe(119);
    expect(summary.status).toBe("upcoming");
  });

  it("marks a countdown as today", () => {
    const summary = buildCountdownSummary([countdown({ date: "2026-08-02" })], "2026-08-02");

    expect(summary.status).toBe("today");
    expect(summary.days).toBe(0);
  });

  it("marks the latest enabled countdown as past when all dates are over", () => {
    const summary = buildCountdownSummary(
      [countdown({ name: "旧省考", date: "2026-03-15" }), countdown({ name: "旧国考", date: "2025-11-30" })],
      "2026-08-02",
    );

    expect(summary.status).toBe("past");
    expect(summary.countdown?.name).toBe("旧省考");
  });

  it("filters invalid frontmatter countdowns", () => {
    expect(
      normalizeCountdowns([
        countdown({ countdown_id: "ok" }),
        { countdown_id: "bad", name: "坏日期", date: "2026-99-99" },
      ]),
    ).toHaveLength(1);
  });
});
