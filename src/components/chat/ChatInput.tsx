"use client";

import { useState, useCallback } from "react";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="border-t border-edge p-3">
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-edge bg-surface px-3 py-2.5 text-sm text-cream outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-all hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
