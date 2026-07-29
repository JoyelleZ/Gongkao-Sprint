import type { REVIEW_RESULTS, XINGCE_MODULES } from "./constants";

export type XingceModule = (typeof XINGCE_MODULES)[number];

export type PracticeCollectionType = "topic" | "paper" | "book";

export type PracticeCollectionStatus =
  | "not_started"
  | "active"
  | "first_round_done"
  | "second_round"
  | "paused";

export type Mastery = 0 | 1 | 2 | 3;

export type ReviewResult = (typeof REVIEW_RESULTS)[number];

export interface PracticeCollection {
  type: "gongkao-practice-collection";
  collection_id: string;
  name: string;
  collection_type: PracticeCollectionType;
  subject: "行测";
  module?: XingceModule;
  status: PracticeCollectionStatus;
  current_round: number;
  created: string;
  updated: string;
}

export interface PracticeLog {
  type: "gongkao-practice-log";
  date: string;
  collection_id?: string;
  collection_name?: string;
  collection_type?: PracticeCollectionType;
  module: XingceModule;
  total: number;
  wrong: number;
  duration_minutes?: number;
  round: number;
  source?: string;
  range_label?: string;
  created: string;
}

export interface ImageMask {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface ReviewHistoryEntry {
  date: string;
  result: ReviewResult;
  next_review: string;
}

export interface ErrorCard {
  type: "gongkao-error-card";
  subject: "行测";
  module: XingceModule;
  question_type?: string;
  collection_id?: string;
  collection_name?: string;
  collection_type?: PracticeCollectionType;
  source?: string;
  range_label?: string;
  round?: number;
  answer?: string;
  wrong_reason?: string;
  mastery: Mastery;
  review_count: number;
  created: string;
  last_reviewed?: string;
  next_review: string;
  status: "active" | "suspended" | "archived";
  image?: string;
  masks?: ImageMask[];
  review_history?: ReviewHistoryEntry[];
}

export type ReflectionScope = "daily" | "practice_log" | "error_card" | "collection" | "module";

export type ReflectionType =
  | "技巧沉淀"
  | "思维惯性"
  | "易错提醒"
  | "时间策略"
  | "方法步骤"
  | "其他";

export interface ReflectionLog {
  type: "gongkao-reflection-log";
  reflection_id: string;
  date: string;
  scope: ReflectionScope;
  module?: XingceModule;
  collection_id?: string;
  collection_name?: string;
  error_card_path?: string;
  reflection_type: ReflectionType;
  created: string;
  updated: string;
}

export interface DailyPlan {
  type: "gongkao-daily-plan";
  date: string;
  created: string;
}

export interface EffortDay {
  date: string;
  practiceTotal: number;
  reviewCount: number;
  reflectionCount: number;
  planCompletionRate: number;
  effortScore: number;
}
