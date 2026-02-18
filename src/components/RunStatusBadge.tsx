const statusConfig: Record<string, { color: string; dotColor: string; label: string; pulse?: boolean }> = {
  succeeded: {
    color: "bg-success/10 text-success",
    dotColor: "bg-success",
    label: "Succeeded",
  },
  failed: {
    color: "bg-danger/10 text-danger",
    dotColor: "bg-danger",
    label: "Failed",
  },
  running: {
    color: "bg-brand/10 text-brand",
    dotColor: "bg-brand",
    label: "Running",
    pulse: true,
  },
  queued: {
    color: "bg-muted/10 text-muted",
    dotColor: "bg-muted",
    label: "Queued",
  },
};

const fallbackConfig = {
  color: "bg-muted/10 text-muted",
  dotColor: "bg-muted",
  label: "Unknown",
};

export default function RunStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { ...fallbackConfig, label: status };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dotColor} ${
          "pulse" in config && config.pulse ? "animate-pulse" : ""
        }`}
      />
      {config.label}
    </span>
  );
}
