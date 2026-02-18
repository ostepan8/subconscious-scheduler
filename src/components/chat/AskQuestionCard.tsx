"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { HelpCircle, Send } from "lucide-react";

interface AskQuestionCardProps {
  questionId: Id<"pendingQuestions">;
  question: string;
  options?: string[];
}

export default function AskQuestionCard({
  questionId,
  question,
  options,
}: AskQuestionCardProps) {
  const [answered, setAnswered] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");
  const answerMutation = useMutation(api.pendingQuestions.answer);

  async function handleAnswer(text: string) {
    setAnswered(text);
    await answerMutation({ id: questionId, answer: text });
  }

  if (answered) {
    return (
      <div className="mx-4 mb-2 rounded-xl border border-edge/50 bg-ink/40 px-3.5 py-2.5">
        <p className="text-[10px] text-muted uppercase tracking-wider font-medium mb-1">Answered</p>
        <p className="text-xs text-muted">{question}</p>
        <p className="mt-1 text-sm text-cream">{answered}</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-2 rounded-xl border border-brand/20 bg-brand/5 overflow-hidden">
      <div className="px-3.5 py-2.5 flex items-start gap-2">
        <HelpCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand" strokeWidth={1.75} />
        <p className="text-sm text-cream">{question}</p>
      </div>

      {options && options.length > 0 && (
        <div className="px-3.5 pb-2 flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              className="rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-xs text-subtle transition-colors hover:border-brand/40 hover:text-cream cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div className="px-3.5 pb-2.5 flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customInput.trim()) handleAnswer(customInput.trim());
          }}
          placeholder="Type an answer..."
          className="flex-1 rounded-lg border border-edge bg-ink px-2.5 py-1.5 text-xs text-cream placeholder:text-muted transition-colors focus:border-brand focus:outline-none"
        />
        <button
          onClick={() => { if (customInput.trim()) handleAnswer(customInput.trim()); }}
          disabled={!customInput.trim()}
          className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-light disabled:opacity-40 cursor-pointer"
        >
          <Send className="h-3 w-3" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
