export default function Loading() {
  return (
    <div className="p-6 sm:p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="h-7 w-36 animate-pulse rounded-lg bg-surface" />
            <div className="mt-2 h-4 w-28 animate-pulse rounded bg-surface/60" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-surface" />
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-edge/60 bg-surface/60 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-surface" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface" />
              </div>
              <div className="mt-3 h-7 w-10 animate-pulse rounded bg-surface" />
            </div>
          ))}
        </div>

        {/* Task cards skeleton */}
        <div className="mt-8 grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-edge/60 bg-surface/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-40 animate-pulse rounded bg-surface" />
                  <div className="mt-2 h-3 w-64 animate-pulse rounded bg-surface/60" />
                </div>
                <div className="h-5 w-14 animate-pulse rounded-full bg-surface" />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="h-5 w-16 animate-pulse rounded-md bg-surface/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-surface/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-surface/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
