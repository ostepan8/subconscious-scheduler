import { Clock, Check } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-edge bg-surface/40 px-6 py-16">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand/10">
        <Clock className="h-10 w-10 text-brand" strokeWidth={1} />
      </div>

      <h3 className="text-lg font-semibold text-cream">No tasks yet</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-muted">
        Create your first scheduled email to start receiving personalized content
        on autopilot. Get news digests, research reports, or custom updates delivered
        right to your inbox.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-subtle">
        <Check className="h-4 w-4 text-teal" strokeWidth={2} />
        <span>Click <strong className="text-brand">New Task</strong> above to get started</span>
      </div>
    </div>
  );
}
