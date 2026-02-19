"use client";

import TaskProposalCard, { type TaskProposal } from "./TaskProposalCard";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "proposal"; data: TaskProposal };

/**
 * If the content contains a JSON object with a final_answer or answer field,
 * extract that field value. This handles cases where the server-side
 * parsing didn't properly unwrap the AI response.
 */
function unwrapJsonAnswer(content: string): string {
  const trimmed = content.trim();

  // Strategy 1: Direct JSON parse (content is pure JSON)
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      if (typeof parsed.final_answer === "string") return parsed.final_answer;
      if (typeof parsed.answer === "string") return parsed.answer;
    }
  } catch {
    // Not pure JSON — try embedded extraction
  }

  // Strategy 2: Find embedded JSON object with final_answer/answer
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      if (typeof parsed === "object" && parsed !== null) {
        if (typeof parsed.final_answer === "string") return parsed.final_answer;
        if (typeof parsed.answer === "string") return parsed.answer;
      }
    } catch {
      // Embedded JSON didn't parse
    }
  }

  // Strategy 3: Regex extraction for final_answer or answer value
  for (const key of ["final_answer", "answer"]) {
    const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)
    const m = trimmed.match(regex);
    if (m) {
      return m[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }

  return content;
}

function parseContent(raw: string): ContentPart[] {
  // First, unwrap JSON envelope if present
  const content = unwrapJsonAnswer(raw);

  const parts: ContentPart[] = [];
  const regex = /:::task-proposal\n([\s\S]*?)\n:::/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: "text", text });
    }
    try {
      const data = JSON.parse(match[1]);
      parts.push({ type: "proposal", data: data as TaskProposal });
    } catch {
      parts.push({ type: "text", text: match[0] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) parts.push({ type: "text", text: remaining });
  }

  return parts;
}

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex animate-[fadeIn_300ms_ease-out] justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-3 text-white">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="mt-1.5 text-[10px] text-white/40">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message — parse for interactive blocks
  const parts = parseContent(message.content);
  const hasInteractive = parts.some((p) => p.type !== "text");
  // Get the unwrapped text for non-interactive messages
  const displayText = !hasInteractive
    ? parts.filter((p): p is ContentPart & { type: "text" } => p.type === "text").map((p) => p.text).join("\n\n")
    : "";

  return (
    <div className="flex animate-[fadeIn_300ms_ease-out] justify-start">
      <div className={`max-w-[85%] rounded-2xl rounded-bl-md border border-edge bg-surface text-cream ${hasInteractive ? "px-0 py-0 overflow-hidden" : "px-4 py-3"}`}>
        {hasInteractive ? (
          <div>
            {parts.map((part, i) => {
              if (part.type === "text") {
                return <p key={i} className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{part.text}</p>;
              }
              if (part.type === "proposal") {
                return <TaskProposalCard key={i} proposal={part.data} />;
              }
              return null;
            })}
            <p className="px-4 pb-2 text-[10px] text-muted">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
            <p className="mt-1.5 text-[10px] text-muted">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
