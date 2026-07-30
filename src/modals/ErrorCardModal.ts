import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { ImageMask, Mastery, PracticeCollection, XingceModule } from "../types";
import type { ErrorCardService } from "../services/ErrorCardService";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";
import { getSupportedImageHint, isSupportedImageFile } from "../utils/imageFile";

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
  private imageFile?: File;
  private imageObjectUrl?: string;
  private imageNaturalSize?: { width: number; height: number };
  private masks: ImageMask[] = [];
  private pendingMaskStart?: { x: number; y: number };
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
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }
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

    new Setting(contentEl).setName("题干 / 笔记").setDesc("没有图片时，用这里保存题干、选项或你的解析摘要。").addTextArea((text) => {
      text.setPlaceholder("可以先粘贴题干、选项、你的手写解析摘要。").setValue(this.body).onChange((value) => {
        this.body = value;
      });
    });

    this.renderImageInput(contentEl);

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
      const image = this.imageFile
        ? await this.services.errorCardService.copyImageAttachment(this.imageFile, `${this.module}-${this.questionType || "错题"}`)
        : undefined;
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
        image,
        masks: this.masks.length > 0 ? this.masks : undefined,
      });

      new Notice("错题卡已保存。");
      await this.onSaved?.();
      this.close();
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "错题卡保存失败。");
    }
  }

  private renderImageInput(contentEl: HTMLElement): void {
    const section = contentEl.createDiv({ cls: "gongkao-image-input" });
    section.createEl("h3", { text: "题目图片" });
    section.createEl("p", {
      text: `可选择、拖拽或粘贴图片。${getSupportedImageHint()} 点击预览图两次可创建矩形遮挡，用来盖住答案、解析或手写笔记。`,
      cls: "gongkao-empty-text",
    });

    const picker = section.createEl("input", {
      attr: {
        type: "file",
        accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
      },
    });
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];
      if (file) {
        this.selectImageFile(file);
      }
    });

    const dropZone = section.createDiv({ cls: "gongkao-image-dropzone" });
    dropZone.createEl("span", { text: "拖拽图片到这里，或直接粘贴截图" });
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.addClass("gongkao-image-dropzone--active");
    });
    dropZone.addEventListener("dragleave", () => {
      dropZone.removeClass("gongkao-image-dropzone--active");
    });
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.removeClass("gongkao-image-dropzone--active");
      const file = event.dataTransfer?.files[0];
      if (file) {
        this.selectImageFile(file);
      }
    });

    contentEl.addEventListener("paste", (event) => {
      const files = event.clipboardData?.files ? Array.from(event.clipboardData.files) : [];
      const image = files.find((file) => isSupportedImageFile(file));
      if (image) {
        this.selectImageFile(image);
      }
    });

    this.renderImagePreview(section);
  }

  private renderImagePreview(parent: HTMLElement): void {
    parent.find(".gongkao-image-preview")?.remove();

    if (!this.imageObjectUrl) {
      return;
    }

    const preview = parent.createDiv({ cls: "gongkao-image-preview" });
    const image = preview.createEl("img", { attr: { src: this.imageObjectUrl, alt: "错题图片预览" } });
    image.addEventListener("load", () => {
      this.imageNaturalSize = { width: image.naturalWidth, height: image.naturalHeight };
    });
    image.addEventListener("click", (event) => {
      this.handleMaskClick(event, image, preview);
    });

    for (const [index, mask] of this.masks.entries()) {
      const rect = this.maskToDisplayRect(mask, image);
      const maskEl = preview.createDiv({ cls: "gongkao-image-mask" });
      maskEl.setAttr("style", `left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;`);
      maskEl.createEl("button", { text: "×", attr: { "aria-label": "删除遮挡" } }).addEventListener("click", (event) => {
        event.stopPropagation();
        this.masks.splice(index, 1);
        this.render();
      });
    }
  }

  private selectImageFile(file: File): void {
    if (!isSupportedImageFile(file)) {
      new Notice(getSupportedImageHint());
      return;
    }

    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }

    this.imageFile = file;
    this.imageObjectUrl = URL.createObjectURL(file);
    this.masks = [];
    this.pendingMaskStart = undefined;
    this.render();
  }

  private handleMaskClick(event: MouseEvent, image: HTMLImageElement, preview: HTMLElement): void {
    if (!this.imageNaturalSize) {
      return;
    }

    const point = this.eventToNaturalPoint(event, image);
    if (!this.pendingMaskStart) {
      this.pendingMaskStart = point;
      new Notice("已记录遮挡起点，再点击一次确定右下角。");
      return;
    }

    const start = this.pendingMaskStart;
    const x = Math.min(start.x, point.x);
    const y = Math.min(start.y, point.y);
    const width = Math.abs(point.x - start.x);
    const height = Math.abs(point.y - start.y);
    this.pendingMaskStart = undefined;

    if (width < 8 || height < 8) {
      new Notice("遮挡区域太小，请重新选择。");
      return;
    }

    this.masks.push({ x, y, width, height, label: "解析" });
    this.renderImagePreview(preview.parentElement ?? preview);
  }

  private eventToNaturalPoint(event: MouseEvent, image: HTMLImageElement): { x: number; y: number } {
    const rect = image.getBoundingClientRect();
    const naturalWidth = this.imageNaturalSize?.width ?? image.naturalWidth;
    const naturalHeight = this.imageNaturalSize?.height ?? image.naturalHeight;

    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * naturalWidth),
      y: Math.round(((event.clientY - rect.top) / rect.height) * naturalHeight),
    };
  }

  private maskToDisplayRect(mask: ImageMask, image: HTMLImageElement): { left: number; top: number; width: number; height: number } {
    const naturalWidth = (this.imageNaturalSize?.width ?? image.naturalWidth) || 1;
    const naturalHeight = (this.imageNaturalSize?.height ?? image.naturalHeight) || 1;

    return {
      left: (mask.x / naturalWidth) * 100,
      top: (mask.y / naturalHeight) * 100,
      width: (mask.width / naturalWidth) * 100,
      height: (mask.height / naturalHeight) * 100,
    };
  }
}
