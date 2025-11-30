import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
  lines?: number;
}

export function SkeletonLoader({
  className,
  variant = "text",
  lines = 1,
}: SkeletonLoaderProps) {
  if (variant === "card") {
    return (
      <div className={cn("space-y-4 p-4", className)}>
        <div className="skeleton h-32 w-full rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-8 w-20 rounded-md" />
          <div className="skeleton h-8 w-20 rounded-md" />
        </div>
      </div>
    );
  }

  if (variant === "circular") {
    return <div className={cn("skeleton rounded-full", className)} />;
  }

  if (variant === "rectangular") {
    return <div className={cn("skeleton rounded-lg", className)} />;
  }

  // Text variant
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "skeleton h-4 rounded",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function BasicCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <SkeletonLoader variant="circular" className="h-12 w-12" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader className="h-4 w-1/3" />
          <SkeletonLoader className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonLoader variant="rectangular" className="h-32 w-full" />
      <SkeletonLoader lines={3} />
      <div className="flex gap-2">
        <SkeletonLoader className="h-9 w-24" />
        <SkeletonLoader className="h-9 w-24" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-3 border-b">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b">
          {Array.from({ length: 4 }).map((_, j) => (
            <SkeletonLoader key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <SkeletonLoader variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader className="h-4 w-1/3" />
            <SkeletonLoader className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}