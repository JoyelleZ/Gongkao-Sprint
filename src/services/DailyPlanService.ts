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

export interface DailyPlanMonthEntry extends DailyPlanReadResult {
  date: string;
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
    const parsedSection = parseTodayTaskSection(content);
    const tasks = parsedSection.hasSection ? parsedSection.tasks : normalizePlanTasks(data.tasks);

    return {
      file,
      data,
      tasks,
      completionRate: calculateCompletionRate(tasks),
    };
  }

  async readMonthPlans(month: string): Promise<DailyPlanMonthEntry[]> {
    const start = `${month}-01`;
    const [year, monthNumber] = month.split("-").map((part) => Number(part));
    const end = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
    return this.readPlansInRange(start, end);
  }

  async readPlansInRange(startDate: string, endDate: string): Promise<DailyPlanMonthEntry[]> {
    const folder = this.store.getFolder(this.store.getSubdirectoryPath("01_今日计划"));
    if (!folder) {
      return [];
    }

    const entries: DailyPlanMonthEntry[] = [];
    for (const child of folder.children) {
      if (!this.isMarkdownPlanFile(child)) {
        continue;
      }

      const date = child.basename;
      if (date < startDate || date > endDate) {
        continue;
      }

      const plan = await this.readPlan(date);
      if (plan) {
        entries.push({ ...plan, date: plan.data.date });
      }
    }

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  async syncPlanTasksFromMarkdown(file: TFile): Promise<boolean> {
    const data = await this.store.readFrontmatter<DailyPlan>(file);
    if (!this.isDailyPlan(data)) {
      return false;
    }

    const content = await this.store.readFile(file);
    const parsedSection = parseTodayTaskSection(content);
    if (!parsedSection.hasSection) {
      return false;
    }

    const currentTasks = normalizePlanTasks(data.tasks);
    const nextTasks = mergeParsedTasks(parsedSection.tasks, currentTasks);
    if (arePlanTasksEqual(currentTasks, nextTasks)) {
      return false;
    }

    await this.store.updateFrontmatter(file, (frontmatter) => {
      frontmatter.tasks = nextTasks;
      frontmatter.updated = todayString();
    });
    return true;
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

  private isMarkdownPlanFile(value: unknown): value is TFile {
    return (
      typeof value === "object" &&
      value !== null &&
      "extension" in value &&
      "basename" in value &&
      (value as { extension?: unknown }).extension === "md" &&
      typeof (value as { basename?: unknown }).basename === "string" &&
      /^\d{4}-\d{2}-\d{2}$/u.test((value as { basename: string }).basename)
    );
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
      task_type: "review",
    });
  }

  if (defaultCollection) {
    tasks.push({
      text: `推进主刷题集合：${defaultCollection.name}`,
      completed: false,
      task_type: "practice",
    });
  }

  const inertia = recentReflections.find((reflection) => reflection.reflection_type === "思维惯性");
  if (inertia) {
    tasks.push({
      text: `纠偏提醒：${inertia.next_action ?? inertia.problem ?? "复盘最近的思维惯性"}`,
      completed: false,
      task_type: "correction",
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      text: "完成一组行测练习并记录结果",
      completed: false,
      task_type: "practice",
    });
  }

  return tasks;
}

export function parsePlanTasks(markdown: string): DailyPlanTask[] {
  return markdown
    .split("\n")
    .map((line) => /^\s*-\s+\[([ xX])\]\s(.*)$/u.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      text: match[2],
      completed: match[1].toLowerCase() === "x",
      task_type: "practice",
    }));
}

export function parseTodayTaskSection(markdown: string): { hasSection: boolean; tasks: DailyPlanTask[] } {
  const lines = markdown.split("\n");
  const headingIndex = lines.findIndex((line) => /^##\s+今日任务\s*$/u.test(line.trim()));
  if (headingIndex === -1) {
    return { hasSection: false, tasks: [] };
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(headingIndex + 1)) {
    if (/^#{1,2}\s+\S/u.test(line.trim())) {
      break;
    }
    sectionLines.push(line);
  }

  return {
    hasSection: true,
    tasks: parsePlanTasks(sectionLines.join("\n")),
  };
}

export function calculateCompletionRate(tasks: DailyPlanTask[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  return Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100);
}

export function normalizePlanTasks(value: unknown): DailyPlanTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPlanTaskLike).map((task) => ({
    text: task.text,
    completed: task.completed,
    task_type: isPlanTaskType(task.task_type) ? task.task_type : "practice",
  }));
}

function mergeParsedTasks(parsedTasks: DailyPlanTask[], currentTasks: DailyPlanTask[]): DailyPlanTask[] {
  const usedIndexes = new Set<number>();
  return parsedTasks.map((task, index) => {
    const sameIndex = currentTasks[index];
    if (sameIndex && sameIndex.text === task.text) {
      usedIndexes.add(index);
      return { ...task, task_type: sameIndex.task_type };
    }

    const matchingIndex = currentTasks.findIndex((candidate, candidateIndex) => !usedIndexes.has(candidateIndex) && candidate.text === task.text);
    if (matchingIndex !== -1) {
      usedIndexes.add(matchingIndex);
      return { ...task, task_type: currentTasks[matchingIndex]?.task_type ?? "practice" };
    }

    return task;
  });
}

function arePlanTasksEqual(left: DailyPlanTask[], right: DailyPlanTask[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((task, index) => {
    const other = right[index];
    return Boolean(other) && task.text === other.text && task.completed === other.completed && task.task_type === other.task_type;
  });
}

function isPlanTaskLike(value: unknown): value is Pick<DailyPlanTask, "text" | "completed"> & Partial<Pick<DailyPlanTask, "task_type">> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const task = value as Partial<DailyPlanTask>;
  return typeof task.text === "string" && typeof task.completed === "boolean";
}

function isPlanTaskType(value: unknown): value is DailyPlanTask["task_type"] {
  return value === "review" || value === "practice" || value === "correction";
}
