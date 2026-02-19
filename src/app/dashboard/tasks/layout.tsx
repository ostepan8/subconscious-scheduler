import AuthGuard from "@/components/auth/AuthGuard";
import DashboardShell from "@/components/DashboardShell";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
