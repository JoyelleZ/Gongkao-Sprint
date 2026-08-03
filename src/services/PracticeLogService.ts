import type { TFile } from "obsidian";
import type { PracticeCollectionType, PracticeLog, XingceModule } from "../types";
import { buildDatedFileName } from "../utils/fileName";
import { todayString } from "../utils/date";
import { isXingceModule, toNonNegativeInteger, toPositiveInteger } from "../utils/validation";
import type { VaultStore } from "./VaultStore";

export interface CreatePracticeLogInput {
  date?: string;
  collectionId?: string;
  collectionName?: string;
  collectionType?: PracticeCollectionType;
  module: XingceModule;
  total: number;
  wrong: number;
  durationMinutes?: number;
  round?: number;
  rangeLabel?: string;
}

export interface PracticeLogStats {
  total: number;
  wrong: number;
  byModule: Partial<Record<XingceModule, { total: number; wrong: number }>>;
}

export class PracticeLogService {
  constructor(private readonly store: VaultStore) {}

  async createLog(input: CreatePracticeLogInput): Promise<TFile> {
    this.validateInput(input);

    const date = input.date ?? todayString();
    const log: PracticeLog = {
      type: "gongkao-practice-log",
      date,
      collection_id: input.collectionId,
      collection_name: input.collectionName,
      collection_type: input.collectionType,
      module: input.module,
      total: input.total,
      wrong: input.wrong,
      duration_minutes: input.durationMinutes,
      round: input.round ?? 1,
      range_label: input.rangeLabel,
      created: todayString(),
    };

    const baseName = buildDatedFileName(date, `${input.module}-${input.collectionName ?? "独立练习"}`, 1).replace(/\.md$/u, "");
    const path = await this.store.getAvailableMarkdownPath(this.store.getSubdirectoryPath("02_刷题记录"), baseName);
    return this.store.createMarkdownFile(path, log, this.buildLogBody(log));
  }

  async listLogs(): Promise<Array<{ file: TFile; data: PracticeLog }>> {
    const folder = this.store.getFolder(this.store.getSubdirectoryPath("02_刷题记录"));
    if (!folder) {
      return [];
    }

    const results: Array<{ file: TFile; data: PracticeLog }> = [];

    for (const child of folder.children) {
      if (!this.isMarkdownFile(child)) {
        continue;
      }

      const frontmatter = await this.store.readFrontmatter<PracticeLog>(child);
      if (this.isPracticeLog(frontmatter)) {
        results.push({ file: child, data: frontmatter });
      }
    }

    return results.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }

  calculateStats(logs: PracticeLog[], collectionId?: string): PracticeLogStats {
    const filteredLogs = collectionId ? logs.filter((log) => log.collection_id === collectionId) : logs;
    const stats: PracticeLogStats = { total: 0, wrong: 0, byModule: {} };

    for (const log of filteredLogs) {
      stats.total += log.total;
      stats.wrong += log.wrong;

      const moduleStats = stats.byModule[log.module] ?? { total: 0, wrong: 0 };
      moduleStats.total += log.total;
      moduleStats.wrong += log.wrong;
      stats.byModule[log.module] = moduleStats;
    }

    return stats;
  }

  private validateInput(input: CreatePracticeLogInput): void {
    if (!isXingceModule(input.module)) {
      throw new Error("请选择有效的行测模块。");
    }

    toPositiveInteger(input.total, "刷题数");
    toNonNegativeInteger(input.wrong, "错题数");

    if (input.wrong > input.total) {
      throw new Error("错题数不能大于刷题数。");
    }

    if (input.durationMinutes !== undefined) {
      toPositiveInteger(input.durationMinutes, "练习时长");
    }

    if (input.round !== undefined) {
      toPositiveInteger(input.round, "轮次");
    }
  }

  private isPracticeLog(value: Partial<PracticeLog>): value is PracticeLog {
    return (
      value.type === "gongkao-practice-log" &&
      typeof value.date === "string" &&
      isXingceModule(value.module) &&
      typeof value.total === "number" &&
      typeof value.wrong === "number" &&
      typeof value.round === "number"
    );
  }

  private isMarkdownFile(value: unknown): value is TFile {
    return (
      typeof value === "object" &&
      value !== null &&
      "extension" in value &&
      "path" in value &&
      (value as { extension: unknown }).extension === "md"
    );
  }

  private buildLogBody(log: PracticeLog): string {
    return [
      `# ${log.date} ${log.module}刷题记录`,
      "",
      "## 本次范围",
      "",
      `- 刷题集合：${log.collection_name ?? "未绑定"}`,
      `- 范围：${log.range_label ?? "未填写"}`,
      `- 轮次：第 ${log.round} 轮`,
      "",
      "## 数据",
      "",
      `- 刷题数：${log.total}`,
      `- 错题数：${log.wrong}`,
      log.duration_minutes ? `- 时长：${log.duration_minutes} 分钟` : "- 时长：未填写",
    ].join("\n");
  }
}
