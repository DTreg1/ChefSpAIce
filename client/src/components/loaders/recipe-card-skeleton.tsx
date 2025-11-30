import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RecipeCardSkeleton() {
  return (
    <Card className="border-2 border-primary/20 shadow-md animate-pulse">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="w-4 h-4 rounded-full mt-0.5" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        <div>
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecipeCardSkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
}