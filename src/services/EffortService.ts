import type { EffortDay, ErrorCard, PracticeLog, ReflectionLog } from "../types";
import { addDays, formatDate } from "../utils/date";

export interface HeatmapDay extends EffortDay {
  level: 0 | 1 | 2 | 3 | 4;
  tooltip: string;
}

export function buildEffortHeatmap(
  logs: PracticeLog[],
  cards: ErrorCard[],
  reflections: ReflectionLog[],
  endDate: string,
  days = 90,
): HeatmapDay[] {
  const dates = buildDateRange(endDate, days);
  const practiceByDate = groupPracticeByDate(logs);
  const reviewByDate = groupReviewsByDate(cards);
  const reflectionsByDate = groupReflectionsByDate(reflections);

  return dates.map((date) => {
    const practiceTotal = practiceByDate.get(date) ?? 0;
    const reviewCount = reviewByDate.get(date) ?? 0;
    const reflectionCount = reflectionsByDate.get(date) ?? 0;
    const planCompletionRate = 0;
    const effortScore = calculateEffortScore(practiceTotal, reviewCount, reflectionCount, planCompletionRate);

    return {
      date,
      practiceTotal,
      reviewCount,
      reflectionCount,
      planCompletionRate,
      effortScore,
      level: toHeatmapLevel(effortScore),
      tooltip: `${date}｜刷题 ${practiceTotal}｜复习 ${reviewCount}｜复盘 ${reflectionCount}｜计划 0%`,
    };
  });
}

export function calculateEffortScore(
  practiceTotal: number,
  reviewCount: number,
  reflectionCount: number,
  planCompletionRate: number,
): number {
  const practiceScore = Math.min(60, practiceTotal);
  const reviewScore = Math.min(24, reviewCount * 4);
  const reflectionScore = Math.min(16, reflectionCount * 8);
  const planScore = Math.round(Math.max(0, Math.min(1, planCompletionRate)) * 20);

  return practiceScore + reviewScore + reflectionScore + planScore;
}

export function toHeatmapLevel(score: number): HeatmapDay["level"] {
  if (score <= 0) return 0;
  if (score < 20) return 1;
  if (score < 45) return 2;
  if (score < 80) return 3;
  return 4;
}

function buildDateRange(endDate: string, days: number): string[] {
  const end = new Date(`${endDate}T00:00:00`);
  const start = addDays(end, -(days - 1));
  const result: string[] = [];

  for (let index = 0; index < days; index += 1) {
    result.push(formatDate(addDays(start, index)));
  }

  return result;
}

function groupPracticeByDate(logs: PracticeLog[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const log of logs) {
    grouped.set(log.date, (grouped.get(log.date) ?? 0) + log.total);
  }

  return grouped;
}

function groupReviewsByDate(cards: ErrorCard[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const card of cards) {
    for (const history of card.review_history ?? []) {
      grouped.set(history.date, (grouped.get(history.date) ?? 0) + 1);
    }
  }

  return grouped;
}

function groupReflectionsByDate(reflections: ReflectionLog[]): Map<string, number> {
  const grouped = new Map<string, number>();

  for (const reflection of reflections) {
    grouped.set(reflection.date, (grouped.get(reflection.date) ?? 0) + 1);
  }

  return grouped;
}

