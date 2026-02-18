"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Play } from "lucide-react";

type FlashState = { type: "success" | "error"; message: string } | null;

export default function TriggerButton({
  taskId,
  isRunning,
}: {
  taskId: Id<"tasks">;
  isRunning: boolean;
}) {
  const triggerAction = useAction(api.triggerTask.trigger);
  const [triggering, setTriggering] = useState(false);
  const [flash, setFlash] = useState<FlashState>(null);

  async function handleTrigger() {
    setTriggering(true);
    setFlash(null);

    try {
      await triggerAction({ id: taskId });
      setFlash({ type: "success", message: "Task triggered successfully" });
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to trigger task",
      });
    } finally {
      setTriggering(false);
      setTimeout(() => setFlash(null), 4000);
    }
  }

  const disabled = isRunning || triggering;

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleTrigger}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-brand bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning || triggering ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        ) : (
          <Play className="h-4 w-4" strokeWidth={1.75} />
        )}
        {isRunning ? "Running..." : triggering ? "Starting..." : "Run Now"}
      </button>

      {flash && (
        <span
          className={`text-xs font-medium transition-opacity ${
            flash.type === "success" ? "text-success" : "text-danger"
          }`}
        >
          {flash.message}
        </span>
      )}
    </div>
  );
}
