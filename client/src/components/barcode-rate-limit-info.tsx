import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface RateLimitData {
  remaining_requests: number;
  allowed_requests: number;
  reset_time: string;
}

export function BarcodeRateLimitInfo() {
  const { data: rateLimits, isLoading, error } = useQuery<RateLimitData>({
    queryKey: ["/api/barcodelookup/rate-limits"],
  });

  if (isLoading) {
    return null;
  }

  if (error || !rateLimits) {
    return null;
  }

  const percentageRemaining = (rateLimits.remaining_requests / rateLimits.allowed_requests) * 100;
  const isLow = percentageRemaining < 20;
  const isVeryLow = percentageRemaining < 10;
  
  const resetDate = new Date(rateLimits.reset_time);
  const now = new Date();
  const hoursUntilReset = Math.max(0, Math.round((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

  return (
    <Alert variant={isVeryLow ? "destructive" : "default"} className="mb-4">
      <div className="flex items-start gap-3">
        {isVeryLow ? (
          <AlertCircle className="h-4 w-4 mt-0.5" />
        ) : isLow ? (
          <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-600 dark:text-yellow-500" />
        ) : (
          <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-500" />
        )}
        <div className="flex-1">
          <AlertDescription>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {rateLimits.remaining_requests} of {rateLimits.allowed_requests}
                </span>
                <span className="text-muted-foreground text-sm">
                  product image lookups remaining
                </span>
              </div>
              {hoursUntilReset > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Resets in {hoursUntilReset}h</span>
                </div>
              )}
            </div>
            {!!isVeryLow && (
              <p className="mt-2 text-sm">
                You're running low on product image lookups. Consider uploading your own photos or waiting for the limit to reset.
              </p>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
