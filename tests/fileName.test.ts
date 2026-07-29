import { describe, expect, it } from "vitest";
import { buildDatedFileName, sanitizeFileName } from "../src/utils/fileName";

describe("file name utilities", () => {
  it("removes unsafe file name characters while preserving Chinese text", () => {
    expect(sanitizeFileName("资料分析/增长率:第1题?")).toBe("资料分析-增长率-第1题-");
  });

  it("uses a fallback for empty names", () => {
    expect(sanitizeFileName("   ", "示例")).toBe("示例");
  });

  it("builds dated file names with padded sequence numbers", () => {
    expect(buildDatedFileName("2026-07-29", "资料分析", 7)).toBe("2026-07-29-资料分析-007.md");
  });
});
