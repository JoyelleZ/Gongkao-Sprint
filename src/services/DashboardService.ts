import type { TFile } from "obsidian";
import type { PracticeCollection, PracticeLog, XingceModule } from "../types";
import { todayString } from "../utils/date";
import type { PracticeCollectionService } from "./PracticeCollectionService";
import type { PracticeLogService } from "./PracticeLogService";

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
  hasAnyData: boolean;
}

export class DashboardService {
  constructor(
    private readonly collectionService: PracticeCollectionService,
    private readonly practiceLogService: PracticeLogService,
  ) {}

  async loadModel(today = todayString()): Promise<DashboardModel> {
    const collections = await this.collectionService.listCollections();
    const logs = await this.practiceLogService.listLogs();

    return buildDashboardModel(collections, logs.map((entry) => entry.data), today);
  }
}

export function buildDashboardModel(
  collections: Array<{ file: TFile; data: PracticeCollection }>,
  logs: PracticeLog[],
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
    hasAnyData: collections.length > 0 || logs.length > 0,
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
