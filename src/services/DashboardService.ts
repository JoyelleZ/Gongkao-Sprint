import type { TFile } from "obsidian";
import type { ErrorCard, PracticeCollection, PracticeLog, ReflectionLog, XingceModule } from "../types";
import { todayString } from "../utils/date";
import type { PracticeCollectionService } from "./PracticeCollectionService";
import type { PracticeLogService } from "./PracticeLogService";
import type { ErrorCardService } from "./ErrorCardService";
import type { ReflectionLogService } from "./ReflectionLogService";

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

export class DashboardService {
  constructor(
    private readonly collectionService: PracticeCollectionService,
    private readonly practiceLogService: PracticeLogService,
    private readonly errorCardService: ErrorCardService,
    private readonly reflectionLogService: ReflectionLogService,
  ) {}

  async loadModel(today = todayString()): Promise<DashboardModel> {
    const collections = await this.collectionService.listCollections();
    const logs = await this.practiceLogService.listLogs();
    const cards = await this.errorCardService.listCards();
    const reflections = await this.reflectionLogService.listLogs();

    return buildDashboardModel(
      collections,
      logs.map((entry) => entry.data),
      cards.map((entry) => entry.data),
      reflections.map((entry) => entry.data),
      today,
    );
  }
}

export function buildDashboardModel(
  collections: Array<{ file: TFile; data: PracticeCollection }>,
  logs: PracticeLog[],
  cards: ErrorCard[],
  reflections: ReflectionLog[],
  today: string,
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
    hasAnyData: collections.length > 0 || logs.length > 0 || cards.length > 0 || reflections.length > 0,
  };
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

function sum(logs: PracticeLog[], field: "total" | "wrong"): number {
  return logs.reduce((total, log) => total + log[field], 0);
}
