import type { XingceModule } from "../types";
import { XINGCE_MODULES } from "../constants";

export function isXingceModule(value: unknown): value is XingceModule {
  return typeof value === "string" && XINGCE_MODULES.includes(value as XingceModule);
}

export function toPositiveInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} 必须是正整数。`);
  }

  return value;
}

export function toNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} 必须是非负整数。`);
  }

  return value;
}

