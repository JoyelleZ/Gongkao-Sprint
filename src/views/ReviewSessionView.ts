import { ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_GONGKAO_REVIEW } from "../constants";
import type { ErrorCard, ReviewResult } from "../types";
import type { ErrorCardService } from "../services/ErrorCardService";

interface ReviewQueueEntry {
  file: TFile;
  data: ErrorCard;
}

interface ReviewActions {
  onReviewed: () => Promise<void> | void;
}

export class ReviewSessionView extends ItemView {
  private queue: ReviewQueueEntry[] = [];
  private currentIndex = 0;
  private showBack = false;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly errorCardService: ErrorCardService,
    private readonly actions: ReviewActions,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GONGKAO_REVIEW;
  }

  getDisplayText(): string {
    return "Gongkao Sprint 复习";
  }

  getIcon(): string {
    return "repeat";
  }

  async onOpen(): Promise<void> {
    await this.loadQueue();
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async loadQueue(): Promise<void> {
    this.queue = await this.errorCardService.listReviewCards();
    this.currentIndex = 0;
    this.showBack = false;
  }

  render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("gongkao-review");

    if (this.queue.length === 0) {
      container.createEl("h1", { text: "今日复习完成" });
      container.createEl("p", { text: "没有到期错题了。可以去记录新错题，或者写一条复盘。" });
      return;
    }

    const entry = this.queue[this.currentIndex];
    const card = entry.data;
    const header = container.createDiv({ cls: "gongkao-review__header" });
    header.createEl("span", { text: `${this.currentIndex + 1} / ${this.queue.length}` });
    header.createEl("strong", { text: `${card.module}${card.question_type ? `｜${card.question_type}` : ""}` });

    const surface = container.createDiv({ cls: "gongkao-review-card" });
    surface.createEl("h2", { text: this.showBack ? "背面" : "正面" });

    if (card.image) {
      this.renderImage(surface, card, !this.showBack);
    } else {
      surface.createEl("p", { text: card.body ?? "这张错题没有题干文本。", cls: "gongkao-review-card__body" });
    }

    if (this.showBack) {
      const back = surface.createDiv({ cls: "gongkao-review-back" });
      back.createEl("p", { text: `答案：${card.answer ?? "未填写"}` });
      back.createEl("p", { text: `错因：${card.wrong_reason ?? "未填写"}` });
      back.createEl("p", { text: `下次提醒：复习后写一条纠偏动作，避免同类惯性。` });
      this.renderFeedback(container, entry);
    } else {
      const button = container.createEl("button", { text: "显示背面", cls: "gongkao-button gongkao-button--primary" });
      button.addEventListener("click", () => {
        this.showBack = true;
        this.render();
      });
    }
  }

  private renderImage(parent: HTMLElement, card: ErrorCard, withMasks: boolean): void {
    const wrapper = parent.createDiv({ cls: "gongkao-review-image" });
    const img = wrapper.createEl("img", { attr: { src: this.app.vault.adapter.getResourcePath(card.image ?? ""), alt: "错题图片" } });
    img.addEventListener("load", () => {
      if (!withMasks) return;
      for (const mask of card.masks ?? []) {
        const rect = {
          left: (mask.x / img.naturalWidth) * 100,
          top: (mask.y / img.naturalHeight) * 100,
          width: (mask.width / img.naturalWidth) * 100,
          height: (mask.height / img.naturalHeight) * 100,
        };
        wrapper.createDiv({ cls: "gongkao-review-mask" }).setCssProps({
          "--gongkao-rect-left": `${rect.left}%`,
          "--gongkao-rect-top": `${rect.top}%`,
          "--gongkao-rect-width": `${rect.width}%`,
          "--gongkao-rect-height": `${rect.height}%`,
        });
      }
    });
  }

  private renderFeedback(parent: HTMLElement, entry: ReviewQueueEntry): void {
    const feedback = parent.createDiv({ cls: "gongkao-review-feedback" });
    const options: Array<{ result: ReviewResult; label: string }> = [
      { result: "again", label: "不会" },
      { result: "hard", label: "模糊" },
      { result: "good", label: "基本会" },
      { result: "easy", label: "熟练" },
    ];

    for (const option of options) {
      const button = feedback.createEl("button", { text: option.label, cls: "gongkao-button" });
      button.addEventListener("click", () => {
        void this.record(option.result, entry);
      });
    }
  }

  private async record(result: ReviewResult, entry: ReviewQueueEntry): Promise<void> {
    await this.errorCardService.recordReview(entry.file, entry.data, result);
    new Notice("复习结果已保存。");
    await this.actions.onReviewed();
    await this.loadQueue();
    this.render();
  }
}
