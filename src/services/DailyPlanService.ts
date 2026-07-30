import type { TFile } from "obsidian";
import type { DailyPlan, DailyPlanTask, ErrorCard, PracticeCollection, ReflectionLog } from "../types";
import { createStableId } from "../utils/id";
import { todayString } from "../utils/date";
import type { VaultStore } from "./VaultStore";

export interface GenerateDailyPlanInput {
  date?: string;
  dueCards: ErrorCard[];
  defaultCollection?: PracticeCollection;
  recentReflections: ReflectionLog[];
}

export interface DailyPlanReadResult {
  file: TFile;
  data: DailyPlan;
  tasks: DailyPlanTask[];
  completionRate: number;
}

export class DailyPlanService {
  constructor(private readonly store: VaultStore) {}

  async generatePlan(input: GenerateDailyPlanInput, now = new Date()): Promise<TFile> {
    const date = input.date ?? todayString(now);
    const existingPath = this.getPlanPath(date);

    if (this.store.getFile(existingPath)) {
      throw new Error("今日计划已存在，请先打开确认，不会自动覆盖。");
    }

    const tasks = buildDailyPlanTasks(input.dueCards, input.defaultCollection, input.recentReflections);
    const plan: DailyPlan = {
      type: "gongkao-daily-plan",
      plan_id: createStableId("dp", now),
      date,
      tasks,
      created: todayString(now),
      updated: todayString(now),
    };

    return this.store.createMarkdownFile(existingPath, plan, this.buildPlanBody(plan));
  }

  async readPlan(date = todayString()): Promise<DailyPlanReadResult | null> {
    const file = this.store.getFile(this.getPlanPath(date));
    if (!file) {
      return null;
    }

    const data = await this.store.readFrontmatter<DailyPlan>(file);
    if (!this.isDailyPlan(data)) {
      return null;
    }

    const content = await this.store.readFile(file);
    const tasks = parsePlanTasks(content);

    return {
      file,
      data,
      tasks,
      completionRate: calculateCompletionRate(tasks),
    };
  }

  getPlanPath(date: string): string {
    return `${this.store.getSubdirectoryPath("01_今日计划")}/${date}.md`;
  }

  buildPlanBody(plan: DailyPlan): string {
    return [
      `# ${plan.date} 今日计划`,
      "",
      "## 今日任务",
      "",
      ...(plan.tasks?.map((task) => `- [${task.completed ? "x" : " "}] ${task.text}`) ?? []),
      "",
      "## 今日复盘提醒",
      "",
      "完成任务后，补一条复盘：今天最需要纠偏的动作是什么？",
    ].join("\n");
  }

  private isDailyPlan(value: Partial<DailyPlan>): value is DailyPlan {
    return value.type === "gongkao-daily-plan" && typeof value.plan_id === "string" && typeof value.date === "string";
  }
}

export function buildDailyPlanTasks(
  dueCards: ErrorCard[],
  defaultCollection: PracticeCollection | undefined,
  recentReflections: ReflectionLog[],
): DailyPlanTask[] {
  const tasks: DailyPlanTask[] = [];

  if (dueCards.length > 0) {
    tasks.push({
      text: `复习到期错题 ${dueCards.length} 张`,
      completed: false,
      source: "review",
    });
  }

  if (defaultCollection) {
    tasks.push({
      text: `推进主刷题集合：${defaultCollection.name}`,
      completed: false,
      source: "practice",
    });
  }

  const inertia = recentReflections.find((reflection) => reflection.reflection_type === "思维惯性");
  if (inertia) {
    tasks.push({
      text: `纠偏提醒：${inertia.next_action ?? inertia.problem ?? "复盘最近的思维惯性"}`,
      completed: false,
      source: "correction",
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      text: "完成一组行测练习并记录结果",
      completed: false,
      source: "practice",
    });
  }

  return tasks;
}

export function parsePlanTasks(markdown: string): DailyPlanTask[] {
  return markdown
    .split("\n")
    .map((line) => /^\s*-\s+\[([ xX])\]\s+(.+)$/u.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      text: match[2],
      completed: match[1].toLowerCase() === "x",
      source: "practice",
    }));
}

export function calculateCompletionRate(tasks: DailyPlanTask[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}
