export const PLUGIN_ID = "gongkao-sprint";
export const PLUGIN_NAME = "Gongkao Sprint";

export const VIEW_TYPE_GONGKAO_DASHBOARD = "gongkao-sprint-dashboard";
export const VIEW_TYPE_GONGKAO_REVIEW = "gongkao-sprint-review";

export const DEFAULT_DATA_ROOT = "Gongkao Sprint";
export const DEFAULT_ATTACHMENTS_DIR = "Gongkao Sprint/08_资源库/Attachments";

export const GONGKAO_SUBDIRECTORIES = [
  "01_今日计划",
  "02_刷题记录",
  "03_错题库",
  "04_复习队列",
  "05_专题训练",
  "06_复盘记录",
  "07_学习模板",
  "08_资源库",
] as const;

export const XINGCE_MODULES = [
  "言语理解",
  "判断推理",
  "资料分析",
  "数量关系",
  "常识判断",
] as const;

export const REVIEW_RESULTS = ["again", "hard", "good", "easy"] as const;
