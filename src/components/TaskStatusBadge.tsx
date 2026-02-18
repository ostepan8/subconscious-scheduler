const statusConfig: Record<string, { color: string; dotColor: string; label: string }> = {
  active: {
    color: "bg-lime/10 text-lime",
    dotColor: "bg-lime",
    label: "Active",
  },
  paused: {
    color: "bg-muted/10 text-muted",
    dotColor: "bg-muted",
    label: "Paused",
  },
  error: {
    color: "bg-danger/10 text-danger",
    dotColor: "bg-danger",
    label: "Error",
  },
};

export default function TaskStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.paused;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}
