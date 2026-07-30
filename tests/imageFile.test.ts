import { describe, expect, it } from "vitest";
import { getSupportedImageHint, isSupportedImageFile } from "../src/utils/imageFile";

describe("image file utilities", () => {
  it("accepts supported image mime types and extensions", () => {
    expect(isSupportedImageFile(new File([""], "question.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isSupportedImageFile(new File([""], "question.webp", { type: "" }))).toBe(true);
  });

  it("rejects unsupported files", () => {
    expect(isSupportedImageFile(new File([""], "question.gif", { type: "image/gif" }))).toBe(false);
    expect(isSupportedImageFile(new File([""], "question.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("provides a user-facing hint", () => {
    expect(getSupportedImageHint()).toContain("jpg");
  });
});
