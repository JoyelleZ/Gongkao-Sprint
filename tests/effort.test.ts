import { describe, expect, it } from "vitest";
import {
  buildEffortHeatmap,
  buildHeatmapLayout,
  calculateEffortScore,
  generateLast90Days,
  toHeatmapLevel,
} from "../src/services/EffortService";
import type { ErrorCard, PracticeLog, ReflectionLog } from "../src/types";

describe("EffortService", () => {
  it("weights practice, review history, and reflections into daily effort", () => {
    const logs: PracticeLog[] = [
      {
        type: "gongkao-practice-log",
        date: "2026-07-29",
        module: "资料分析",
        total: 30,
        wrong: 5,
        round: 1,
        created: "2026-07-29",
      },
    ];
    const cards: ErrorCard[] = [
      {
        type: "gongkao-error-card",
        error_card_id: "ec-1",
        subject: "行测",
        module: "资料分析",
        mastery: 1,
        review_count: 1,
        created: "2026-07-28",
        next_review: "2026-08-01",
        status: "active",
        review_history: [{ date: "2026-07-29", result: "good", next_review: "2026-08-05" }],
      },
    ];
    const reflections: ReflectionLog[] = [
      {
        type: "gongkao-reflection-log",
        reflection_id: "rf-1",
        date: "2026-07-29",
        scope: "module",
        module: "资料分析",
        reflection_type: "技巧沉淀",
        created: "2026-07-29",
        updated: "2026-07-29",
      },
    ];

    const heatmap = buildEffortHeatmap(logs, cards, reflections, "2026-07-30", 2);

    expect(heatmap).toHaveLength(2);
    expect(heatmap[0]?.date).toBe("2026-07-29");
    expect(heatmap[0]?.practiceTotal).toBe(30);
    expect(heatmap[0]?.reviewCount).toBe(1);
    expect(heatmap[0]?.reflectionCount).toBe(1);
    expect(heatmap[0]?.level).toBeGreaterThan(0);
    expect(heatmap[1]?.level).toBe(0);
  });

  it("maps effort scores to stable visual levels", () => {
    expect(toHeatmapLevel(0)).toBe(0);
    expect(toHeatmapLevel(10)).toBe(1);
    expect(toHeatmapLevel(30)).toBe(2);
    expect(toHeatmapLevel(60)).toBe(3);
    expect(toHeatmapLevel(100)).toBe(4);
  });

  it("keeps plan completion as an additive contribution", () => {
    expect(calculateEffortScore(0, 0, 0, 1)).toBe(20);
  });

  it("generates exactly 90 chronological days ending today", () => {
    const days = generateLast90Days("2026-07-30");

    expect(days).toHaveLength(90);
    expect(days[0]).toEqual({ date: "2026-05-02", count: 0 });
    expect(days.at(-1)).toEqual({ date: "2026-07-30", count: 0 });
  });

  it("maps 90 real dates into weekday rows and fixed recent month labels", () => {
    const heatmap = buildEffortHeatmap([], [], [], "2026-07-30");
    const layout = buildHeatmapLayout(heatmap);

    expect(layout.cells).toHaveLength(90);
    expect(layout.cells[0]?.day.date).toBe("2026-05-02");
    expect(layout.cells[0]?.row).toBe(6);
    expect(layout.cells.at(-1)?.day.date).toBe("2026-07-30");
    expect(layout.cells.at(-1)?.row).toBe(4);
    expect(layout.months.map((month) => month.label)).toEqual(["5月", "6月", "7月"]);
  });
});
