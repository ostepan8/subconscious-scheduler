"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DEFAULT_TOOLS } from "@/lib/constants";
import { Check, Clock, Cpu, FileText, Loader2, Mail } from "lucide-react";

export interface TaskProposal {
  name: string;
  type: string;
  prompt: string;
  schedule: string;
  engine?: string;
  email?: string;
}

export default function TaskProposalCard({ proposal }: { proposal: TaskProposal }) {
  const createTask = useMutation(api.tasks.create);
  const upsertNotificationPrefs = useMutation(api.notificationPrefs.upsert);
  const [status, setStatus] = useState<"pending" | "creating" | "created" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setStatus("creating");
    setError(null);
    try {
      const taskId = await createTask({
        name: proposal.name,
        type: proposal.type,
        prompt: proposal.prompt,
        schedule: proposal.schedule,
        engine: proposal.engine || "tim",
        tools: DEFAULT_TOOLS,
      });

      // Auto-setup email notifications if email was provided
      if (proposal.email && taskId) {
        await upsertNotificationPrefs({
          taskId,
          enabled: true,
          channels: [
            {
              channel: "resend",
              to: proposal.email,
              onSuccess: true,
              onFailure: true,
              includeResult: true,
            },
          ],
        });
      }

      setStatus("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
      setStatus("error");
    }
  }

  return (
    <div className="my-2 rounded-xl border border-edge bg-ink/60 overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-2 border-b border-edge/50 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-brand" strokeWidth={1.75} />
        <span className="text-xs font-semibold text-cream">Task Proposal</span>
        {status === "created" && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-success font-medium">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            Created
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5 space-y-2">
        <p className="text-sm font-medium text-cream">{proposal.name}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
            {proposal.type}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
            <Cpu className="h-2.5 w-2.5" strokeWidth={1.75} />
            {proposal.engine || "tim"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted">
            <Clock className="h-2.5 w-2.5" strokeWidth={1.75} />
            {proposal.schedule}
          </span>
          {proposal.email && (
            <span className="inline-flex items-center gap-1 rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
              <Mail className="h-2.5 w-2.5" strokeWidth={1.75} />
              {proposal.email}
            </span>
          )}
        </div>
        <p className="text-xs text-subtle leading-relaxed line-clamp-3">{proposal.prompt}</p>

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {/* Actions */}
      {status !== "created" && (
        <div className="px-3.5 py-2 border-t border-edge/50 flex items-center gap-2">
          <button
            onClick={handleCreate}
            disabled={status === "creating"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-brand-light disabled:opacity-50"
          >
            {status === "creating" ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                Creating...
              </>
            ) : (
              "Create Task"
            )}
          </button>
          <span className="text-[10px] text-muted">or keep chatting to edit</span>
        </div>
      )}
    </div>
  );
}
