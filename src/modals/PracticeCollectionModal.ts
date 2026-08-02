import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { PracticeCollectionType, XingceModule } from "../types";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";

interface PracticeCollectionModalServices {
  collectionService: PracticeCollectionService;
}

const COLLECTION_TYPES: Array<{ value: PracticeCollectionType; label: string }> = [
  { value: "topic", label: "专题" },
  { value: "paper", label: "套卷" },
  { value: "book", label: "题集" },
];

export class PracticeCollectionModal extends Modal {
  private name = "";
  private collectionType: PracticeCollectionType = "topic";
  private module = "";

  constructor(
    app: App,
    private readonly services: PracticeCollectionModalServices,
    private readonly onSaved?: () => Promise<void> | void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("gongkao-modal");
    contentEl.createEl("h2", { text: "新建刷题集合" });

    new Setting(contentEl).setName("集合名称").setDesc("例如：资料分析高频 300 题、判断推理 500 题、2025 国考套卷。").addText((text) => {
      text.setPlaceholder("资料分析高频 300 题").setValue(this.name).onChange((value) => {
        this.name = value;
      });
    });

    new Setting(contentEl).setName("集合类型").addDropdown((dropdown) => {
      for (const type of COLLECTION_TYPES) {
        dropdown.addOption(type.value, type.label);
      }
      dropdown.setValue(this.collectionType).onChange((value) => {
        this.collectionType = value as PracticeCollectionType;
      });
    });

    new Setting(contentEl).setName("行测模块").setDesc("题集或套卷可不指定模块。").addDropdown((dropdown) => {
      dropdown.addOption("", "不指定模块");
      for (const moduleName of XINGCE_MODULES) {
        dropdown.addOption(moduleName, moduleName);
      }
      dropdown.setValue(this.module).onChange((value) => {
        this.module = value;
      });
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions.createEl("button", { text: "取消", cls: "gongkao-button" }).addEventListener("click", () => {
      this.close();
    });
    actions
      .createEl("button", { text: "保存集合", cls: "gongkao-button gongkao-button--primary" })
      .addEventListener("click", () => {
        void this.save();
      });
  }

  private async save(): Promise<void> {
    try {
      await this.services.collectionService.createCollection({
        name: this.name,
        collectionType: this.collectionType,
        module: this.module ? (this.module as XingceModule) : undefined,
      });

      new Notice("刷题集合已创建。");
      await this.onSaved?.();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "刷题集合创建失败。");
    }
  }
}

