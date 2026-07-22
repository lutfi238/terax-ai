export type CommitLanguage = string;

export const COMMIT_LANGUAGES = [
  "Auto",
  "English",
  "Bahasa Indonesia",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Japanese",
  "Korean",
  "Chinese",
  "Russian",
  "Arabic",
  "Hindi",
] as const;

export const CUSTOM_COMMIT_LANGUAGE = "__custom__";
export type CommitFileSummary = {
  statusCode: string;
  path: string;
  originalPath: string | null;
};

const CONVENTIONAL_PREFIX =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?: .+/;

function stagedFilesSummary(entries: readonly CommitFileSummary[]): string {
  return entries
    .map((entry) =>
      entry.originalPath
        ? `- R ${entry.originalPath} -> ${entry.path}`
        : `- ${entry.statusCode} ${entry.path}`,
    )
    .join("\n");
}

export function cleanCommitMessage(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  if (fence) text = fence[1].trim();
  return text.replace(/^["'`]+|["'`]+$/g, "").trim();
}

export function isValidCommitMessage(message: string): boolean {
  const lines = message.split(/\r?\n/);
  if (!CONVENTIONAL_PREFIX.test(lines[0]?.trim() ?? "")) return false;
  if (lines[1]?.trim() !== "") return false;
  const bullets = lines.slice(2).filter((line) => /^-\s+\S/.test(line.trim()));
  return bullets.length >= 2 && bullets.length <= 5;
}

export function buildCommitMessagePrompt(
  entries: readonly CommitFileSummary[],
  diffText: string,
  truncated: boolean,
  language: CommitLanguage,
  recentSubjects: readonly string[],
): string {
  const languageInstruction =
    language === "Auto"
      ? recentSubjects.length > 0
        ? "Detect and follow the dominant natural language used by the recent commit subjects below. If they are mixed or unclear, use English."
        : "No recent commit subjects are available, so write the subject and body in English."
      : `Write the subject and body in ${language}.`;

  return [
    "Generate one detailed commit message for the staged changes only.",
    "Format the first line as: type(scope): subject",
    "Keep Conventional Commit types in English: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.",
    languageInstruction,
    "After the subject, add one blank line followed by 2 to 5 bullet points.",
    "Each bullet must describe a concrete important change or reason visible in the staged diff.",
    "Do not add markdown fences, headings, explanations, or claims not supported by the diff.",
    truncated
      ? "The diff below was truncated; infer from the visible staged changes only."
      : "The full staged diff is included below.",
    "",
    "Recent commit subjects:",
    recentSubjects.length > 0
      ? recentSubjects.map((subject) => `- ${subject}`).join("\n")
      : "(None)",
    "",
    "Staged files:",
    stagedFilesSummary(entries),
    "",
    "Staged diff:",
    diffText || "(No textual diff available.)",
  ].join("\n");
}

export function buildRepairCommitMessagePrompt(
  invalidMessage: string,
  entries: readonly CommitFileSummary[],
  language: CommitLanguage,
  recentSubjects: readonly string[],
  diffText: string,
  truncated: boolean,
): string {
  return [
    "Repair the invalid commit message below.",
    "Return a Conventional Commit subject, one blank line, and 2 to 5 concrete bullet points.",
    language === "Auto"
      ? "Follow the dominant language of the recent subjects, or English if unclear."
      : `Write the subject and bullet body in ${language}.`,
    "Keep the Conventional Commit type in English.",
    "Every bullet must be supported by the staged diff. Do not invent details.",
    truncated
      ? "The diff below was truncated; infer from the visible staged changes only."
      : "The full staged diff is included below.",
    "",
    "Invalid message:",
    invalidMessage || "(empty)",
    "",
    "Recent commit subjects:",
    recentSubjects.length > 0
      ? recentSubjects.map((subject) => `- ${subject}`).join("\n")
      : "(None)",
    "",
    "Staged files:",
    stagedFilesSummary(entries),
    "",
    "Staged diff:",
    diffText || "(No textual diff available.)",
  ].join("\n");
}
