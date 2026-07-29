import { describe, expect, it } from "vitest";
import { createStableId } from "../src/utils/id";

describe("id utilities", () => {
  it("creates deterministic stable ids when a random suffix is supplied", () => {
    const id = createStableId("PC", new Date("2026-07-29T08:09:10.000Z"), "abc123");
    expect(id).toBe("pc-20260729080910-abc123");
  });

  it("normalizes unsafe prefixes", () => {
    const id = createStableId("Reflection Log", new Date("2026-07-29T08:09:10.000Z"), "xyz789");
    expect(id).toBe("reflection-log-20260729080910-xyz789");
  });
});
