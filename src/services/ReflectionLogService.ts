import type { TFile } from "obsidian";
import type { PracticeCollectionType, ReflectionLog, ReflectionScope, ReflectionType, XingceModule } from "../types";
import { buildDatedFileName } from "../utils/fileName";
import { createStableId } from "../utils/id";
import { todayString } from "../utils/date";
import { isXingceModule } from "../utils/validation";
import type { VaultStore } from "./VaultStore";

export interface CreateReflectionLogInput {
  date?: string;
  scope: ReflectionScope;
  module?: XingceModule;
  collectionId?: string;
  collectionName?: string;
  collectionType?: PracticeCollectionType;
  errorCardPath?: string;
  reflectionType: ReflectionType;
  trigger: string;
  problem: string;
  method: string;
  nextAction: string;
}

export interface ReflectionLogQuery {
  dateFrom?: string;
  dateTo?: string;
  scope?: ReflectionScope;
  module?: XingceModule;
  reflectionType?: ReflectionType;
  collectionId?: string;
}

export class ReflectionLogService {
  constructor(private readonly store: VaultStore) {}

  async createLog(input: CreateReflectionLogInput, now = new Date()): Promise<TFile> {
    this.validateInput(input);

    const date = input.date ?? todayString(now);
    const log: ReflectionLog = {
      type: "gongkao-reflection-log",
      reflection_id: createStableId("rf", now),
      date,
      scope: input.scope,
      module: input.module,
      collection_id: input.collectionId?.trim() || undefined,
      collection_name: input.collectionName?.trim() || undefined,
      error_card_path: input.errorCardPath?.trim() || undefined,
      reflection_type: input.reflectionType,
      trigger: input.trigger.trim(),
      problem: input.problem.trim(),
      method: input.method.trim(),
      next_action: input.nextAction.trim(),
      created: todayString(now),
      updated: todayString(now),
    };

    const title = buildDatedFileName(date, `${log.reflection_type}-${log.module ?? this.formatScope(log.scope)}`, 1).replace(
      /\.md$/u,
      "",
    );
    const path = await this.store.getAvailableMarkdownPath(this.store.getSubdirectoryPath("Reflections"), title);
    return this.store.createMarkdownFile(path, log, this.buildLogBody(log));
  }

  async listLogs(query: ReflectionLogQuery = {}): Promise<Array<{ file: TFile; data: ReflectionLog }>> {
    const folder = this.store.getFolder(this.store.getSubdirectoryPath("Reflections"));
    if (!folder) {
      return [];
    }

    const results: Array<{ file: TFile; data: ReflectionLog }> = [];

    for (const child of folder.children) {
      if (!this.isMarkdownFile(child)) {
        continue;
      }

      const frontmatter = await this.store.readFrontmatter<ReflectionLog>(child);
      if (this.isReflectionLog(frontmatter) && this.matchesQuery(frontmatter, query)) {
        results.push({ file: child, data: frontmatter });
      }
    }

    return results.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }

  buildLogBody(log: ReflectionLog): string {
    return [
      `# ${log.date} ${log.reflection_type}`,
      "",
      "## 关联范围",
      "",
      `- 范围：${this.formatScope(log.scope)}`,
      `- 模块：${log.module ?? "未指定"}`,
      `- 刷题集合：${log.collection_name ?? "未绑定"}`,
      log.error_card_path ? `- 错题卡：${log.error_card_path}` : "- 错题卡：未绑定",
      "",
      "## 触发场景",
      "",
      log.trigger || "未填写",
      "",
      "## 我的问题",
      "",
      log.problem || "未填写",
      "",
      "## 技巧 / 方法",
      "",
      log.method || "未填写",
      "",
      "## 下次纠偏动作",
      "",
      log.next_action || "未填写",
    ].join("\n");
  }

  private validateInput(input: CreateReflectionLogInput): void {
    if (!input.trigger.trim() || !input.problem.trim() || !input.method.trim() || !input.nextAction.trim()) {
      throw new Error("请填写触发场景、我的问题、技巧/方法和下次纠偏动作。");
    }

    if (input.module && !isXingceModule(input.module)) {
      throw new Error("请选择有效的行测模块。");
    }
  }

  private matchesQuery(log: ReflectionLog, query: ReflectionLogQuery): boolean {
    return (
      (!query.dateFrom || log.date >= query.dateFrom) &&
      (!query.dateTo || log.date <= query.dateTo) &&
      (!query.scope || log.scope === query.scope) &&
      (!query.module || log.module === query.module) &&
      (!query.reflectionType || log.reflection_type === query.reflectionType) &&
      (!query.collectionId || log.collection_id === query.collectionId)
    );
  }

  private isReflectionLog(value: Partial<ReflectionLog>): value is ReflectionLog {
    const scopes: ReflectionScope[] = ["daily", "practice_log", "error_card", "collection", "module"];
    const types: ReflectionType[] = ["技巧沉淀", "思维惯性", "易错提醒", "时间策略", "方法步骤", "其他"];

    return (
      value.type === "gongkao-reflection-log" &&
      typeof value.reflection_id === "string" &&
      typeof value.date === "string" &&
      scopes.includes(value.scope as ReflectionScope) &&
      types.includes(value.reflection_type as ReflectionType) &&
      (!value.module || isXingceModule(value.module))
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

  private formatScope(scope: ReflectionScope): string {
    const labels: Record<ReflectionScope, string> = {
      daily: "当天整体复盘",
      practice_log: "刷题记录复盘",
      error_card: "错题复盘",
      collection: "集合复盘",
      module: "模块复盘",
    };

    return labels[scope];
  }
}

