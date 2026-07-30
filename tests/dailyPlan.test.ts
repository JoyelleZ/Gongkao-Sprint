import { describe, expect, it } from "vitest";
import { buildDailyPlanTasks, calculateCompletionRate, parsePlanTasks } from "../src/services/DailyPlanService";
import type { ErrorCard, PracticeCollection, ReflectionLog } from "../src/types";

describe("DailyPlanService", () => {
  it("builds tasks from due cards, default collection, and inertia reflections", () => {
    const dueCards: ErrorCard[] = [
      {
        type: "gongkao-error-card",
        error_card_id: "ec-1",
        subject: "行测",
        module: "判断推理",
        mastery: 0,
        review_count: 0,
        created: "2026-07-30",
        next_review: "2026-07-31",
        status: "active",
      },
    ];
    const collection: PracticeCollection = {
      type: "gongkao-practice-collection",
      collection_id: "pc-1",
      name: "资料分析高频 300 题",
      collection_type: "topic",
      subject: "行测",
      status: "active",
      current_round: 1,
      created: "2026-07-30",
      updated: "2026-07-30",
    };
    const reflections: ReflectionLog[] = [
      {
        type: "gongkao-reflection-log",
        reflection_id: "rf-1",
        date: "2026-07-30",
        scope: "module",
        reflection_type: "思维惯性",
        next_action: "资料分析先看单位",
        created: "2026-07-30",
        updated: "2026-07-30",
      },
    ];

    const tasks = buildDailyPlanTasks(dueCards, collection, reflections);

    expect(tasks.map((task) => task.source)).toEqual(["review", "practice", "correction"]);
    expect(tasks[2]?.text).toContain("资料分析先看单位");
  });

  it("parses checkbox tasks and completion rate", () => {
    const tasks = parsePlanTasks(["- [x] 复习错题", "- [ ] 推进刷题", "- [X] 写复盘"].join("\n"));

    expect(tasks).toHaveLength(3);
    expect(calculateCompletionRate(tasks)).toBe(67);
  });
});

