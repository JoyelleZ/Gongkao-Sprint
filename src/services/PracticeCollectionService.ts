import type { TFile } from "obsidian";
import type { PracticeCollection, PracticeCollectionStatus, PracticeCollectionType, XingceModule } from "../types";
import { createStableId } from "../utils/id";
import { todayString } from "../utils/date";
import { isXingceModule } from "../utils/validation";
import type { VaultStore } from "./VaultStore";

interface CreatePracticeCollectionInput {
  name: string;
  collectionType: PracticeCollectionType;
  module?: XingceModule;
}

interface UpdatePracticeCollectionInput {
  name?: string;
  collectionType?: PracticeCollectionType;
  module?: XingceModule;
  status?: PracticeCollectionStatus;
  currentRound?: number;
}

export class PracticeCollectionService {
  constructor(private readonly store: VaultStore) {}

  async createCollection(input: CreatePracticeCollectionInput): Promise<TFile> {
    const now = todayString();
    const collection: PracticeCollection = {
      type: "gongkao-practice-collection",
      collection_id: createStableId("pc"),
      name: input.name.trim(),
      collection_type: input.collectionType,
      subject: "行测",
      module: input.module,
      status: "active",
      current_round: 1,
      created: now,
      updated: now,
    };

    if (!collection.name) {
      throw new Error("刷题集合名称不能为空。");
    }

    const path = await this.store.getAvailableMarkdownPath(this.store.getSubdirectoryPath("Collections"), collection.name);
    return this.store.createMarkdownFile(path, collection, this.buildCollectionBody(collection));
  }

  async listCollections(): Promise<Array<{ file: TFile; data: PracticeCollection }>> {
    const folder = this.store.getFolder(this.store.getSubdirectoryPath("Collections"));
    if (!folder) {
      return [];
    }

    const results: Array<{ file: TFile; data: PracticeCollection }> = [];

    for (const child of folder.children) {
      if (!this.isMarkdownFile(child)) {
        continue;
      }

      const frontmatter = await this.store.readFrontmatter<PracticeCollection>(child);
      if (this.isPracticeCollection(frontmatter)) {
        results.push({ file: child, data: frontmatter });
      }
    }

    return results.sort((a, b) => a.data.created.localeCompare(b.data.created));
  }

  async markFirstRoundDone(file: TFile): Promise<void> {
    await this.store.updateFrontmatter(file, (frontmatter) => {
      frontmatter.status = "first_round_done";
      frontmatter.updated = todayString();
    });
  }

  async findById(collectionId: string): Promise<{ file: TFile; data: PracticeCollection } | null> {
    const collections = await this.listCollections();
    return collections.find((collection) => collection.data.collection_id === collectionId) ?? null;
  }

  async updateCollection(file: TFile, input: UpdatePracticeCollectionInput): Promise<void> {
    await this.store.updateFrontmatter(file, (frontmatter) => {
      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) {
          throw new Error("刷题集合名称不能为空。");
        }
        frontmatter.name = name;
      }

      if (input.collectionType !== undefined) {
        frontmatter.collection_type = input.collectionType;
      }

      if (input.module !== undefined) {
        frontmatter.module = input.module;
      }

      if (input.status !== undefined) {
        frontmatter.status = input.status;
      }

      if (input.currentRound !== undefined) {
        if (!Number.isInteger(input.currentRound) || input.currentRound <= 0) {
          throw new Error("当前轮次必须是正整数。");
        }
        frontmatter.current_round = input.currentRound;
      }

      frontmatter.updated = todayString();
    });
  }

  private isPracticeCollection(value: Partial<PracticeCollection>): value is PracticeCollection {
    const collectionTypes: PracticeCollectionType[] = ["topic", "paper", "book"];
    const statuses = ["not_started", "active", "first_round_done", "second_round", "paused"];

    return (
      value.type === "gongkao-practice-collection" &&
      typeof value.collection_id === "string" &&
      typeof value.name === "string" &&
      collectionTypes.includes(value.collection_type as PracticeCollectionType) &&
      value.subject === "行测" &&
      statuses.includes(String(value.status)) &&
      typeof value.current_round === "number" &&
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

  private buildCollectionBody(collection: PracticeCollection): string {
    return [
      `# ${collection.name}`,
      "",
      "## 刷题定位",
      "",
      `- 类型：${this.formatCollectionType(collection.collection_type)}`,
      `- 科目：${collection.subject}`,
      collection.module ? `- 模块：${collection.module}` : "- 模块：未指定",
      "",
      "## 复盘提醒",
      "",
      "- 首刷完成后可在工作台标记完成，二刷继续用新轮次记录。",
    ].join("\n");
  }

  private formatCollectionType(type: PracticeCollectionType): string {
    const labelMap: Record<PracticeCollectionType, string> = {
      topic: "专题",
      paper: "套卷",
      book: "题集",
    };

    return labelMap[type];
  }
}
