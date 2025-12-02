import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FoodCardSkeleton() {
  return (
    <Card className="border border-card-border shadow-sm animate-pulse">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="w-full h-1.5 rounded-full" />
            </div>

            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FoodCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <FoodCardSkeleton key={i} />
      ))}
    </div>
  );
}
