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
  const [errorAction, setErrorAction] = useState<"signIn" | "signUp" | null>(null);
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

  function getErrorMessage(err: unknown): { message: string; action?: "signUp" | "signIn" } {
    const raw = err instanceof Error ? err.message : String(err);
    const lower = raw.toLowerCase();

    if (lower.includes("timed out")) {
      return { message: "Request timed out. Please check your connection and try again." };
    }

    if (flow === "signIn") {
      // Convex Auth: invalid credentials, user not found, wrong password variants
      if (
        lower.includes("could not verify") ||
        lower.includes("invalid credentials") ||
        lower.includes("invalid password") ||
        lower.includes("wrong password") ||
        lower.includes("unauthorized")
      ) {
        return { message: "Invalid email or password. Please try again." };
      }
      if (
        lower.includes("user not found") ||
        lower.includes("no user") ||
        lower.includes("account not found") ||
        lower.includes("does not exist")
      ) {
        return {
          message: "No account found with this email. Create one to get started!",
          action: "signUp",
        };
      }
    }

    if (flow === "signUp") {
      if (
        lower.includes("already exists") ||
        lower.includes("already registered") ||
        lower.includes("duplicate") ||
        lower.includes("already been used") ||
        lower.includes("unique")
      ) {
        return {
          message: "An account with this email already exists. Try signing in instead.",
          action: "signIn",
        };
      }
      if (lower.includes("password") && (lower.includes("weak") || lower.includes("short") || lower.includes("requirements"))) {
        return { message: "Password is too weak. Use at least 8 characters with a mix of letters and numbers." };
      }
    }

    if (lower.includes("fetch") || lower.includes("network") || lower.includes("failed to fetch")) {
      return { message: "Network error. Please check your internet connection and try again." };
    }

    // Fallback: show a contextual message rather than raw server error
    return {
      message: flow === "signIn"
        ? "Sign-in failed. Please check your email and password."
        : "Sign-up failed. Please try again or use a different email.",
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorAction(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("flow", flow);

    try {
      // Race signIn against a timeout so it doesn't hang forever
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timed out")), 15000)
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

      const { message, action } = getErrorMessage(new Error(
        flow === "signIn" ? "invalid credentials" : "sign-up failed"
      ));
      setError(message);
      setErrorAction(action ?? null);
      setIsSubmitting(false);
    } catch (err: unknown) {
      const { message, action } = getErrorMessage(err);
      setError(message);
      setErrorAction(action ?? null);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <div className="onboarding-fade-in w-full max-w-md rounded-2xl border border-edge/60 bg-surface/95 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
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
            onClick={() => { setFlow("signIn"); setError(null); setErrorAction(null); }}
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
            onClick={() => { setFlow("signUp"); setError(null); setErrorAction(null); }}
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
              <p>{error}</p>
              {errorAction && (
                <button
                  type="button"
                  onClick={() => {
                    setFlow(errorAction);
                    setError(null);
                    setErrorAction(null);
                  }}
                  className="mt-1 font-semibold text-brand hover:underline cursor-pointer"
                >
                  {errorAction === "signUp" ? "Create an account" : "Go to Sign In"}
                </button>
              )}
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
            onClick={() => { setFlow(flow === "signIn" ? "signUp" : "signIn"); setError(null); setErrorAction(null); }}
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
