export const PLUGIN_ID = "gongkao-sprint";
export const PLUGIN_NAME = "Gongkao Sprint";

export const VIEW_TYPE_GONGKAO_DASHBOARD = "gongkao-sprint-dashboard";
export const VIEW_TYPE_GONGKAO_REVIEW = "gongkao-sprint-review";

export const DEFAULT_DATA_ROOT = "Gongkao";
export const DEFAULT_ATTACHMENTS_DIR = "Gongkao/Attachments";

export const GONGKAO_SUBDIRECTORIES = [
  "Plans",
  "Collections",
  "ErrorCards",
  "Reflections",
  "PracticeLogs",
  "Attachments",
] as const;

export const XINGCE_MODULES = [
  "言语理解",
  "判断推理",
  "资料分析",
  "数量关系",
  "常识判断",
] as const;

export const REVIEW_RESULTS = ["again", "hard", "good", "easy"] as const;
