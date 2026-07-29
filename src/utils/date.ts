import type { Mastery, ReviewResult } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayString(now = new Date()): string {
  return formatDate(now);
}

export function initialReviewDate(mastery: Mastery, today = new Date()): string {
  const daysByMastery: Record<Mastery, number> = {
    0: 1,
    1: 3,
    2: 7,
    3: 21,
  };

  return formatDate(addDays(today, daysByMastery[mastery]));
}

export function nextReviewDate(
  result: ReviewResult,
  reviewCount: number,
  today = new Date(),
): string {
  const intervalDays = (() => {
    if (result === "again") return 1;
    if (result === "hard") return 3;
    if (result === "good") return Math.min(14, 7 + reviewCount);
    return Math.min(45, 21 + reviewCount * 3);
  })();

  return formatDate(addDays(today, intervalDays));
}

export function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  return Math.round((endTime - startTime) / DAY_MS);
}
