import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { Mastery, PracticeCollection, XingceModule } from "../types";
import type { ErrorCardService } from "../services/ErrorCardService";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";

interface ErrorCardModalServices {
  errorCardService: ErrorCardService;
  collectionService: PracticeCollectionService;
}

export class ErrorCardModal extends Modal {
  private module: XingceModule = "判断推理";
  private questionType = "";
  private selectedCollectionId = "";
  private source = "";
  private rangeLabel = "";
  private round = "1";
  private answer = "";
  private wrongReason = "";
  private mastery: Mastery = 1;
  private body = "";
  private collections: Array<{ filePath: string; data: PracticeCollection }> = [];

  constructor(
    app: App,
    private readonly services: ErrorCardModalServices,
    private readonly onSaved?: () => Promise<void> | void,
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.collections = (await this.services.collectionService.listCollections()).map(({ file, data }) => ({
      filePath: file.path,
      data,
    }));
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("gongkao-modal");
    contentEl.createEl("h2", { text: "新增错题卡" });

    new Setting(contentEl).setName("行测模块").addDropdown((dropdown) => {
      for (const moduleName of XINGCE_MODULES) {
        dropdown.addOption(moduleName, moduleName);
      }
      dropdown.setValue(this.module).onChange((value) => {
        this.module = value as XingceModule;
      });
    });

    new Setting(contentEl).setName("题型").setDesc("例如：增长率、图形推理、逻辑填空。").addText((text) => {
      text.setValue(this.questionType).onChange((value) => {
        this.questionType = value;
      });
    });

    new Setting(contentEl).setName("刷题集合").setDesc("可不绑定，作为独立错题进入复习队列。").addDropdown((dropdown) => {
      dropdown.addOption("", "不绑定集合");
      for (const collection of this.collections) {
        dropdown.addOption(collection.data.collection_id, collection.data.name);
      }
      dropdown.setValue(this.selectedCollectionId).onChange((value) => {
        this.selectedCollectionId = value;
      });
    });

    new Setting(contentEl).setName("来源").addText((text) => {
      text.setPlaceholder("如 粉笔 5000 题").setValue(this.source).onChange((value) => {
        this.source = value;
      });
    });

    new Setting(contentEl).setName("范围说明").addText((text) => {
      text.setPlaceholder("如 第 2 轮 / 第 35-40 题").setValue(this.rangeLabel).onChange((value) => {
        this.rangeLabel = value;
      });
    });

    new Setting(contentEl).setName("轮次").addText((text) => {
      text.setPlaceholder("1").setValue(this.round).onChange((value) => {
        this.round = value;
      });
    });

    new Setting(contentEl).setName("答案").addText((text) => {
      text.setValue(this.answer).onChange((value) => {
        this.answer = value;
      });
    });

    new Setting(contentEl).setName("错因").addTextArea((text) => {
      text.setPlaceholder("错在哪里？是公式、审题、速度，还是思维惯性？").setValue(this.wrongReason).onChange((value) => {
        this.wrongReason = value;
      });
    });

    new Setting(contentEl).setName("初始掌握度").addDropdown((dropdown) => {
      dropdown
        .addOption("0", "不会")
        .addOption("1", "模糊")
        .addOption("2", "基本会")
        .addOption("3", "熟练")
        .setValue(String(this.mastery))
        .onChange((value) => {
          this.mastery = Number(value) as Mastery;
        });
    });

    new Setting(contentEl).setName("题干 / 笔记").setDesc("图片录入和遮挡会在后续步骤接入。").addTextArea((text) => {
      text.setPlaceholder("可以先粘贴题干、选项、你的手写解析摘要。").setValue(this.body).onChange((value) => {
        this.body = value;
      });
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions.createEl("button", { text: "取消", cls: "gongkao-button" }).addEventListener("click", () => {
      this.close();
    });
    actions
      .createEl("button", { text: "保存错题卡", cls: "gongkao-button gongkao-button--primary" })
      .addEventListener("click", () => {
        void this.save();
      });
  }

  private async save(): Promise<void> {
    try {
      const collection = this.collections.find((entry) => entry.data.collection_id === this.selectedCollectionId)?.data;
      const round = this.round.trim() ? Number(this.round) : undefined;
      await this.services.errorCardService.createCard({
        module: this.module,
        questionType: this.questionType,
        collectionId: collection?.collection_id,
        collectionName: collection?.name,
        collectionType: collection?.collection_type,
        source: this.source,
        rangeLabel: this.rangeLabel,
        round,
        answer: this.answer,
        wrongReason: this.wrongReason,
        mastery: this.mastery,
        body: this.body,
      });

      new Notice("错题卡已保存。");
      await this.onSaved?.();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "错题卡保存失败。");
    }
  }
}

