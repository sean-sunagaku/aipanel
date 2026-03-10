import type { ContextBundleData, SessionData } from "../shared/contracts.js";

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function buildSessionTitle(question: string): string {
  const normalized = compact(question);
  return normalized.slice(0, 60) || "Untitled session";
}

export function buildConversationTranscript(session: SessionData): string {
  return session.turns
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n\n");
}

export function buildPromptWithTranscript(input: {
  session: SessionData;
  question: string;
  contextBundle: ContextBundleData;
  modeLabel: string;
}): string {
  const transcript = buildConversationTranscript(input.session);
  const contextSections = [
    input.contextBundle.summary,
    ...(input.contextBundle.files ?? []).map((file) => `File: ${file.path}\n${file.content ?? ""}`),
    ...(input.contextBundle.diffs ?? []).map((diff) => `Diff: ${diff.path}\n${diff.content ?? ""}`),
    ...(input.contextBundle.logs ?? []).map((log) => `Log: ${log.path}\n${log.content ?? ""}`),
  ].filter(Boolean);

  return [
    `Mode: ${input.modeLabel}`,
    transcript ? `Conversation so far:\n${transcript}` : "",
    `New user question:\n${input.question.trim()}`,
    contextSections.length > 0 ? `Context:\n${contextSections.join("\n\n")}` : "",
    "Answer in a concise but useful way. Prefer concrete next steps.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
