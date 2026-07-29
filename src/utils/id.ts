const DEFAULT_RANDOM_LENGTH = 6;

export function createStableId(prefix: string, date = new Date(), randomPart?: string): string {
  const normalizedPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  const timestamp = date
    .toISOString()
    .replace(/[-:TZ.]/gu, "")
    .slice(0, 14);
  const suffix = randomPart ?? Math.random().toString(36).slice(2, 2 + DEFAULT_RANDOM_LENGTH);

  return `${normalizedPrefix || "id"}-${timestamp}-${suffix}`;
}

