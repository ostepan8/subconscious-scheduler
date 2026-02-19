"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";

export default function UserMenu() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream"
      >
        <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
        Sign In
      </Link>
    );
  }

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/dashboard");
      }}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-subtle transition-colors hover:bg-surface hover:text-cream cursor-pointer"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
      Sign Out
    </button>
  );
}
