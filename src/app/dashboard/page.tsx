"use client";

import { useState, useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import OnboardingWizard from "@/components/OnboardingWizard";
import {
  ArrowRight,
  CalendarClock,
  MessageSquare,
  Zap,
  Rocket,
} from "lucide-react";

export default function DashboardPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);

  // Authenticated users go straight to their tasks dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard/tasks");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (showWizard) {
    return <OnboardingWizard />;
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6 sm:p-8">
      <div className="mx-auto w-full max-w-2xl text-center">
        {/* Hero */}
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 onboarding-fade-in">
          <Rocket className="h-8 w-8 text-brand" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-cream onboarding-fade-in">
          Personalized Emails
          <br />
          Delivered For You
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted onboarding-fade-in-delayed">
          Create automated tasks powered by{" "}
          <a
            href="https://www.subconscious.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            Subconscious
          </a>
          . News digests, research reports, and custom updates — delivered to your inbox on autopilot.
        </p>

        {/* Big CTA */}
        <div className="mt-8 onboarding-fade-in-delayed">
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-3 rounded-2xl bg-brand px-10 py-5 text-lg font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:shadow-xl hover:shadow-brand/30 hover:brightness-110 active:scale-[0.98] cursor-pointer"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <p className="mt-3 text-sm text-muted/60">
            No credit card required. Set up in 60 seconds.
          </p>
        </div>

        {/* Feature pills */}
        <div className="mt-16 grid grid-cols-3 gap-4 onboarding-fade-in-delayed">
          <div className="rounded-xl border border-edge/60 bg-surface/40 p-5">
            <CalendarClock className="mx-auto mb-3 h-6 w-6 text-teal" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-cream">Custom Schedules</h3>
            <p className="mt-1 text-xs text-muted">
              Deliver on any cadence — hourly, daily, weekly, or custom
            </p>
          </div>
          <div className="rounded-xl border border-edge/60 bg-surface/40 p-5">
            <MessageSquare className="mx-auto mb-3 h-6 w-6 text-lime" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-cream">Describe in Plain English</h3>
            <p className="mt-1 text-xs text-muted">
              Tell us what you want to know and we&apos;ll craft your email
            </p>
          </div>
          <div className="rounded-xl border border-edge/60 bg-surface/40 p-5">
            <Zap className="mx-auto mb-3 h-6 w-6 text-brand" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-cream">Inbox Delivery</h3>
            <p className="mt-1 text-xs text-muted">
              Personalized content delivered to your inbox, fully automatic
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 onboarding-fade-in-delayed">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted">
            How it works
          </h2>
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                1
              </div>
              <p className="text-sm font-medium text-cream">Pick a template</p>
              <p className="mt-1 text-xs text-muted">Or start from scratch</p>
            </div>
            <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-edge" />
            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                2
              </div>
              <p className="text-sm font-medium text-cream">Set a schedule</p>
              <p className="mt-1 text-xs text-muted">Choose when it runs</p>
            </div>
            <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-edge" />
            <div className="flex-1 text-center">
              <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                3
              </div>
              <p className="text-sm font-medium text-cream">Launch it</p>
              <p className="mt-1 text-xs text-muted">
                Emails delivered on autopilot
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-20 text-xs text-muted/40">
          Powered by{" "}
          <a
            href="https://www.subconscious.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted/60 hover:text-subtle transition-colors"
          >
            Subconscious
          </a>
        </p>
      </div>
    </div>
  );
}
