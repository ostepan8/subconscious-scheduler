import Link from "next/link";

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb skeleton */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
          <Link href="/dashboard" className="hover:text-cream transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <div className="h-3.5 w-20 animate-pulse rounded bg-surface" />
          <span>/</span>
          <span className="text-subtle">Execution</span>
        </nav>

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-7 w-44 animate-pulse rounded-lg bg-surface" />
            <div className="h-5 w-18 animate-pulse rounded-full bg-surface/60" />
          </div>
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-surface/60" />
        </div>

        {/* Metadata card skeleton */}
        <div className="mb-6 rounded-xl border border-edge bg-surface/60 p-5">
          <div className="mb-3 h-4 w-14 animate-pulse rounded bg-surface" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-14 animate-pulse rounded bg-surface/60" />
                <div className="mt-2 h-4 w-24 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </div>

        {/* Output skeleton */}
        <div className="mb-6 rounded-xl border border-edge bg-surface/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-14 animate-pulse rounded bg-surface" />
            <div className="h-6 w-16 animate-pulse rounded-md bg-surface/60" />
          </div>
          <div className="rounded-lg border border-edge bg-ink p-4">
            <div className="space-y-2.5">
              <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-full animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-surface/60" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-surface/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
