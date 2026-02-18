import { LayoutList, CircleCheck, AlertTriangle, Play } from "lucide-react";

interface StatsProps {
  stats: {
    total: number;
    active: number;
    errored: number;
    running: number;
  };
}

const cards = [
  {
    key: "total" as const,
    label: "Total Tasks",
    icon: LayoutList,
    color: "text-cream",
    accent: "bg-cream/5",
  },
  {
    key: "active" as const,
    label: "Active",
    icon: CircleCheck,
    color: "text-lime",
    accent: "bg-lime/5",
  },
  {
    key: "errored" as const,
    label: "Errored",
    icon: AlertTriangle,
    color: "text-danger",
    accent: "bg-danger/5",
  },
  {
    key: "running" as const,
    label: "Running Now",
    icon: Play,
    color: "text-brand",
    accent: "bg-brand/5",
  },
];

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`rounded-xl border border-edge/60 bg-surface/80 p-4 backdrop-blur-sm ${card.accent}`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${card.color}`} strokeWidth={1.75} />
              <span className="text-xs font-medium text-muted">{card.label}</span>
            </div>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${card.color}`}>
              {stats[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
