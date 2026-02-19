"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import Image from "next/image";

// Bell-off icon (muted notifications)
function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 005.714 0m-8.572-3.397a17.456 17.456 0 01-1.299-1.479A1.5 1.5 0 014.5 10.5h.042A14.922 14.922 0 019 4.065a3 3 0 015.941 0 14.92 14.92 0 014.458 6.435h.042a1.5 1.5 0 01.486 1.706 17.458 17.458 0 01-1.299 1.479M3 3l18 18" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? undefined;

  const info = useQuery(
    api.notificationPrefs.getByUnsubscribeToken,
    token ? { token, email } : "skip"
  );
  const unsubscribe = useMutation(api.notificationPrefs.unsubscribeByToken);

  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    await unsubscribe({ token, email });
    setStatus("done");
  }

  const displayEmail = info?.email ?? email;

  // No token in URL
  if (!token) {
    return (
      <Shell>
        <p className="text-center text-subtle">
          Invalid unsubscribe link. If you followed a link from an email, please try again.
        </p>
      </Shell>
    );
  }

  // Loading
  if (info === undefined) {
    return (
      <Shell>
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </Shell>
    );
  }

  // Invalid token
  if (info === null) {
    return (
      <Shell>
        <p className="text-center text-subtle">
          This unsubscribe link is no longer valid. The notification may have already been removed.
        </p>
      </Shell>
    );
  }

  // Already unsubscribed
  if ((!info.enabled || (displayEmail && !info.email)) && status === "idle") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckIcon className="h-7 w-7 text-success" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-cream">Already Unsubscribed</h2>
          <p className="text-sm text-subtle">
            {displayEmail ? (
              <>
                <span className="font-medium text-cream">{displayEmail}</span> is already unsubscribed from{" "}
                <span className="font-medium text-cream">{info.taskName}</span>.
              </>
            ) : (
              <>
                Notifications for <span className="font-medium text-cream">{info.taskName}</span> are already off.
              </>
            )}
          </p>
        </div>
      </Shell>
    );
  }

  // Success state
  if (status === "done") {
    return (
      <Shell>
        <div className="onboarding-fade-in text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckIcon className="h-7 w-7 text-success" />
          </div>
          <h2 className="mb-2 text-lg font-semibold text-cream">Unsubscribed</h2>
          <p className="text-sm text-subtle">
            {displayEmail ? (
              <>
                <span className="font-medium text-cream">{displayEmail}</span> will no longer receive emails for{" "}
                <span className="font-medium text-cream">{info.taskName}</span>.
              </>
            ) : (
              <>
                You will no longer receive emails for <span className="font-medium text-cream">{info.taskName}</span>.
              </>
            )}
          </p>
          <p className="mt-4 text-xs text-muted">
            You can re-enable notifications anytime from your dashboard.
          </p>
        </div>
      </Shell>
    );
  }

  // Main unsubscribe prompt
  return (
    <Shell>
      <div className="onboarding-fade-in text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10">
          <BellOffIcon className="h-7 w-7 text-brand" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-cream">Unsubscribe?</h2>
        <p className="mb-6 text-sm text-subtle">
          {displayEmail ? (
            <>
              Are you sure <span className="font-medium text-cream">{displayEmail}</span> wants to stop receiving emails for{" "}
              <span className="font-medium text-cream">{info.taskName}</span>?
            </>
          ) : (
            <>
              Stop receiving all email notifications for{" "}
              <span className="font-medium text-cream">{info.taskName}</span>?
            </>
          )}
        </p>
        <button
          onClick={handleUnsubscribe}
          disabled={status === "loading"}
          className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {status === "loading" ? "Unsubscribing..." : "Yes, Unsubscribe"}
        </button>
        <p className="mt-4 text-xs text-muted">
          You can re-enable notifications anytime from your dashboard.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-edge/60 bg-surface/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Subconscious_Logo.png"
            alt="Subconscious"
            width={140}
            height={28}
            style={{ objectFit: "contain" }}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
