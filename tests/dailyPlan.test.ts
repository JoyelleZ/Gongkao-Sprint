import { describe, expect, it } from "vitest";
import {
  buildDailyPlanTasks,
  calculateCompletionRate,
  DailyPlanService,
  parsePlanTasks,
  parseTodayTaskSection,
} from "../src/services/DailyPlanService";
import type { DailyPlan, ErrorCard, PracticeCollection, ReflectionLog } from "../src/types";

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

    expect(tasks.map((task) => task.task_type)).toEqual(["review", "practice", "correction"]);
    expect(tasks[2]?.text).toContain("资料分析先看单位");
  });

  it("parses checkbox tasks and completion rate", () => {
    const tasks = parsePlanTasks(["- [x] 复习错题", "- [ ] 推进刷题", "- [X] 写复盘"].join("\n"));

    expect(tasks).toHaveLength(3);
    expect(calculateCompletionRate(tasks)).toBe(67);
  });

  it("parses tasks only from the today task section", () => {
    const section = parseTodayTaskSection(
      [
        "# 2026-08-04 今日计划",
        "",
        "- [x] 不属于今日任务区块",
        "",
        "## 今日任务",
        "",
        "- [x] 资料分析 20 题，复盘单位陷阱",
        "- [ ]   判断推理 保留前置空格",
        "",
        "## 今日复盘提醒",
        "",
        "- [ ] 这个提醒不应进入任务",
      ].join("\n"),
    );

    expect(section.hasSection).toBe(true);
    expect(section.tasks).toEqual([
      { text: "资料分析 20 题，复盘单位陷阱", completed: true, task_type: "practice" },
      { text: "  判断推理 保留前置空格", completed: false, task_type: "practice" },
    ]);
  });

  it("reads markdown section tasks before frontmatter tasks", async () => {
    const file = { path: "Gongkao Sprint/01_今日计划/2026-08-04.md" };
    const service = new DailyPlanService({
      getSubdirectoryPath: () => "Gongkao Sprint/01_今日计划",
      getFile: () => file,
      readFrontmatter: async () =>
        ({
          type: "gongkao-daily-plan",
          plan_id: "dp-1",
          date: "2026-08-04",
          tasks: [{ text: "属性栏旧任务", completed: false, task_type: "review" }],
          created: "2026-08-04",
          updated: "2026-08-04",
        }) satisfies DailyPlan,
      readFile: async () => ["## 今日任务", "", "- [x] 正文新任务"].join("\n"),
    } as never);

    const plan = await service.readPlan("2026-08-04");

    expect(plan?.tasks).toEqual([{ text: "正文新任务", completed: true, task_type: "practice" }]);
    expect(plan?.completionRate).toBe(100);
  });

  it("falls back to legacy frontmatter tasks when the today task section is missing", async () => {
    const file = { path: "Gongkao Sprint/01_今日计划/2026-08-04.md" };
    const service = new DailyPlanService({
      getSubdirectoryPath: () => "Gongkao Sprint/01_今日计划",
      getFile: () => file,
      readFrontmatter: async () =>
        ({
          type: "gongkao-daily-plan",
          plan_id: "dp-1",
          date: "2026-08-04",
          tasks: [{ text: "属性栏旧任务", completed: false }],
          created: "2026-08-04",
          updated: "2026-08-04",
        }) as unknown as DailyPlan,
      readFile: async () => ["# 旧版计划", "", "正文还没有任务区块"].join("\n"),
    } as never);

    const plan = await service.readPlan("2026-08-04");

    expect(plan?.tasks).toEqual([{ text: "属性栏旧任务", completed: false, task_type: "practice" }]);
  });

  it("syncs markdown tasks into frontmatter without duplicate writes", async () => {
    const file = { path: "Gongkao Sprint/01_今日计划/2026-08-04.md" };
    const frontmatter: DailyPlan = {
      type: "gongkao-daily-plan",
      plan_id: "dp-1",
      date: "2026-08-04",
      tasks: [
        { text: "复习错题", completed: false, task_type: "review" },
        { text: "删除的任务", completed: false, task_type: "practice" },
      ],
      created: "2026-08-04",
      updated: "2026-08-04",
    };
    let updateCount = 0;
    const service = new DailyPlanService({
      readFrontmatter: async () => frontmatter,
      readFile: async () => ["## 今日任务", "", "- [x] 复习错题", "- [ ] 新增任务：数量关系"].join("\n"),
      updateFrontmatter: async (_file: unknown, updater: (value: Record<string, unknown>) => void) => {
        updateCount += 1;
        updater(frontmatter as unknown as Record<string, unknown>);
      },
    } as never);

    await expect(service.syncPlanTasksFromMarkdown(file as never)).resolves.toBe(true);
    await expect(service.syncPlanTasksFromMarkdown(file as never)).resolves.toBe(false);

    expect(updateCount).toBe(1);
    expect(frontmatter.tasks).toEqual([
      { text: "复习错题", completed: true, task_type: "review" },
      { text: "新增任务：数量关系", completed: false, task_type: "practice" },
    ]);
  });

  it("stores the daily plan as the date markdown file", () => {
    const service = new DailyPlanService({
      getSubdirectoryPath: () => "Gongkao Sprint/01_今日计划",
    } as never);

    expect(service.getPlanPath("2026-07-30")).toBe("Gongkao Sprint/01_今日计划/2026-07-30.md");
  });
});
