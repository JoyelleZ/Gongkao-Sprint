import type { TFile } from "obsidian";
import type { ErrorCard, PracticeCollection, PracticeLog, ReflectionLog, XingceModule } from "../types";
import { todayString } from "../utils/date";
import type { PracticeCollectionService } from "./PracticeCollectionService";
import type { PracticeLogService } from "./PracticeLogService";
import type { ErrorCardService } from "./ErrorCardService";
import type { ReflectionLogService } from "./ReflectionLogService";
import { buildEffortHeatmap, type HeatmapDay } from "./EffortService";
import type { DailyPlanService, DailyPlanReadResult } from "./DailyPlanService";

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
  recentLogs: PracticeLog[];
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
  weakness: DashboardWeaknessSummary;
  hasAnyData: boolean;
}

export interface DashboardReviewSummary {
  dueCount: number;
  overdueCount: number;
  recentNewCount: number;
  byModule: Partial<Record<XingceModule, number>>;
}

export interface DashboardReflectionSummary {
  recent: ReflectionLog[];
}

export interface DashboardPlanSummary {
  tasks: string[];
  completionRate: number;
  exists: boolean;
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
  ) {}

  async loadModel(today = todayString()): Promise<DashboardModel> {
    const collections = await this.collectionService.listCollections();
    const logs = await this.practiceLogService.listLogs();
    const cards = await this.errorCardService.listCards();
    const reflections = await this.reflectionLogService.listLogs();
    const plan = await this.dailyPlanService.readPlan(today);

    return buildDashboardModel(
      collections,
      logs.map((entry) => entry.data),
      cards.map((entry) => entry.data),
      reflections.map((entry) => entry.data),
      today,
      plan,
    );
  }
}

export function buildDashboardModel(
  collections: Array<{ file: TFile; data: PracticeCollection }>,
  logs: PracticeLog[],
  cards: ErrorCard[],
  reflections: ReflectionLog[],
  today: string,
  plan?: DailyPlanReadResult | null,
): DashboardModel {
  const collectionSummaries = collections.map(({ file, data }) => {
    const relatedLogs = logs.filter((log) => log.collection_id === data.collection_id);
    return {
      file,
      collection: data,
      total: sum(relatedLogs, "total"),
      wrong: sum(relatedLogs, "wrong"),
      lastPracticeDate: relatedLogs.map((log) => log.date).sort().at(-1),
    };
  });

  const weekStart = getWeekStart(today);
  const weekLogs = logs.filter((log) => log.date >= weekStart && log.date <= today);
  const recentLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const modules = buildModuleSummaries(logs);

  return {
    collections: collectionSummaries,
    week: {
      total: sum(weekLogs, "total"),
      wrong: sum(weekLogs, "wrong"),
      recentLogs,
    },
    modules,
    review: buildReviewSummary(cards, today),
    reflections: {
      recent: [...reflections].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    },
    heatmap: buildEffortHeatmap(logs, cards, reflections, today),
    plan: {
      exists: Boolean(plan),
      tasks: plan?.tasks.map((task) => `${task.completed ? "已完成" : "待完成"}：${task.text}`) ?? [],
      completionRate: plan?.completionRate ?? 0,
    },
    weakness: buildWeaknessSummary(logs, cards, reflections, today),
    hasAnyData: collections.length > 0 || logs.length > 0 || cards.length > 0 || reflections.length > 0,
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

function buildReviewSummary(cards: ErrorCard[], today: string): DashboardReviewSummary {
  const activeCards = cards.filter((card) => card.status === "active");
  const dueCards = activeCards.filter((card) => card.next_review <= today);
  const byModule: Partial<Record<XingceModule, number>> = {};

  for (const card of dueCards) {
    byModule[card.module] = (byModule[card.module] ?? 0) + 1;
  }

  return {
    dueCount: dueCards.length,
    overdueCount: dueCards.filter((card) => card.next_review < today).length,
    recentNewCount: activeCards.filter((card) => card.created === today).length,
    byModule,
  };
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
