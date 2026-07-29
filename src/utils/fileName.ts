const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function sanitizeFileName(input: string, fallback = "untitled"): string {
  const cleaned = input
    .trim()
    .replace(UNSAFE_FILENAME_CHARS, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-");

  return cleaned.length > 0 ? cleaned : fallback;
}

export function buildDatedFileName(date: string, label: string, sequence: number, extension = "md"): string {
  const safeLabel = sanitizeFileName(label);
  const safeSequence = String(sequence).padStart(3, "0");
  return `${date}-${safeLabel}-${safeSequence}.${extension}`;
}
