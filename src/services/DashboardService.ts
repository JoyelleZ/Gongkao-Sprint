import type { TFile } from "obsidian";
import type { ErrorCard, ExamCountdown, PracticeCollection, PracticeLog, ReflectionLog, XingceModule } from "../types";
import { todayString } from "../utils/date";
import type { PracticeCollectionService } from "./PracticeCollectionService";
import type { PracticeLogService } from "./PracticeLogService";
import type { ErrorCardService } from "./ErrorCardService";
import type { ReflectionLogService } from "./ReflectionLogService";
import { buildEffortHeatmap, type HeatmapDay } from "./EffortService";
import type { DailyPlanService, DailyPlanReadResult } from "./DailyPlanService";
import type { CountdownSummary, ExamCountdownService } from "./ExamCountdownService";
import { buildCountdownSummary } from "./ExamCountdownService";

export interface DashboardCollectionSummary {
  file: TFile;
  collection: PracticeCollection;
  total: number;
  wrong: number;
  lastPracticeDate?: string;
}

export interface DashboardWeekSummary {
  total: number;
  wrong: number;
  recentLogs: Array<{ file?: TFile; log: PracticeLog }>;
}

export interface DashboardModuleSummary {
  module: XingceModule;
  total: number;
  wrong: number;
  wrongRate: number;
}

export interface DashboardModel {
  collections: DashboardCollectionSummary[];
  week: DashboardWeekSummary;
  modules: DashboardModuleSummary[];
  review: DashboardReviewSummary;
  reflections: DashboardReflectionSummary;
  heatmap: HeatmapDay[];
  plan: DashboardPlanSummary;
  countdown: CountdownSummary;
  weakness: DashboardWeaknessSummary;
  hasAnyData: boolean;
}

export interface DashboardReviewSummary {
  dueCount: number;
  overdueCount: number;
  recentNewCount: number;
  byModule: Partial<Record<XingceModule, number>>;
  dueCards: Array<{ file?: TFile; card: ErrorCard }>;
}

export interface DashboardReflectionSummary {
  recent: Array<{ file?: TFile; reflection: ReflectionLog }>;
}

export interface DashboardPlanSummary {
  tasks: string[];
  completionRate: number;
  exists: boolean;
  file?: TFile;
}

export interface DashboardWeaknessSummary {
  lines: string[];
}

export class DashboardService {
  constructor(
    private readonly collectionService: PracticeCollectionService,
    private readonly practiceLogService: PracticeLogService,
    private readonly errorCardService: ErrorCardService,
    private readonly reflectionLogService: ReflectionLogService,
    private readonly dailyPlanService: DailyPlanService,
    private readonly examCountdownService: ExamCountdownService,
  ) {}

  async loadModel(today = todayString()): Promise<DashboardModel> {
    const collections = await this.collectionService.listCollections();
    const logs = await this.practiceLogService.listLogs();
    const cards = await this.errorCardService.listCards();
    const reflections = await this.reflectionLogService.listLogs();
    const plan = await this.dailyPlanService.readPlan(today);
    const countdowns = await this.examCountdownService.listCountdowns();

    return buildDashboardModel(
      collections,
      logs,
      cards,
      reflections,
      today,
      plan,
      countdowns.map((entry) => entry.data),
    );
  }
}

export function buildDashboardModel(
  collections: Array<{ file: TFile; data: PracticeCollection }>,
  logs: Array<{ file?: TFile; data: PracticeLog }> | PracticeLog[],
  cards: Array<{ file?: TFile; data: ErrorCard }> | ErrorCard[],
  reflections: Array<{ file?: TFile; data: ReflectionLog }> | ReflectionLog[],
  today: string,
  plan?: DailyPlanReadResult | null,
  countdowns: ExamCountdown[] = [],
): DashboardModel {
  const logEntries = normalizeEntries(logs);
  const cardEntries = normalizeEntries(cards);
  const reflectionEntries = normalizeEntries(reflections);
  const logData = logEntries.map((entry) => entry.data);
  const cardData = cardEntries.map((entry) => entry.data);
  const reflectionData = reflectionEntries.map((entry) => entry.data);

  const collectionSummaries = collections.map(({ file, data }) => {
    const relatedLogs = logData.filter((log) => log.collection_id === data.collection_id);
    return {
      file,
      collection: data,
      total: sum(relatedLogs, "total"),
      wrong: sum(relatedLogs, "wrong"),
      lastPracticeDate: relatedLogs.map((log) => log.date).sort().at(-1),
    };
  });

  const weekStart = getWeekStart(today);
  const weekLogs = logData.filter((log) => log.date >= weekStart && log.date <= today);
  const recentLogs = [...logEntries].sort((a, b) => b.data.date.localeCompare(a.data.date)).slice(0, 3);
  const modules = buildModuleSummaries(logData);

  return {
    collections: collectionSummaries,
    week: {
      total: sum(weekLogs, "total"),
      wrong: sum(weekLogs, "wrong"),
      recentLogs: recentLogs.map((entry) => ({ file: entry.file, log: entry.data })),
    },
    modules,
    review: buildReviewSummary(cardEntries, today),
    reflections: {
      recent: [...reflectionEntries]
        .sort((a, b) => b.data.date.localeCompare(a.data.date))
        .slice(0, 3)
        .map((entry) => ({ file: entry.file, reflection: entry.data })),
    },
    heatmap: buildEffortHeatmap(logData, cardData, reflectionData, today),
    plan: {
      exists: Boolean(plan),
      tasks: plan?.tasks.map((task) => `${task.completed ? "已完成" : "待完成"}：${task.text}`) ?? [],
      completionRate: plan?.completionRate ?? 0,
      file: plan?.file,
    },
    countdown: buildCountdownSummary(countdowns, today),
    weakness: buildWeaknessSummary(logData, cardData, reflectionData, today),
    hasAnyData: collections.length > 0 || logEntries.length > 0 || cardEntries.length > 0 || reflectionEntries.length > 0,
  };
}

export function buildWeaknessSummary(
  logs: PracticeLog[],
  cards: ErrorCard[],
  reflections: ReflectionLog[],
  today: string,
): DashboardWeaknessSummary {
  const since = daysBefore(today, 6);
  const recentLogs = logs.filter((log) => log.date >= since && log.date <= today);
  const wrongByModule = new Map<XingceModule, number>();

  for (const log of recentLogs) {
    wrongByModule.set(log.module, (wrongByModule.get(log.module) ?? 0) + log.wrong);
  }

  const lines: string[] = [];
  const weakest = [...wrongByModule.entries()].sort((a, b) => b[1] - a[1])[0];
  if (weakest && weakest[1] > 0) {
    lines.push(`最近 7 天错题最多：${weakest[0]} ${weakest[1]} 题`);
  }

  const lowMastery = cards.filter((card) => card.status === "active" && card.mastery <= 1);
  const lowMasteryByModule = countByModule(lowMastery);
  const low = [...Object.entries(lowMasteryByModule)].sort((a, b) => b[1] - a[1])[0];
  if (low && low[1] >= 2) {
    lines.push(`低掌握度集中：${low[0]} ${low[1]} 张`);
  }

  const dueByModule = countByModule(cards.filter((card) => card.status === "active" && card.next_review <= today));
  const due = [...Object.entries(dueByModule)].sort((a, b) => b[1] - a[1])[0];
  if (due && due[1] >= 2) {
    lines.push(`复习压力较高：${due[0]} ${due[1]} 张到期`);
  }

  const inertiaByModule = countByModule(
    reflections.filter((reflection) => reflection.date >= since && reflection.date <= today && reflection.reflection_type === "思维惯性"),
  );
  const inertia = [...Object.entries(inertiaByModule)].sort((a, b) => b[1] - a[1])[0];
  if (inertia && inertia[1] >= 2) {
    lines.push(`思维惯性反复出现：${inertia[0]} ${inertia[1]} 次`);
  }

  return { lines: lines.length > 0 ? lines : ["暂无足够数据", "完成几次刷题和复盘后，这里会出现提醒。"] };
}

function buildReviewSummary(cards: Array<{ file?: TFile; data: ErrorCard }>, today: string): DashboardReviewSummary {
  const activeCards = cards.filter((entry) => entry.data.status === "active");
  const dueCards = activeCards.filter((entry) => entry.data.next_review <= today);
  const byModule: Partial<Record<XingceModule, number>> = {};

  for (const entry of dueCards) {
    byModule[entry.data.module] = (byModule[entry.data.module] ?? 0) + 1;
  }

  return {
    dueCount: dueCards.length,
    overdueCount: dueCards.filter((entry) => entry.data.next_review < today).length,
    recentNewCount: activeCards.filter((entry) => entry.data.created === today).length,
    byModule,
    dueCards: dueCards.map((entry) => ({ file: entry.file, card: entry.data })),
  };
}

function normalizeEntries<T>(items: Array<{ file?: TFile; data: T }> | T[]): Array<{ file?: TFile; data: T }> {
  return items.map((item) => {
    if (typeof item === "object" && item !== null && "data" in item) {
      return item as { file?: TFile; data: T };
    }

    return { data: item as T };
  });
}

function buildModuleSummaries(logs: PracticeLog[]): DashboardModuleSummary[] {
  const stats = new Map<XingceModule, { total: number; wrong: number }>();

  for (const log of logs) {
    const current = stats.get(log.module) ?? { total: 0, wrong: 0 };
    current.total += log.total;
    current.wrong += log.wrong;
    stats.set(log.module, current);
  }

  return [...stats.entries()]
    .map(([module, value]) => ({
      module,
      total: value.total,
      wrong: value.wrong,
      wrongRate: value.total === 0 ? 0 : value.wrong / value.total,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate);
}

function getWeekStart(dateString: string): string {
  const [year, month, dayOfMonth] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return date.toISOString().slice(0, 10);
}

function daysBefore(dateString: string, days: number): string {
  const [year, month, dayOfMonth] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function countByModule(items: Array<{ module?: XingceModule }>): Partial<Record<XingceModule, number>> {
  const counts: Partial<Record<XingceModule, number>> = {};
  for (const item of items) {
    if (item.module) {
      counts[item.module] = (counts[item.module] ?? 0) + 1;
    }
  }

  return counts;
}

function sum(logs: PracticeLog[], field: "total" | "wrong"): number {
  return logs.reduce((total, log) => total + log[field], 0);
}
