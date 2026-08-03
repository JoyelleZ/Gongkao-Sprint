import { Modal, Notice, Platform, Setting } from "obsidian";
import type { App } from "obsidian";
import { XINGCE_MODULES } from "../constants";
import type { ImageMask, Mastery, PracticeCollection, XingceModule } from "../types";
import type { ErrorCardService } from "../services/ErrorCardService";
import type { PracticeCollectionService } from "../services/PracticeCollectionService";
import { getSupportedImageHint, isSupportedImageFile } from "../utils/imageFile";

type ImageFilter = "contrast" | "grayscale";
type ContrastLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface ErrorCardModalServices {
  errorCardService: ErrorCardService;
  collectionService: PracticeCollectionService;
}

export class ErrorCardModal extends Modal {
  private module: XingceModule = "判断推理";
  private questionType = "";
  private selectedCollectionId = "";
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
  private pendingCropStart?: { x: number; y: number };
  private cropDragStart?: { x: number; y: number };
  private cropSelection?: { left: number; top: number; width: number; height: number };
  private cropMode = false;
  private ignoreNextImageClick = false;
  private contrastLevel: ContrastLevel = 2;
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
      text: Platform.isMobile
        ? `可拍照或从相册/文件选择图片。${getSupportedImageHint()} 选图后可旋转、放大裁剪、调对比度或转黑白。`
        : `可选择、拖拽或粘贴图片。${getSupportedImageHint()} 选图后可旋转、放大裁剪、调对比度或转黑白；点击预览图两次可创建矩形遮挡。`,
      cls: "gongkao-empty-text",
    });

    this.renderImagePickers(section);

    if (!Platform.isMobile) {
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
    }

    if (this.imageObjectUrl) {
      this.renderImageEditorControls(section);
    }

    contentEl.onpaste = (event) => {
      const files = event.clipboardData?.files ? Array.from(event.clipboardData.files) : [];
      const image = files.find((file) => isSupportedImageFile(file));
      if (image) {
        this.selectImageFile(image);
      }
    };

    this.renderImagePreview(section);
  }

  private renderImagePickers(parent: HTMLElement): void {
    const pickers = parent.createDiv({ cls: "gongkao-image-pickers" });
    this.createImagePicker(pickers, Platform.isMobile ? "拍照" : "选择图片", Platform.isMobile);
    if (Platform.isMobile) {
      this.createImagePicker(pickers, "相册/文件", false);
    }
  }

  private createImagePicker(parent: HTMLElement, label: string, capture: boolean): void {
    const pickerId = `gongkao-image-picker-${Math.random().toString(36).slice(2)}`;
    const picker = parent.createEl("input", {
      cls: Platform.isMobile ? "gongkao-hidden-file-input" : "gongkao-image-picker",
      attr: {
        id: pickerId,
        type: "file",
        accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
        ...(capture ? { capture: "environment" } : {}),
      },
    });
    picker.addEventListener("change", () => {
      const file = picker.files?.[0];
      if (file) {
        this.selectImageFile(file);
      }
    });
    if (Platform.isMobile) {
      parent.createEl("label", { text: label, cls: "gongkao-file-button", attr: { for: pickerId } });
    }
  }

  private renderImageEditorControls(parent: HTMLElement): void {
    const controls = parent.createDiv({ cls: "gongkao-image-editor" });
    controls
      .createEl("button", { text: "左转", cls: "gongkao-button" })
      .addEventListener("click", () => {
        void this.rotateImage(false);
      });
    controls
      .createEl("button", { text: "右转", cls: "gongkao-button" })
      .addEventListener("click", () => {
        void this.rotateImage(true);
      });
    controls
      .createEl("button", {
        text: "放大裁剪",
        cls: "gongkao-button",
      })
      .addEventListener("click", () => {
        this.openCropEditor();
      });
    controls
      .createEl("button", { text: "黑白", cls: "gongkao-button" })
      .addEventListener("click", () => {
        void this.applyImageFilter("grayscale");
      });

    const contrast = parent.createDiv({ cls: "gongkao-contrast-control" });
    const label = contrast.createEl("label", { text: `对比度 ${this.getContrastLabel()}` });
    const slider = contrast.createEl("input", {
      attr: {
        type: "range",
        min: "0",
        max: "5",
        step: "1",
        value: String(this.contrastLevel),
        "aria-label": "对比度档位",
      },
    });
    slider.addEventListener("input", () => {
      this.contrastLevel = Number(slider.value) as ContrastLevel;
      label.setText(`对比度 ${this.getContrastLabel()}`);
    });
    contrast.createEl("button", { text: "应用", cls: "gongkao-button" }).addEventListener("click", () => {
      void this.applyImageFilter("contrast");
    });
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
      if (this.cropMode) {
        if (this.ignoreNextImageClick) {
          this.ignoreNextImageClick = false;
          return;
        }
        void this.handleCropClick(event, image);
        return;
      }
      this.handleMaskClick(event, image, preview);
    });
    preview.addEventListener("pointerdown", (event) => {
      if (!this.cropMode || event.button !== 0) {
        return;
      }
      event.preventDefault();
      preview.setPointerCapture(event.pointerId);
      this.cropDragStart = this.eventToNaturalPoint(event, image);
      this.cropSelection = { left: 0, top: 0, width: 0, height: 0 };
      this.renderCropSelection(preview, image);
    });
    preview.addEventListener("pointermove", (event) => {
      if (!this.cropMode || !this.cropDragStart) {
        return;
      }
      event.preventDefault();
      this.cropSelection = this.naturalRectToDisplayRect(this.buildNaturalRect(this.cropDragStart, this.eventToNaturalPoint(event, image)), image);
      this.renderCropSelection(preview, image);
    });
    preview.addEventListener("pointerup", (event) => {
      if (!this.cropMode || !this.cropDragStart) {
        return;
      }
      event.preventDefault();
      const rect = this.buildNaturalRect(this.cropDragStart, this.eventToNaturalPoint(event, image));
      this.cropDragStart = undefined;
      this.cropSelection = undefined;
      this.ignoreNextImageClick = true;
      void this.cropImage(image, rect);
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

    this.renderCropSelection(preview, image);
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
    this.pendingCropStart = undefined;
    this.cropDragStart = undefined;
    this.cropSelection = undefined;
    this.cropMode = false;
    this.render();
  }

  private async rotateImage(clockwise: boolean): Promise<void> {
    if (!this.imageObjectUrl) {
      return;
    }

    try {
      const image = await this.loadImage(this.imageObjectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalHeight;
      canvas.height = image.naturalWidth;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("无法创建图片编辑画布。");
      }

      if (clockwise) {
        context.translate(canvas.width, 0);
        context.rotate(Math.PI / 2);
      } else {
        context.translate(0, canvas.height);
        context.rotate(-Math.PI / 2);
      }
      context.drawImage(image, 0, 0);
      await this.replaceImageFromCanvas(canvas, clockwise ? "right" : "left");
      new Notice(clockwise ? "图片已右转。" : "图片已左转。");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "图片旋转失败。");
    }
  }

  private async applyImageFilter(filter: ImageFilter): Promise<void> {
    if (!this.imageObjectUrl) {
      return;
    }

    try {
      const image = await this.loadImage(this.imageObjectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("无法创建图片编辑画布。");
      }

      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        if (filter === "grayscale") {
          const gray = Math.round(data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114);
          data[index] = gray;
          data[index + 1] = gray;
          data[index + 2] = gray;
        } else {
          data[index] = this.applyContrast(data[index]);
          data[index + 1] = this.applyContrast(data[index + 1]);
          data[index + 2] = this.applyContrast(data[index + 2]);
        }
      }
      context.putImageData(imageData, 0, 0);
      await this.replaceImageFromCanvas(canvas, filter);
      new Notice(filter === "grayscale" ? "图片已转为黑白。" : "图片对比度已增强。");
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "图片处理失败。");
    }
  }

  private async handleCropClick(event: MouseEvent, image: HTMLImageElement): Promise<void> {
    if (!this.imageNaturalSize) {
      return;
    }

    const point = this.eventToNaturalPoint(event, image);
    if (!this.pendingCropStart) {
      this.pendingCropStart = point;
      new Notice("已记录裁剪起点，再点击一次确定右下角。");
      this.cropSelection = this.naturalRectToDisplayRect({ x: point.x, y: point.y, width: 1, height: 1 }, image);
      this.renderCropSelection(image.parentElement ?? image, image);
      return;
    }

    const start = this.pendingCropStart;
    const x = Math.max(0, Math.min(start.x, point.x));
    const y = Math.max(0, Math.min(start.y, point.y));
    const width = Math.min(this.imageNaturalSize.width - x, Math.abs(point.x - start.x));
    const height = Math.min(this.imageNaturalSize.height - y, Math.abs(point.y - start.y));
    this.pendingCropStart = undefined;

    if (width < 20 || height < 20) {
      new Notice("裁剪区域太小，请重新选择。");
      return;
    }

    try {
      await this.cropImage(image, { x, y, width, height });
    } catch (error) {
      new Notice(error instanceof Error ? error.message : "图片裁剪失败。");
    }
  }

  private async replaceImageFromCanvas(canvas: HTMLCanvasElement, suffix: string): Promise<void> {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
        } else {
          reject(new Error("图片处理失败。"));
        }
      }, "image/png");
    });

    const baseName = this.imageFile?.name.replace(/\.[^.]+$/u, "") || "gongkao-error-card";
    this.imageFile = new File([blob], `${baseName}-${suffix}.png`, { type: "image/png" });
    if (this.imageObjectUrl) {
      URL.revokeObjectURL(this.imageObjectUrl);
    }
    this.imageObjectUrl = URL.createObjectURL(this.imageFile);
    this.imageNaturalSize = undefined;
    this.masks = [];
    this.pendingMaskStart = undefined;
    this.pendingCropStart = undefined;
    this.cropDragStart = undefined;
    this.cropSelection = undefined;
    this.ignoreNextImageClick = false;
    this.cropMode = false;
    this.render();
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("图片读取失败。"));
      image.src = src;
    });
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

  private async cropImage(image: HTMLImageElement, rect: { x: number; y: number; width: number; height: number }): Promise<void> {
    const x = Math.max(0, Math.round(rect.x));
    const y = Math.max(0, Math.round(rect.y));
    const width = Math.min((this.imageNaturalSize?.width ?? image.naturalWidth) - x, Math.round(rect.width));
    const height = Math.min((this.imageNaturalSize?.height ?? image.naturalHeight) - y, Math.round(rect.height));

    if (width < 20 || height < 20) {
      new Notice("裁剪区域太小，请重新选择。");
      this.render();
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("无法创建图片编辑画布。");
    }

    context.drawImage(image, x, y, width, height, 0, 0, width, height);
    await this.replaceImageFromCanvas(canvas, "crop");
    new Notice("图片已裁剪。");
  }

  private renderCropSelection(preview: HTMLElement, image: HTMLImageElement): void {
    preview.find(".gongkao-image-crop-selection")?.remove();
    if (!this.cropMode || !this.cropSelection) {
      return;
    }

    const rect = this.cropSelection.width > 0 && this.cropSelection.height > 0
      ? this.cropSelection
      : this.pendingCropStart
        ? this.naturalRectToDisplayRect({ x: this.pendingCropStart.x, y: this.pendingCropStart.y, width: 1, height: 1 }, image)
        : undefined;
    if (!rect) {
      return;
    }

    preview.createDiv({
      cls: "gongkao-image-crop-selection",
      attr: { style: `left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;` },
    });
  }

  private buildNaturalRect(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  private naturalRectToDisplayRect(rect: { x: number; y: number; width: number; height: number }, image: HTMLImageElement): { left: number; top: number; width: number; height: number } {
    const naturalWidth = (this.imageNaturalSize?.width ?? image.naturalWidth) || 1;
    const naturalHeight = (this.imageNaturalSize?.height ?? image.naturalHeight) || 1;
    return {
      left: (rect.x / naturalWidth) * 100,
      top: (rect.y / naturalHeight) * 100,
      width: (rect.width / naturalWidth) * 100,
      height: (rect.height / naturalHeight) * 100,
    };
  }

  private applyContrast(value: number): number {
    const factor = this.getContrastFactor();
    return Math.max(0, Math.min(255, Math.round((value - 128) * factor + 128)));
  }

  private getContrastFactor(): number {
    const factors: Record<ContrastLevel, number> = {
      0: 1,
      1: 1.12,
      2: 1.28,
      3: 1.45,
      4: 1.65,
      5: 1.9,
    };
    return factors[this.contrastLevel];
  }

  private getContrastLabel(): string {
    return `${this.contrastLevel} 档`;
  }

  private openCropEditor(): void {
    if (!this.imageObjectUrl) {
      return;
    }

    new ImageCropModal(this.app, this.imageObjectUrl, async (canvas) => {
      await this.replaceImageFromCanvas(canvas, "crop");
    }).open();
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

class ImageCropModal extends Modal {
  private image?: HTMLImageElement;
  private naturalSize?: { width: number; height: number };
  private dragStart?: { x: number; y: number };
  private cropRect?: { x: number; y: number; width: number; height: number };
  private selection?: { left: number; top: number; width: number; height: number };

  constructor(
    app: App,
    private readonly imageSrc: string,
    private readonly onApply: (canvas: HTMLCanvasElement) => Promise<void> | void,
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
    contentEl.addClass("gongkao-crop-modal");
    contentEl.createEl("h2", { text: "放大裁剪" });
    contentEl.createEl("p", { text: "在图片上拖出虚线框，确认后应用裁剪。", cls: "gongkao-empty-text" });

    const stage = contentEl.createDiv({ cls: "gongkao-crop-stage" });
    const image = stage.createEl("img", { attr: { src: this.imageSrc, alt: "裁剪图片" } });
    this.image = image;
    image.addEventListener("load", () => {
      this.naturalSize = { width: image.naturalWidth, height: image.naturalHeight };
    });
    stage.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      stage.setPointerCapture(event.pointerId);
      this.dragStart = this.eventToNaturalPoint(event, image);
      this.cropRect = undefined;
      this.selection = { left: 0, top: 0, width: 0, height: 0 };
      this.renderSelection(stage, image);
    });
    stage.addEventListener("pointermove", (event) => {
      if (!this.dragStart) {
        return;
      }
      event.preventDefault();
      this.cropRect = this.buildNaturalRect(this.dragStart, this.eventToNaturalPoint(event, image));
      this.selection = this.naturalRectToDisplayRect(this.cropRect, image);
      this.renderSelection(stage, image);
    });
    stage.addEventListener("pointerup", (event) => {
      if (!this.dragStart) {
        return;
      }
      event.preventDefault();
      this.cropRect = this.buildNaturalRect(this.dragStart, this.eventToNaturalPoint(event, image));
      this.selection = this.naturalRectToDisplayRect(this.cropRect, image);
      this.dragStart = undefined;
      this.renderSelection(stage, image);
    });

    const actions = contentEl.createDiv({ cls: "gongkao-modal__actions" });
    actions.createEl("button", { text: "取消", cls: "gongkao-button" }).addEventListener("click", () => {
      this.close();
    });
    actions.createEl("button", { text: "应用裁剪", cls: "gongkao-button gongkao-button--primary" }).addEventListener("click", () => {
      void this.applyCrop();
    });
  }

  private async applyCrop(): Promise<void> {
    if (!this.image || !this.cropRect) {
      new Notice("请先拖出裁剪区域。");
      return;
    }

    const x = Math.max(0, Math.round(this.cropRect.x));
    const y = Math.max(0, Math.round(this.cropRect.y));
    const width = Math.min((this.naturalSize?.width ?? this.image.naturalWidth) - x, Math.round(this.cropRect.width));
    const height = Math.min((this.naturalSize?.height ?? this.image.naturalHeight) - y, Math.round(this.cropRect.height));
    if (width < 20 || height < 20) {
      new Notice("裁剪区域太小，请重新选择。");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      new Notice("无法创建图片编辑画布。");
      return;
    }

    context.drawImage(this.image, x, y, width, height, 0, 0, width, height);
    await this.onApply(canvas);
    new Notice("图片已裁剪。");
    this.close();
  }

  private renderSelection(stage: HTMLElement, image: HTMLImageElement): void {
    stage.find(".gongkao-image-crop-selection")?.remove();
    if (!this.selection) {
      return;
    }

    stage.createDiv({
      cls: "gongkao-image-crop-selection",
      attr: {
        style: `left:${this.selection.left}%;top:${this.selection.top}%;width:${this.selection.width}%;height:${this.selection.height}%;`,
      },
    });
    image.addClass("gongkao-crop-stage__image--selecting");
  }

  private eventToNaturalPoint(event: PointerEvent, image: HTMLImageElement): { x: number; y: number } {
    const rect = image.getBoundingClientRect();
    const naturalWidth = this.naturalSize?.width ?? image.naturalWidth;
    const naturalHeight = this.naturalSize?.height ?? image.naturalHeight;
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * naturalWidth),
      y: Math.round(((event.clientY - rect.top) / rect.height) * naturalHeight),
    };
  }

  private buildNaturalRect(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number; width: number; height: number } {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  private naturalRectToDisplayRect(rect: { x: number; y: number; width: number; height: number }, image: HTMLImageElement): { left: number; top: number; width: number; height: number } {
    const naturalWidth = (this.naturalSize?.width ?? image.naturalWidth) || 1;
    const naturalHeight = (this.naturalSize?.height ?? image.naturalHeight) || 1;
    return {
      left: (rect.x / naturalWidth) * 100,
      top: (rect.y / naturalHeight) * 100,
      width: (rect.width / naturalWidth) * 100,
      height: (rect.height / naturalHeight) * 100,
    };
  }
}
