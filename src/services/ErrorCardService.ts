import type { TFile } from "obsidian";
import type { ErrorCard, ImageMask, Mastery, PracticeCollectionType, ReviewResult, XingceModule } from "../types";
import { initialReviewDate, nextReviewDate, todayString } from "../utils/date";
import { createStableId } from "../utils/id";
import { isXingceModule } from "../utils/validation";
import type { VaultStore } from "./VaultStore";

export interface CreateErrorCardInput {
  module: XingceModule;
  questionType?: string;
  collectionId?: string;
  collectionName?: string;
  collectionType?: PracticeCollectionType;
  rangeLabel?: string;
  round?: number;
  answer?: string;
  wrongReason?: string;
  mastery: Mastery;
  body?: string;
  image?: string;
  masks?: ImageMask[];
}

export interface ErrorCardQuery {
  status?: ErrorCard["status"];
  module?: XingceModule;
  collectionId?: string;
  mastery?: Mastery;
  dueOnOrBefore?: string;
}

export class ErrorCardService {
  constructor(private readonly store: VaultStore) {}

  async copyImageAttachment(file: File, targetBaseName: string): Promise<string> {
    return this.store.copyAttachment(file, targetBaseName);
  }

  async createCard(input: CreateErrorCardInput, now = new Date()): Promise<TFile> {
    this.validateInput(input);

    const created = todayString(now);
    const card: ErrorCard = {
      type: "gongkao-error-card",
      error_card_id: createStableId("ec", now),
      subject: "行测",
      module: input.module,
      question_type: input.questionType?.trim() || undefined,
      collection_id: input.collectionId?.trim() || undefined,
      collection_name: input.collectionName?.trim() || undefined,
      collection_type: input.collectionType,
      range_label: input.rangeLabel?.trim() || undefined,
      round: input.round,
      answer: input.answer?.trim() || undefined,
      wrong_reason: input.wrongReason?.trim() || undefined,
      mastery: input.mastery,
      review_count: 0,
      created,
      next_review: initialReviewDate(input.mastery, now),
      status: "active",
      body: input.body?.trim() || undefined,
      image: input.image,
      masks: input.masks,
    };

    const title = `${created}-${card.module}-${card.question_type ?? "错题"}`;
    const path = await this.store.getAvailableMarkdownPath(this.store.getSubdirectoryPath("03_错题库"), title);
    return this.store.createMarkdownFile(path, card, this.buildCardBody(card));
  }

  async listCards(query: ErrorCardQuery = {}): Promise<Array<{ file: TFile; data: ErrorCard }>> {
    const folder = this.store.getFolder(this.store.getSubdirectoryPath("03_错题库"));
    if (!folder) {
      return [];
    }

    const results: Array<{ file: TFile; data: ErrorCard }> = [];

    for (const child of folder.children) {
      if (!this.isMarkdownFile(child)) {
        continue;
      }

      const frontmatter = await this.store.readFrontmatter<ErrorCard>(child);
      if (this.isErrorCard(frontmatter) && this.matchesQuery(frontmatter, query)) {
        results.push({ file: child, data: frontmatter });
      }
    }

    return results.sort((a, b) => a.data.next_review.localeCompare(b.data.next_review));
  }

  async listDueCards(today = todayString()): Promise<Array<{ file: TFile; data: ErrorCard }>> {
    const cards = await this.listCards({ status: "active", dueOnOrBefore: today });
    return sortReviewQueue(cards, today);
  }

  async listReviewCards(today = todayString()): Promise<Array<{ file: TFile; data: ErrorCard }>> {
    const cards = await this.listCards({ status: "active" });
    return sortReviewQueue(filterReviewCandidates(cards, today), today);
  }

  async recordReview(file: TFile, card: ErrorCard, result: ReviewResult, now = new Date()): Promise<void> {
    const reviewedDate = todayString(now);
    const reviewCount = card.review_count + 1;
    const nextReview = nextReviewDate(result, reviewCount, now);

    await this.store.updateFrontmatter(file, (frontmatter) => {
      frontmatter.mastery = this.resultToMastery(result);
      frontmatter.review_count = reviewCount;
      frontmatter.last_reviewed = reviewedDate;
      frontmatter.next_review = nextReview;
      frontmatter.review_history = [
        ...(Array.isArray(card.review_history) ? card.review_history : []),
        {
          date: reviewedDate,
          result,
          next_review: nextReview,
        },
      ];
    });
  }

  buildCardBody(card: ErrorCard): string {
    return [
      `# ${card.module}错题`,
      "",
      "## 正面",
      "",
      card.image ? `![[${card.image}]]` : card.body || "在这里补充题干、选项或图片信息。",
      card.masks?.length ? "\n> 正面复习时会遮挡图片中的答案、解析或手写笔记区域。" : "",
      "",
      "## 背面",
      "",
      `- 答案：${card.answer ?? "未填写"}`,
      `- 错因：${card.wrong_reason ?? "未填写"}`,
      `- 掌握度：${this.formatMastery(card.mastery)}`,
      "",
      "## 复盘",
      "",
      "下次复习时补充技巧、惯性和纠偏动作。",
    ].join("\n");
  }

  private validateInput(input: CreateErrorCardInput): void {
    if (!isXingceModule(input.module)) {
      throw new Error("请选择有效的行测模块。");
    }

    if (![0, 1, 2, 3].includes(input.mastery)) {
      throw new Error("请选择有效的初始掌握度。");
    }

    if (input.round !== undefined && (!Number.isInteger(input.round) || input.round <= 0)) {
      throw new Error("轮次必须是正整数。");
    }
  }

  private matchesQuery(card: ErrorCard, query: ErrorCardQuery): boolean {
    return (
      (!query.status || card.status === query.status) &&
      (!query.module || card.module === query.module) &&
      (!query.collectionId || card.collection_id === query.collectionId) &&
      (query.mastery === undefined || card.mastery === query.mastery) &&
      (!query.dueOnOrBefore || card.next_review <= query.dueOnOrBefore)
    );
  }

  private isErrorCard(value: Partial<ErrorCard>): value is ErrorCard {
    return (
      value.type === "gongkao-error-card" &&
      typeof value.error_card_id === "string" &&
      value.subject === "行测" &&
      isXingceModule(value.module) &&
      typeof value.mastery === "number" &&
      typeof value.review_count === "number" &&
      typeof value.created === "string" &&
      typeof value.next_review === "string" &&
      ["active", "suspended", "archived"].includes(String(value.status))
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

  private formatMastery(mastery: Mastery): string {
    const labels: Record<Mastery, string> = {
      0: "不会",
      1: "模糊",
      2: "基本会",
      3: "熟练",
    };

    return labels[mastery];
  }

  private resultToMastery(result: ReviewResult): Mastery {
    const masteryByResult: Record<ReviewResult, Mastery> = {
      again: 0,
      hard: 1,
      good: 2,
      easy: 3,
    };

    return masteryByResult[result];
  }
}

export function sortReviewQueue(
  cards: Array<{ file: TFile; data: ErrorCard }>,
  today = todayString(),
): Array<{ file: TFile; data: ErrorCard }> {
  return [...cards].sort((a, b) => {
    const overdueDelta = daysOverdue(b.data, today) - daysOverdue(a.data, today);
    if (overdueDelta !== 0) return overdueDelta;

    const masteryDelta = a.data.mastery - b.data.mastery;
    if (masteryDelta !== 0) return masteryDelta;

    return a.data.created.localeCompare(b.data.created);
  });
}

export function filterReviewCandidates(
  cards: Array<{ file: TFile; data: ErrorCard }>,
  today = todayString(),
): Array<{ file: TFile; data: ErrorCard }> {
  return cards.filter((entry) => entry.data.next_review <= today || (entry.data.created === today && entry.data.last_reviewed !== today));
}

function daysOverdue(card: ErrorCard, today: string): number {
  return Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${card.next_review}T00:00:00Z`)) / 86400000));
}
