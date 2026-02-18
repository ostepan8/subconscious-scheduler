"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogOut } from "lucide-react";

export default function UserMenu() {
  const { signOut } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) return null;

  return (
    <button
      onClick={() => void signOut()}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
      Sign Out
    </button>
  );
}
