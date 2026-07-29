import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_GONGKAO_DASHBOARD } from "../constants";

export class DashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
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
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  render(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("gongkao-dashboard");

    const header = container.createDiv({ cls: "gongkao-dashboard__header" });
    const titleGroup = header.createDiv();
    titleGroup.createEl("p", { text: "下午好，继续加油呀！", cls: "gongkao-dashboard__eyebrow" });
    titleGroup.createEl("h1", { text: "Gongkao Sprint 工作台" });

    const actions = header.createDiv({ cls: "gongkao-actions" });
    ["新增错题", "新增复盘", "记录刷题", "新建专题/套卷", "生成今日计划", "开始复习"].forEach(
      (label, index) => {
        actions.createEl("button", {
          text: label,
          cls: index === 5 ? "gongkao-button gongkao-button--primary" : "gongkao-button",
        });
      },
    );

    const hero = container.createDiv({ cls: "gongkao-hero" });
    hero.createEl("div", { text: "专注当下，稳步冲刺", cls: "gongkao-hero__title" });
    hero.createEl("p", { text: "每一步都算数，理想终将抵达。", cls: "gongkao-hero__subtitle" });

    const grid = container.createDiv({ cls: "gongkao-dashboard__grid" });
    this.renderPanel(grid, "今日计划与倒计时", ["距考试：未设置", "今日任务：暂无计划", "完成率：0%"]);
    this.renderPanel(grid, "今日复习", ["到期错题：0 张", "逾期提醒：暂无", "最近新增错题：暂无"]);
    this.renderPanel(grid, "当前刷题集合", ["暂无主刷题集合", "累计刷题：0", "累计错题：0"]);
    this.renderPanel(grid, "本周刷题概览", ["本周刷题：0", "本周错题：0", "最近记录：暂无"]);
    this.renderPanel(grid, "最近复盘", ["暂无复盘记录", "记录技巧、惯性和下次纠偏动作。"]);
    this.renderPanel(grid, "薄弱与纠偏提醒", ["暂无足够数据", "完成几次刷题和复盘后，这里会出现提醒。"]);

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
}
