"use client";

import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to dashboard once authenticated (handles both fresh sign-in and returning visit)
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show spinner while checking auth state or already authenticated (redirect pending)
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);

    try {
      // Race signIn against a timeout so it doesn't hang forever
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Sign-in timed out after 15 seconds. Please try again.")), 15000)
      );

      const result = await Promise.race([
        signIn("password", formData),
        timeoutPromise,
      ]);
      if (result.signingIn) {
        // Tokens received - Convex client is now authenticated in memory.
        // The useEffect watching isAuthenticated will handle the redirect.
        // Keep isSubmitting true to show loading state until redirect.
        return;
      }

      setError(
        flow === "signIn"
          ? "Sign-in failed. Check your email and password."
          : "Sign-up failed. That email may already be registered."
      );
      setIsSubmitting(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="w-full max-w-md rounded-2xl border border-edge/60 bg-surface/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/Subconscious_Logo.png"
            alt="Subconscious"
            width={160}
            height={32}
            priority
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Subtitle */}
        <p className="mb-6 text-center text-sm text-muted">
          Sign in to manage your scheduled agents
        </p>

        {/* Flow toggle */}
        <div className="mb-6 flex rounded-full bg-ink p-1">
          <button
            type="button"
            onClick={() => { setFlow("signIn"); setError(null); }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all cursor-pointer ${
              flow === "signIn"
                ? "bg-surface text-cream shadow-sm"
                : "text-muted hover:text-subtle"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setFlow("signUp"); setError(null); }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all cursor-pointer ${
              flow === "signUp"
                ? "bg-surface text-cream shadow-sm"
                : "text-muted hover:text-subtle"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-subtle">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-subtle">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-edge bg-ink px-4 py-3 text-sm text-cream placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting
              ? "Loading..."
              : flow === "signIn"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle link */}
        <p className="mt-6 text-center text-xs text-muted">
          {flow === "signIn"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setError(null); }}
            className="font-semibold text-brand hover:underline cursor-pointer"
          >
            {flow === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </p>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-muted/60">
          Powered by{" "}
          <a
            href="https://www.subconscious.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted/80 hover:text-subtle transition-colors"
          >
            Subconscious
          </a>
        </p>
      </div>
    </div>
  );
}
