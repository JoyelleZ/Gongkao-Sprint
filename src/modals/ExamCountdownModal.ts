import { Modal, Notice, Setting, setIcon } from "obsidian";
import type { App } from "obsidian";
import type { ExamCountdown } from "../types";
import type { ExamCountdownService } from "../services/ExamCountdownService";
import { daysBetween, todayString } from "../utils/date";

interface ExamCountdownModalServices {
  examCountdownService: ExamCountdownService;
}

export class ExamCountdownModal extends Modal {
  private name = "";
  private date = "";
  private countdowns: ExamCountdown[] = [];

  constructor(
    app: App,
    private readonly services: ExamCountdownModalServices,
    private readonly onSaved?: () => Promise<void> | void,
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    await this.reload();
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async reload(): Promise<void> {
    this.countdowns = (await this.services.examCountdownService.listCountdowns()).map((entry) => entry.data);
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("gongkao-modal");
    contentEl.createEl("h2", { text: "考试倒计时" });

    new Setting(contentEl).setName("考试名称").setDesc("例如：2027 国考、2026 广东省考。").addText((text) => {
      text.setPlaceholder("2027 国考").setValue(this.name).onChange((value) => {
        this.name = value;
      });
    });

    new Setting(contentEl).setName("目标日期").setDesc("格式为 YYYY-MM-DD。").addText((text) => {
      text.setPlaceholder("2027-11-28").setValue(this.date).onChange((value) => {
        this.date = value;
      });
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions
      .createEl("button", { text: "添加倒计时", cls: "gongkao-button gongkao-button--primary" })
      .addEventListener("click", () => {
        void this.addCountdown();
      });

    const list = contentEl.createDiv({ cls: "gongkao-countdown-list" });
    if (this.countdowns.length === 0) {
      list.createEl("p", { text: "还没有考试倒计时。添加后会显示在工作台的今日任务卡片中。", cls: "gongkao-empty-text" });
      return;
    }

    const today = todayString();
    for (const countdown of this.countdowns) {
      const row = list.createDiv({ cls: "gongkao-countdown-row" });
      const copy = row.createDiv();
      copy.createEl("strong", { text: countdown.name });
      const days = daysBetween(today, countdown.date);
      copy.createEl("small", { text: days >= 0 ? `${countdown.date}｜剩余 ${days} 天` : `${countdown.date}｜已过去` });

      const deleteButton = row.createEl("button", {
        cls: "gongkao-icon-button",
        attr: { "aria-label": `删除 ${countdown.name}` },
      });
      setIcon(deleteButton, "trash-2");
      deleteButton.addEventListener("click", () => {
        void this.deleteCountdown(countdown.countdown_id);
      });
    }
  }

  private async addCountdown(): Promise<void> {
    try {
      await this.services.examCountdownService.createCountdown({ name: this.name, date: this.date });
      this.name = "";
      this.date = "";
      await this.reload();
      await this.onSaved?.();
      this.render();
      new Notice("考试倒计时已添加。");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "考试倒计时添加失败。");
    }
  }

  private async deleteCountdown(countdownId: string): Promise<void> {
    await this.services.examCountdownService.deleteCountdown(countdownId);
    await this.reload();
    await this.onSaved?.();
    this.render();
    new Notice("考试倒计时已删除。");
  }
}
