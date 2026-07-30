import { describe, expect, it } from "vitest";
import { ErrorCardService, sortReviewQueue } from "../src/services/ErrorCardService";
import type { ErrorCard } from "../src/types";

describe("ErrorCardService", () => {
  it("creates text error cards and schedules initial review by mastery", async () => {
    let capturedCard: ErrorCard | undefined;
    let capturedBody = "";

    const service = new ErrorCardService({
      getSubdirectoryPath: () => "Gongkao Sprint/03_错题库",
      getAvailableMarkdownPath: async () => "Gongkao Sprint/03_错题库/2026-07-30-资料分析-增长率.md",
      createMarkdownFile: async (_path: string, frontmatter: ErrorCard, body: string) => {
        capturedCard = frontmatter;
        capturedBody = body;
        return { path: _path } as never;
      },
    } as never);

    await service.createCard(
      {
        module: "资料分析",
        questionType: "增长率",
        collectionId: "pc-1",
        collectionName: "资料分析高频 300 题",
        collectionType: "topic",
        answer: "B",
        wrongReason: "把现期和基期看反了",
        mastery: 1,
        body: "题干文字",
      },
      new Date("2026-07-30T10:00:00"),
    );

    expect(capturedCard?.type).toBe("gongkao-error-card");
    expect(capturedCard?.error_card_id).toMatch(/^ec-\d{14}-[a-z0-9]+$/u);
    expect(capturedCard?.collection_id).toBe("pc-1");
    expect(capturedCard?.next_review).toBe("2026-08-02");
    expect(capturedBody).toContain("## 正面");
    expect(capturedBody).toContain("## 背面");
  });

  it("allows unbound independent error cards", async () => {
    let capturedCard: ErrorCard | undefined;

    const service = new ErrorCardService({
      getSubdirectoryPath: () => "Gongkao Sprint/03_错题库",
      getAvailableMarkdownPath: async () => "Gongkao Sprint/03_错题库/2026-07-30-判断推理-错题.md",
      createMarkdownFile: async (_path: string, frontmatter: ErrorCard) => {
        capturedCard = frontmatter;
        return { path: _path } as never;
      },
    } as never);

    await service.createCard(
      {
        module: "判断推理",
        mastery: 0,
        body: "一道独立错题",
      },
      new Date("2026-07-30T10:00:00"),
    );

    expect(capturedCard?.collection_id).toBeUndefined();
    expect(capturedCard?.status).toBe("active");
    expect(capturedCard?.next_review).toBe("2026-07-31");
  });

  it("schedules all initial mastery levels", async () => {
    const scheduledDates: string[] = [];
    const service = new ErrorCardService({
      getSubdirectoryPath: () => "Gongkao Sprint/03_错题库",
      getAvailableMarkdownPath: async () => "Gongkao Sprint/03_错题库/card.md",
      createMarkdownFile: async (_path: string, frontmatter: ErrorCard) => {
        scheduledDates.push(frontmatter.next_review);
        return { path: _path } as never;
      },
    } as never);

    for (const mastery of [0, 1, 2, 3] as const) {
      await service.createCard(
        {
          module: "言语理解",
          mastery,
          body: "题干",
        },
        new Date("2026-07-30T10:00:00"),
      );
    }

    expect(scheduledDates).toEqual(["2026-07-31", "2026-08-02", "2026-08-06", "2026-08-20"]);
  });

  it("stores image paths and masks in frontmatter", async () => {
    let capturedCard: ErrorCard | undefined;
    let capturedBody = "";
    const service = new ErrorCardService({
      getSubdirectoryPath: () => "Gongkao Sprint/03_错题库",
      getAvailableMarkdownPath: async () => "Gongkao Sprint/03_错题库/image-card.md",
      createMarkdownFile: async (_path: string, frontmatter: ErrorCard, body: string) => {
        capturedCard = frontmatter;
        capturedBody = body;
        return { path: _path } as never;
      },
    } as never);

    await service.createCard(
      {
        module: "资料分析",
        mastery: 2,
        image: "Gongkao Sprint/08_资源库/Attachments/question.png",
        masks: [{ x: 10, y: 20, width: 120, height: 80, label: "解析" }],
      },
      new Date("2026-07-30T10:00:00"),
    );

    expect(capturedCard?.image).toBe("Gongkao Sprint/08_资源库/Attachments/question.png");
    expect(capturedCard?.masks).toEqual([{ x: 10, y: 20, width: 120, height: 80, label: "解析" }]);
    expect(capturedBody).toContain("![[Gongkao Sprint/08_资源库/Attachments/question.png]]");
    expect(capturedBody).toContain("正面复习时会遮挡");
  });

  it("sorts review queue by overdue days, mastery, and created date", () => {
    const cards = [
      {
        file: { path: "newer.md" } as never,
        data: {
          type: "gongkao-error-card",
          error_card_id: "ec-newer",
          subject: "行测",
          module: "资料分析",
          mastery: 0,
          review_count: 0,
          created: "2026-07-29",
          next_review: "2026-07-30",
          status: "active",
        } satisfies ErrorCard,
      },
      {
        file: { path: "older.md" } as never,
        data: {
          type: "gongkao-error-card",
          error_card_id: "ec-older",
          subject: "行测",
          module: "资料分析",
          mastery: 0,
          review_count: 0,
          created: "2026-07-28",
          next_review: "2026-07-30",
          status: "active",
        } satisfies ErrorCard,
      },
      {
        file: { path: "overdue.md" } as never,
        data: {
          type: "gongkao-error-card",
          error_card_id: "ec-overdue",
          subject: "行测",
          module: "判断推理",
          mastery: 3,
          review_count: 0,
          created: "2026-07-29",
          next_review: "2026-07-27",
          status: "active",
        } satisfies ErrorCard,
      },
    ];

    const queue = sortReviewQueue(cards, "2026-07-30");

    expect(queue.map((entry) => entry.data.error_card_id)).toEqual(["ec-overdue", "ec-older", "ec-newer"]);
  });

  it("records review feedback and appends history", async () => {
    let updated: Record<string, unknown> = {};
    const service = new ErrorCardService({
      updateFrontmatter: async (_file: unknown, updater: (frontmatter: Record<string, unknown>) => void) => {
        updated = {};
        updater(updated);
      },
    } as never);
    const card: ErrorCard = {
      type: "gongkao-error-card",
      error_card_id: "ec-1",
      subject: "行测",
      module: "判断推理",
      mastery: 1,
      review_count: 2,
      created: "2026-07-20",
      next_review: "2026-07-30",
      status: "active",
      review_history: [{ date: "2026-07-25", result: "hard", next_review: "2026-07-30" }],
    };

    await service.recordReview({ path: "card.md" } as never, card, "good", new Date("2026-07-30T10:00:00"));

    expect(updated.mastery).toBe(2);
    expect(updated.review_count).toBe(3);
    expect(updated.last_reviewed).toBe("2026-07-30");
    expect(updated.next_review).toBe("2026-08-09");
    expect(updated.review_history).toHaveLength(2);
  });
});
