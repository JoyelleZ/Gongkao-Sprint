import { describe, expect, it } from "vitest";
import { buildDashboardModel } from "../src/services/DashboardService";
import type { DailyPlanMonthEntry, DailyPlanReadResult } from "../src/services/DailyPlanService";
import type { DailyPlanTask, ErrorCard, PracticeCollection, PracticeLog, ReflectionLog } from "../src/types";

interface DashboardTestOverrides {
  collections?: Array<{ file: never; data: PracticeCollection }>;
  logs?: PracticeLog[];
  cards?: ErrorCard[];
  reflections?: ReflectionLog[];
  plan?: Parameters<typeof buildDashboardModel>[5];
  monthPlans?: DailyPlanMonthEntry[];
  recentPlans?: DailyPlanMonthEntry[];
}

describe("DashboardService", () => {
  const collection: PracticeCollection = {
    type: "gongkao-practice-collection",
    collection_id: "pc-1",
    name: "判断推理 500 题",
    collection_type: "topic",
    subject: "行测",
    module: "判断推理",
    status: "first_round_done",
    current_round: 1,
    created: "2026-07-20",
    updated: "2026-07-29",
  };

  const logs: PracticeLog[] = [
    {
      type: "gongkao-practice-log",
      date: "2026-07-27",
      collection_id: "pc-1",
      collection_name: "旧名称",
      collection_type: "topic",
      module: "判断推理",
      total: 20,
      wrong: 4,
      round: 1,
      created: "2026-07-27",
    },
    {
      type: "gongkao-practice-log",
      date: "2026-07-29",
      collection_id: "pc-1",
      collection_name: "判断推理 500 题",
      collection_type: "topic",
      module: "判断推理",
      total: 30,
      wrong: 6,
      round: 2,
      created: "2026-07-29",
    },
    {
      type: "gongkao-practice-log",
      date: "2026-07-26",
      collection_id: "pc-2",
      collection_name: "资料分析高频 300 题",
      collection_type: "topic",
      module: "资料分析",
      total: 50,
      wrong: 5,
      round: 1,
      created: "2026-07-26",
    },
  ];

  const cards: ErrorCard[] = [
    {
      type: "gongkao-error-card",
      error_card_id: "ec-1",
      subject: "行测",
      module: "判断推理",
      mastery: 0,
      review_count: 0,
      created: "2026-07-29",
      next_review: "2026-07-30",
      status: "active",
    },
    {
      type: "gongkao-error-card",
      error_card_id: "ec-2",
      subject: "行测",
      module: "资料分析",
      mastery: 1,
      review_count: 0,
      created: "2026-07-28",
      next_review: "2026-07-29",
      status: "active",
    },
    {
      type: "gongkao-error-card",
      error_card_id: "ec-3",
      subject: "行测",
      module: "言语理解",
      mastery: 1,
      review_count: 0,
      created: "2026-07-29",
      next_review: "2026-07-30",
      status: "archived",
    },
  ];

  const reflections: ReflectionLog[] = [
    {
      type: "gongkao-reflection-log",
      reflection_id: "rf-1",
      date: "2026-07-30",
      scope: "module",
      module: "判断推理",
      reflection_type: "思维惯性",
      next_action: "先扫数量变化",
      created: "2026-07-30",
      updated: "2026-07-30",
    },
  ];

  const plan: DailyPlanReadResult = {
    file: { path: "plan.md" } as never,
    data: {
      type: "gongkao-daily-plan",
      plan_id: "dp-1",
      date: "2026-07-30",
      created: "2026-07-30",
      updated: "2026-07-30",
    },
    tasks: [
      { text: "复习错题", completed: true, task_type: "review" },
      { text: "推进刷题", completed: false, task_type: "practice" },
    ] as DailyPlanTask[],
    completionRate: 50,
  };

  const buildModel = (today: string, overrides: DashboardTestOverrides = {}) =>
    buildDashboardModel(
      overrides.collections ?? [{ file: { path: "collection.md" } as never, data: collection }],
      overrides.logs ?? logs,
      overrides.cards ?? cards,
      overrides.reflections ?? reflections,
      today,
      overrides.plan ?? null,
      [],
      overrides.monthPlans ?? [],
      "2026-07",
      overrides.recentPlans ?? overrides.monthPlans ?? [],
    );

  it("summarizes collections by stable collection id", () => {
    const model = buildModel("2026-07-29");

    expect(model.collections[0]?.total).toBe(50);
    expect(model.collections[0]?.wrong).toBe(10);
    expect(model.collections[0]?.lastPracticeDate).toBe("2026-07-29");
  });

  it("summarizes the current week from Monday to today", () => {
    const model = buildModel("2026-07-29");

    expect(model.week.total).toBe(50);
    expect(model.week.wrong).toBe(10);
    expect(model.week.recentLogs).toHaveLength(3);
  });

  it("summarizes due active error cards for review", () => {
    const model = buildModel("2026-07-30");

    expect(model.review.dueCount).toBe(2);
    expect(model.review.overdueCount).toBe(1);
    expect(model.review.recentNewCount).toBe(0);
    expect(model.review.byModule["判断推理"]).toBe(1);
    expect(model.review.byModule["资料分析"]).toBe(1);
    expect(model.review.byModule["言语理解"]).toBeUndefined();
  });

  it("includes recent reflection logs", () => {
    const model = buildModel("2026-07-30", { collections: [], logs: [], cards: [], reflections });

    expect(model.reflections.recent[0]?.reflection.reflection_id).toBe("rf-1");
    expect(model.hasAnyData).toBe(true);
  });

  it("includes a 120 day effort heatmap in the dashboard model", () => {
    const model = buildModel("2026-07-30");

    expect(model.heatmap).toHaveLength(120);
    expect(model.heatmap.at(-1)?.date).toBe("2026-07-30");
    expect(model.heatmap.some((day) => day.level > 0)).toBe(true);
  });

  it("includes daily plan completion and tasks", () => {
    const model = buildModel("2026-07-30", { plan });

    expect(model.plan.exists).toBe(true);
    expect(model.plan.completionRate).toBe(50);
    expect(model.plan.tasks[0]).toContain("已完成");
  });

  it("builds a daily plan calendar summary and feeds plan completion into heatmap", () => {
    const monthPlans: DailyPlanMonthEntry[] = [
      { ...plan, date: "2026-07-30" },
      {
        ...plan,
        file: { path: "plan-0729.md" } as never,
        data: { ...plan.data, plan_id: "dp-2", date: "2026-07-29" },
        date: "2026-07-29",
        tasks: [{ text: "补齐资料分析", completed: true, task_type: "practice" }],
        completionRate: 100,
      },
    ];

    const model = buildModel("2026-07-30", { monthPlans });

    expect(model.planCalendar.entries).toHaveLength(2);
    expect(model.planCalendar.entries[0]?.completedCount).toBe(1);
    expect(model.planCalendar.entries[0]?.pendingCount).toBe(0);
    expect(model.heatmap.find((day) => day.date === "2026-07-29")?.planCompletionRate).toBe(1);
  });

  it("builds recent weakness and correction reminders", () => {
    const model = buildModel("2026-07-30", {
      cards: [
        ...cards,
        {
          ...cards[0],
          error_card_id: "ec-4",
          module: "判断推理",
          mastery: 1,
          next_review: "2026-07-30",
        },
      ],
      reflections: [
        ...reflections,
        {
          ...reflections[0],
          reflection_id: "rf-2",
          date: "2026-07-29",
          module: "判断推理",
        },
      ],
    });

    expect(model.weakness.lines.some((line) => line.includes("最近 7 天错题最多"))).toBe(true);
    expect(model.weakness.lines.some((line) => line.includes("思维惯性反复出现"))).toBe(true);
  });
});
