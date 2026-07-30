import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { PracticeCollection, ReflectionScope, ReflectionType, XingceModule } from "../types";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";
import type { ReflectionLogService } from "../services/ReflectionLogService";

interface ReflectionLogModalServices {
  reflectionLogService: ReflectionLogService;
  collectionService: PracticeCollectionService;
}

const REFLECTION_TYPES: ReflectionType[] = ["技巧沉淀", "思维惯性", "易错提醒", "时间策略", "方法步骤", "其他"];
const SCOPES: Array<{ value: ReflectionScope; label: string }> = [
  { value: "daily", label: "当天整体复盘" },
  { value: "module", label: "模块复盘" },
  { value: "collection", label: "集合复盘" },
  { value: "error_card", label: "错题复盘" },
];

export class ReflectionLogModal extends Modal {
  private reflectionScope: ReflectionScope = "daily";
  private module = "";
  private selectedCollectionId = "";
  private reflectionType: ReflectionType = "思维惯性";
  private trigger = "";
  private problem = "";
  private method = "";
  private nextAction = "";
  private collections: PracticeCollection[] = [];

  constructor(
    app: App,
    private readonly services: ReflectionLogModalServices,
    private readonly onSaved?: () => Promise<void> | void,
  ) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.collections = (await this.services.collectionService.listCollections()).map((entry) => entry.data);
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("gongkao-modal");
    contentEl.createEl("h2", { text: "新增复盘记录" });

    new Setting(contentEl).setName("复盘范围").addDropdown((dropdown) => {
      for (const scope of SCOPES) {
        dropdown.addOption(scope.value, scope.label);
      }
      dropdown.setValue(this.reflectionScope).onChange((value) => {
        this.reflectionScope = value as ReflectionScope;
      });
    });

    new Setting(contentEl).setName("复盘类型").addDropdown((dropdown) => {
      for (const type of REFLECTION_TYPES) {
        dropdown.addOption(type, type);
      }
      dropdown.setValue(this.reflectionType).onChange((value) => {
        this.reflectionType = value as ReflectionType;
      });
    });

    new Setting(contentEl).setName("行测模块").addDropdown((dropdown) => {
      dropdown.addOption("", "不指定模块");
      for (const moduleName of XINGCE_MODULES) {
        dropdown.addOption(moduleName, moduleName);
      }
      dropdown.setValue(this.module).onChange((value) => {
        this.module = value;
      });
    });

    new Setting(contentEl).setName("刷题集合").addDropdown((dropdown) => {
      dropdown.addOption("", "不绑定集合");
      for (const collection of this.collections) {
        dropdown.addOption(collection.collection_id, collection.name);
      }
      dropdown.setValue(this.selectedCollectionId).onChange((value) => {
        this.selectedCollectionId = value;
      });
    });

    this.addTextArea("触发场景", "这次复盘来自哪道题、哪次练习、哪种状态？", (value) => {
      this.trigger = value;
    });
    this.addTextArea("我的问题", "具体卡在哪里？审题、方法、速度、惯性还是计算？", (value) => {
      this.problem = value;
    });
    this.addTextArea("技巧 / 方法", "沉淀一个下次能复用的判断步骤。", (value) => {
      this.method = value;
    });
    this.addTextArea("下次纠偏动作", "写成一个下一次能立刻执行的小动作。", (value) => {
      this.nextAction = value;
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions.createEl("button", { text: "取消", cls: "gongkao-button" }).addEventListener("click", () => {
      this.close();
    });
    actions
      .createEl("button", { text: "保存复盘记录", cls: "gongkao-button gongkao-button--primary" })
      .addEventListener("click", () => {
        void this.save();
      });
  }

  private addTextArea(name: string, placeholder: string, onChange: (value: string) => void): void {
    new Setting(this.contentEl).setName(name).addTextArea((text) => {
      text.setPlaceholder(placeholder).onChange(onChange);
    });
  }

  private async save(): Promise<void> {
    try {
      const collection = this.collections.find((entry) => entry.collection_id === this.selectedCollectionId);
      await this.services.reflectionLogService.createLog({
        scope: this.reflectionScope,
        module: this.module ? (this.module as XingceModule) : undefined,
        collectionId: collection?.collection_id,
        collectionName: collection?.name,
        collectionType: collection?.collection_type,
        reflectionType: this.reflectionType,
        trigger: this.trigger,
        problem: this.problem,
        method: this.method,
        nextAction: this.nextAction,
      });

      new Notice("复盘记录已保存。");
      await this.onSaved?.();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "复盘记录保存失败。");
    }
  }
}
