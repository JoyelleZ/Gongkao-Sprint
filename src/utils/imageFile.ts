const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export function isSupportedImageFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number]) ||
    SUPPORTED_IMAGE_EXTENSIONS.includes(extension as (typeof SUPPORTED_IMAGE_EXTENSIONS)[number])
  );
}

export function getSupportedImageHint(): string {
  return "仅支持 jpg、jpeg、png、webp 图片。";
}

