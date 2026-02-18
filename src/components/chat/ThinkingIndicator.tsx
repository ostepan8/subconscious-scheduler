"use client";

interface ThinkingIndicatorProps {
  thoughts: string[];
}

export default function ThinkingIndicator({ thoughts }: ThinkingIndicatorProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-teal/20 bg-surface px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-teal animate-pulse" />
          <span className="text-xs font-medium text-teal">Thinking...</span>
        </div>

        {/* Thoughts list */}
        {thoughts.length > 0 ? (
          <div className="space-y-1.5">
            {thoughts.map((thought, i) => {
              const isLatest = i === thoughts.length - 1;
              return (
                <div
                  key={i}
                  className="flex gap-2 animate-[fadeIn_300ms_ease-out]"
                >
                  <span className="text-[10px] font-semibold text-teal/60 mt-0.5 min-w-[16px]">
                    {i + 1}
                  </span>
                  <span
                    className={`text-xs leading-relaxed ${
                      isLatest ? "text-cream" : "text-muted/60"
                    }`}
                  >
                    {thought}
                    {isLatest && (
                      <span className="inline-block ml-0.5 text-teal animate-pulse">
                        &#9646;
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: bouncing dots */
          <div className="flex items-center gap-1.5 pl-1">
            <div className="h-1.5 w-1.5 rounded-full bg-teal/40 animate-bounce [animation-delay:0ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-teal/40 animate-bounce [animation-delay:150ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-teal/40 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
