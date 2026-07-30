import type { DailyPlan, ErrorCard, PracticeCollection, PracticeLog, ReflectionLog } from "../types";
import { addDays, formatDate, initialReviewDate } from "../utils/date";
import type { VaultStore } from "./VaultStore";

export class ExampleDataService {
  constructor(private readonly store: VaultStore) {}

  async createExampleData(now = new Date()): Promise<void> {
    await this.store.ensureDataDirectories();

    const markerPath = `${this.store.getDataRoot()}/示例数据说明.md`;
    if (this.store.getFile(markerPath)) {
      throw new Error("示例数据已存在，不会重复创建。");
    }

    const today = formatDate(now);
    const yesterday = formatDate(addDays(now, -1));
    const threeDaysAgo = formatDate(addDays(now, -3));
    const collectionId = "pc-example-data-analysis";
    const errorCardId = "ec-example-growth-rate";
    const reflectionId = "rf-example-inertia";

    const collection: PracticeCollection = {
      type: "gongkao-practice-collection",
      collection_id: collectionId,
      name: "示例-资料分析高频 300 题",
      collection_type: "topic",
      subject: "行测",
      module: "资料分析",
      status: "active",
      current_round: 1,
      created: threeDaysAgo,
      updated: today,
    };

    await this.store.createMarkdownFile(
      `${this.store.getSubdirectoryPath("Collections")}/示例-资料分析高频 300 题.md`,
      collection,
      ["# 示例-资料分析高频 300 题", "", "## 刷题定位", "", "- 类型：专题", "- 模块：资料分析"].join("\n"),
    );

    await this.createPracticeLog({
      type: "gongkao-practice-log",
      date: threeDaysAgo,
      collection_id: collectionId,
      collection_name: collection.name,
      collection_type: collection.collection_type,
      module: "资料分析",
      total: 25,
      wrong: 6,
      round: 1,
      range_label: "示例 第 1 组",
      created: threeDaysAgo,
    });
    await this.createPracticeLog({
      type: "gongkao-practice-log",
      date: yesterday,
      collection_id: collectionId,
      collection_name: collection.name,
      collection_type: collection.collection_type,
      module: "资料分析",
      total: 35,
      wrong: 5,
      round: 1,
      range_label: "示例 第 2 组",
      created: yesterday,
    });

    const card: ErrorCard = {
      type: "gongkao-error-card",
      error_card_id: errorCardId,
      subject: "行测",
      module: "资料分析",
      question_type: "增长率",
      collection_id: collectionId,
      collection_name: collection.name,
      collection_type: collection.collection_type,
      range_label: "示例 第 2 组 第 18 题",
      answer: "B",
      wrong_reason: "示例：把现期量和基期量看反，导致增长率方向判断错误。",
      mastery: 1,
      review_count: 1,
      created: yesterday,
      last_reviewed: yesterday,
      next_review: today,
      status: "active",
      body: "示例题干：某资料分析题要求判断增长率变化，请先区分现期量与基期量。",
      review_history: [{ date: yesterday, result: "hard", next_review: initialReviewDate(1, addDays(now, -1)) }],
    };

    await this.store.createMarkdownFile(
      `${this.store.getSubdirectoryPath("ErrorCards")}/示例-${today}-资料分析-增长率.md`,
      card,
      ["# 示例资料分析错题", "", "## 正面", "", card.body ?? "", "", "## 背面", "", "- 答案：B", `- 错因：${card.wrong_reason}`].join("\n"),
    );

    const reflection: ReflectionLog = {
      type: "gongkao-reflection-log",
      reflection_id: reflectionId,
      date: today,
      scope: "module",
      module: "资料分析",
      collection_id: collectionId,
      collection_name: collection.name,
      reflection_type: "思维惯性",
      trigger: "示例：资料分析连续两题急着套公式。",
      problem: "示例：没有先确认单位、现期、基期，导致方向判断不稳。",
      method: "示例：先圈单位，再标出现期和基期，最后列式。",
      next_action: "示例：资料分析开算前先写下单位和时间。",
      created: today,
      updated: today,
    };

    await this.store.createMarkdownFile(
      `${this.store.getSubdirectoryPath("Reflections")}/示例-${today}-思维惯性-资料分析.md`,
      reflection,
      [
        "# 示例复盘：资料分析思维惯性",
        "",
        "## 触发场景",
        reflection.trigger ?? "",
        "",
        "## 我的问题",
        reflection.problem ?? "",
        "",
        "## 技巧 / 方法",
        reflection.method ?? "",
        "",
        "## 下次纠偏动作",
        reflection.next_action ?? "",
      ].join("\n"),
    );

    const plan: DailyPlan = {
      type: "gongkao-daily-plan",
      plan_id: "dp-example-today",
      date: today,
      tasks: [
        { text: "示例：复习到期错题 1 张", completed: false, source: "review" },
        { text: `示例：推进主刷题集合：${collection.name}`, completed: false, source: "practice" },
        { text: "示例：资料分析开算前先写下单位和时间", completed: false, source: "correction" },
      ],
      created: today,
      updated: today,
    };

    await this.store.createMarkdownFile(
      `${this.store.getSubdirectoryPath("Plans")}/${today}-示例今日计划.md`,
      plan,
      [
        `# ${today} 示例今日计划`,
        "",
        "## 今日任务",
        "",
        ...(plan.tasks?.map((task) => `- [ ] ${task.text}`) ?? []),
      ].join("\n"),
    );

    await this.store.createMarkdownFile(
      markerPath,
      { type: "gongkao-example-data", created: today },
      ["# Gongkao Sprint 示例数据说明", "", "这组示例数据用于体验工作台、错题复习、复盘记录和热力图。"].join("\n"),
    );
  }

  private async createPracticeLog(log: PracticeLog): Promise<void> {
    await this.store.createMarkdownFile(
      `${this.store.getSubdirectoryPath("PracticeLogs")}/示例-${log.date}-${log.module}-${log.range_label}.md`,
      log,
      [
        `# 示例 ${log.date} ${log.module}刷题记录`,
        "",
        "## 数据",
        "",
        `- 刷题数：${log.total}`,
        `- 错题数：${log.wrong}`,
      ].join("\n"),
    );
  }
}
