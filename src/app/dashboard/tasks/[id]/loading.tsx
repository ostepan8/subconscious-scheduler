import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-cream transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Back to Dashboard
          </Link>
        </div>

        {/* Header skeleton */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 animate-pulse rounded-lg bg-surface" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-surface/60" />
            </div>
            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-surface/60" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-lg bg-surface" />
        </div>

        {/* Prompt skeleton */}
        <div className="mb-8 rounded-xl border border-edge/60 bg-surface/60 p-5">
          <div className="mb-3 h-4 w-12 animate-pulse rounded bg-surface" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-surface/60" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-surface/60" />
          </div>
        </div>

        {/* Edit section skeleton */}
        <div className="mb-8">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-surface" />
        </div>

        {/* Results table skeleton */}
        <div>
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-surface" />
          <div className="overflow-hidden rounded-xl border border-edge">
            {/* Table header */}
            <div className="flex border-b border-edge bg-surface px-4 py-3 gap-4">
              <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
            </div>
            {/* Table rows */}
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center border-b border-edge px-4 py-3.5 gap-4"
              >
                <div className="h-5 w-18 animate-pulse rounded-full bg-surface/60" />
                <div className="h-3 w-28 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
