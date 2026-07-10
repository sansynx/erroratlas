const TOKEN_PATTERNS: Array<[RegExp, string]> = [
  [/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----/g, "[redacted-private-key]"],
  [/\b(?:sk|pk|ghp|github_pat|xoxb|xoxp|ea_live|ea_test|npm|cfut)_[A-Za-z0-9_\-=]{12,}\b/g, "[redacted-token]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted-aws-access-key]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[redacted-jwt]"],
  [/\bAuthorization\s*:\s*(?:Bearer|Basic)\s+[^\s,;]+/gi, "Authorization: [redacted]"],
  [/\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "credential=[redacted]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[redacted-hex-secret]"],
  [/[A-Z]:\\Users\\[^\\\s]+/gi, "C:\\Users\\[user]"],
  [/[A-Z]:\\(?:[^\\\r\n\t ]+\\)+[^\\\r\n\t ]+/gi, "C:\\[redacted-path]"],
  [/\/Users\/[^/\s]+/g, "/Users/[user]"],
  [/\/(?:home|workspace)\/[^/\s]+(?:\/[^\s]*)?/g, "/[redacted-path]"],
  [/\/mnt\/[a-z]\/Users\/[^/\s]+(?:\/[^\s]*)?/gi, "/mnt/[redacted-path]"],
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]"],
  [/https?:\/\/[^\s"'<>)]*/gi, "[redacted-url]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[redacted-ip]"]
];

export function redactText(value: unknown): string {
  let input: string;
  try {
    input = typeof value === "string" ? value : JSON.stringify(value ?? "");
  } catch {
    input = "[unserializable-value]";
  }
  return TOKEN_PATTERNS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), input).slice(0, 12000);
}

export function errorSignature(error: string): string {
  return redactText(error)
    .replace(/\b0x[a-f0-9]+\b/gi, "0xADDR")
    .replace(/\b\d{4,}\b/g, "N")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export function titleFromError(error: string): string {
  const firstLine = redactText(error).split(/\r?\n/).find(Boolean) ?? "Untitled incident";
  return firstLine.replace(/\s+/g, " ").trim().slice(0, 96);
}

export function buildPlaybookMarkdown(input: {
  title: string;
  error: string;
  rootCause: string;
  failedAttempts?: string[];
  finalFix: string;
  verification?: string;
  framework?: string;
  language?: string;
  risk?: string;
  confidence?: string;
}): string {
  const failed = input.failedAttempts?.length
    ? input.failedAttempts.slice(0, 20).map((attempt) => `- ${redactText(attempt).slice(0, 2000)}`).join("\n")
    : "- None recorded";

  return [
    `# ${redactText(input.title)}`,
    "",
    "## Error",
    redactText(input.error),
    "",
    "## Root Cause",
    redactText(input.rootCause),
    "",
    "## Fix",
    redactText(input.finalFix),
    "",
    "## Failed Attempts",
    failed,
    "",
    "## Verification",
    redactText(input.verification || "Not recorded"),
    "",
    "## Context",
    `Language: ${redactText(input.language || "unknown")}`,
    `Framework: ${redactText(input.framework || "unknown")}`,
    `Risk: ${redactText(input.risk || "medium")}`,
    `Confidence: ${redactText(input.confidence || "medium")}`
  ].join("\n");
}
