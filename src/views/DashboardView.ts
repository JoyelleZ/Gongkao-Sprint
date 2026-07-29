import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "../constants";
import type { GongkaoSprintSettings } from "../settings";
import type { DashboardCollectionSummary, DashboardModel, DashboardService } from "../services/DashboardService";
import { daysBetween, todayString } from "../utils/date";

export class DashboardView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly dashboardService: DashboardService,
    private readonly getSettings: () => GongkaoSprintSettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_GONGKAO_DASHBOARD;
  }

  getDisplayText(): string {
    return "Gongkao Sprint 工作台";
  }

  getIcon(): string {
    return "sprout";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  async render(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("gongkao-dashboard");
    const model = await this.dashboardService.loadModel();

    const header = container.createDiv({ cls: "gongkao-dashboard__header" });
    const titleGroup = header.createDiv();
    titleGroup.createEl("p", { text: "下午好，继续加油呀！", cls: "gongkao-dashboard__eyebrow" });
    titleGroup.createEl("h1", { text: "Gongkao Sprint 工作台" });

    const actions = header.createDiv({ cls: "gongkao-actions" });
    ["新增错题", "新增复盘", "记录刷题", "新建专题/套卷", "生成今日计划", "开始复习"].forEach(
      (label, index) => {
        const button = actions.createEl("button", {
          text: label,
          cls: index === 5 ? "gongkao-button gongkao-button--primary" : "gongkao-button",
        });
        button.addEventListener("click", () => {
          new Notice(`${label} 功能将在后续步骤接入。`);
        });
      },
    );

    const hero = container.createDiv({ cls: "gongkao-hero" });
    hero.createEl("div", { text: "专注当下，稳步冲刺", cls: "gongkao-hero__title" });
    hero.createEl("p", { text: "每一步都算数，理想终将抵达。", cls: "gongkao-hero__subtitle" });

    const grid = container.createDiv({ cls: "gongkao-dashboard__grid" });
    this.renderPanel(grid, "今日计划与倒计时", [
      this.getExamCountdownLine(),
      "今日任务：暂无计划",
      "完成率：0%",
    ]);
    this.renderPanel(grid, "今日复习", ["到期错题：0 张", "逾期提醒：暂无", "最近新增错题：暂无"]);
    this.renderCollectionPanel(grid, model.collections);
    this.renderWeekPanel(grid, model);
    this.renderPanel(grid, "最近复盘", ["暂无复盘记录", "记录技巧、惯性和下次纠偏动作。"]);
    this.renderWeaknessPanel(grid, model);

    if (!model.hasAnyData) {
      this.renderEmptyState(container);
    }

    const heatmap = container.createDiv({ cls: "gongkao-panel gongkao-panel--wide" });
    heatmap.createEl("h2", { text: "备考努力热力图" });
    const cells = heatmap.createDiv({ cls: "gongkao-heatmap" });
    for (let index = 0; index < 90; index += 1) {
      cells.createDiv({ cls: `gongkao-heatmap__cell gongkao-heatmap__cell--${index % 5}` });
    }
  }

  private renderPanel(parent: HTMLElement, title: string, lines: string[]): void {
    const panel = parent.createDiv({ cls: "gongkao-panel" });
    panel.createEl("h2", { text: title });
    const list = panel.createEl("ul");
    for (const line of lines) {
      list.createEl("li", { text: line });
    }
  }

  private renderCollectionPanel(parent: HTMLElement, collections: DashboardCollectionSummary[]): void {
    const panel = parent.createDiv({ cls: "gongkao-panel" });
    panel.createEl("h2", { text: "当前刷题集合" });

    if (collections.length === 0) {
      panel.createEl("p", {
        text: "暂无刷题集合。先建一个专题、套卷或题集，再开始记录练习。",
        cls: "gongkao-empty-text",
      });
      return;
    }

    const list = panel.createDiv({ cls: "gongkao-collection-list" });
    for (const summary of collections.slice(0, 5)) {
      const isDone = summary.collection.status === "first_round_done";
      const item = list.createDiv({
        cls: isDone ? "gongkao-collection gongkao-collection--done" : "gongkao-collection",
      });
      const header = item.createDiv({ cls: "gongkao-collection__header" });
      header.createEl("strong", { text: summary.collection.name });
      header.createEl("span", { text: this.formatCollectionType(summary.collection.collection_type) });
      item.createEl("p", {
        text: `第 ${summary.collection.current_round} 轮｜累计刷题 ${summary.total}｜错题 ${summary.wrong}`,
      });
      item.createEl("p", {
        text: `最近刷题：${summary.lastPracticeDate ?? "暂无记录"}`,
      });
    }
  }

  private renderWeekPanel(parent: HTMLElement, model: DashboardModel): void {
    const recent = model.week.recentLogs.map((log) => `${log.date} ${log.module} ${log.total} 题 / 错 ${log.wrong}`);
    this.renderPanel(parent, "本周刷题概览", [
      `本周刷题：${model.week.total}`,
      `本周错题：${model.week.wrong}`,
      ...(recent.length > 0 ? recent : ["最近记录：暂无"]),
    ]);
  }

  private renderWeaknessPanel(parent: HTMLElement, model: DashboardModel): void {
    const weakest = model.modules[0];
    if (!weakest) {
      this.renderPanel(parent, "薄弱与纠偏提醒", ["暂无足够数据", "完成几次刷题和复盘后，这里会出现提醒。"]);
      return;
    }

    this.renderPanel(parent, "薄弱与纠偏提醒", [
      `当前高错率模块：${weakest.module}`,
      `累计错题：${weakest.wrong} / ${weakest.total}`,
      "建议：下一次复盘记录具体错因与纠偏动作。",
    ]);
  }

  private renderEmptyState(parent: HTMLElement): void {
    const empty = parent.createDiv({ cls: "gongkao-empty-state" });
    empty.createEl("h2", { text: "从第一个刷题集合开始" });
    empty.createEl("p", { text: "全新 Vault 不会自动生成示例数据。你可以先创建集合，再记录一次刷题。" });
    const actions = empty.createDiv({ cls: "gongkao-empty-actions" });

    ["创建第一个刷题集合", "记录一次刷题", "新增错题卡", "新增复盘记录", "一键创建示例数据"].forEach((label) => {
      const button = actions.createEl("button", { text: label, cls: "gongkao-button" });
      button.addEventListener("click", () => {
        new Notice(`${label} 功能将在后续步骤接入。`);
      });
    });
  }

  private getExamCountdownLine(): string {
    const examDate = this.getSettings().examDate;
    if (!examDate) {
      return "距考试：未设置";
    }

    const days = daysBetween(todayString(), examDate);
    return days >= 0 ? `距考试：${days} 天` : "考试日期已过去";
  }

  private formatCollectionType(type: DashboardCollectionSummary["collection"]["collection_type"]): string {
    const labels = {
      topic: "专题",
      paper: "套卷",
      book: "题集",
    };

    return labels[type];
  }
}
