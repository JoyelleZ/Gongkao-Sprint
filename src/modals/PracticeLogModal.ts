import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { PracticeCollection, XingceModule } from "../types";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";
import type { PracticeLogService } from "../services/PracticeLogService";
import { todayString } from "../utils/date";

interface PracticeLogModalServices {
  collectionService: PracticeCollectionService;
  practiceLogService: PracticeLogService;
}

export class PracticeLogModal extends Modal {
  private date = todayString();
  private selectedCollectionId = "";
  private module: XingceModule = "资料分析";
  private total = "";
  private wrong = "";
  private durationMinutes = "";
  private round = "1";
  private source = "";
  private rangeLabel = "";
  private collections: PracticeCollection[] = [];

  constructor(
    app: App,
    private readonly services: PracticeLogModalServices,
    private readonly onSaved?: () => Promise<void> | void,
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.collections = (await this.services.collectionService.listCollections()).map((entry) => entry.data);
    const firstActive = this.collections.find((collection) => collection.status === "active");
    if (firstActive) {
      this.selectedCollectionId = firstActive.collection_id;
      if (firstActive.module) {
        this.module = firstActive.module;
      }
      this.round = String(firstActive.current_round);
    }
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("gongkao-modal");
    contentEl.createEl("h2", { text: "记录刷题" });

    new Setting(contentEl).setName("日期").addText((text) => {
      text.setPlaceholder("YYYY-MM-DD").setValue(this.date).onChange((value) => {
        this.date = value;
      });
    });

    new Setting(contentEl).setName("刷题集合").addDropdown((dropdown) => {
      dropdown.addOption("", "不绑定集合");
      for (const collection of this.collections) {
        dropdown.addOption(collection.collection_id, collection.name);
      }
      dropdown.setValue(this.selectedCollectionId).onChange((value) => {
        this.selectedCollectionId = value;
        const collection = this.findCollection();
        if (collection?.module) {
          this.module = collection.module;
        }
        if (collection?.current_round) {
          this.round = String(collection.current_round);
        }
      });
    });

    new Setting(contentEl).setName("行测模块").addDropdown((dropdown) => {
      for (const moduleName of XINGCE_MODULES) {
        dropdown.addOption(moduleName, moduleName);
      }
      dropdown.setValue(this.module).onChange((value) => {
        this.module = value as XingceModule;
      });
    });

    new Setting(contentEl).setName("刷题数").addText((text) => {
      text.setPlaceholder("30").setValue(this.total).onChange((value) => {
        this.total = value;
      });
    });

    new Setting(contentEl).setName("错题数").addText((text) => {
      text.setPlaceholder("6").setValue(this.wrong).onChange((value) => {
        this.wrong = value;
      });
    });

    new Setting(contentEl).setName("练习时长").setDesc("分钟，可不填。").addText((text) => {
      text.setPlaceholder("40").setValue(this.durationMinutes).onChange((value) => {
        this.durationMinutes = value;
      });
    });

    new Setting(contentEl).setName("轮次").addText((text) => {
      text.setPlaceholder("1").setValue(this.round).onChange((value) => {
        this.round = value;
      });
    });

    new Setting(contentEl).setName("来源").addText((text) => {
      text.setPlaceholder("如 粉笔 5000 题").setValue(this.source).onChange((value) => {
        this.source = value;
      });
    });

    new Setting(contentEl).setName("范围说明").addText((text) => {
      text.setPlaceholder("如 第 2 轮 / 第 35-60 题").setValue(this.rangeLabel).onChange((value) => {
        this.rangeLabel = value;
      });
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions.createEl("button", { text: "取消", cls: "gongkao-button" }).addEventListener("click", () => {
      this.close();
    });
    actions
      .createEl("button", { text: "保存刷题记录", cls: "gongkao-button gongkao-button--primary" })
      .addEventListener("click", () => {
        void this.save();
      });
  }

  private async save(): Promise<void> {
    try {
      const collection = this.findCollection();
      await this.services.practiceLogService.createLog({
        date: this.date.trim() || todayString(),
        collectionId: collection?.collection_id,
        collectionName: collection?.name,
        collectionType: collection?.collection_type,
        module: this.module,
        total: Number(this.total),
        wrong: Number(this.wrong),
        durationMinutes: this.durationMinutes.trim() ? Number(this.durationMinutes) : undefined,
        round: this.round.trim() ? Number(this.round) : undefined,
        source: this.source.trim() || undefined,
        rangeLabel: this.rangeLabel.trim() || undefined,
      });

      new Notice("刷题记录已保存。");
      await this.onSaved?.();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "刷题记录保存失败。");
    }
  }

  private findCollection(): PracticeCollection | undefined {
    return this.collections.find((collection) => collection.collection_id === this.selectedCollectionId);
  }
}

