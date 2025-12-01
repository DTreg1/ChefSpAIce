/**
 * AI Error Display Component
 * 
 * Displays AI error messages with retry functionality
 */

import { AlertCircle, RefreshCw, Clock, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';
import { errorCodeToIcon, getErrorTitle, type AIErrorInfo } from '@/hooks/use-ai-error-handler';

interface AIErrorDisplayProps {
  error: AIErrorInfo | null;
  isRetrying: boolean;
  canRetry: boolean;
  retryCount: number;
  maxRetries?: number;
  onRetry: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AIErrorDisplay({
  error,
  isRetrying,
  canRetry,
  retryCount,
  maxRetries = 3,
  onRetry,
  onDismiss,
  className
}: AIErrorDisplayProps) {
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Handle retry countdown
  useEffect(() => {
    if (!error?.retryAfter || isRetrying) {
      setRetryCountdown(null);
      return;
    }

    let countdown = Math.ceil(error.retryAfter / 1000);
    setRetryCountdown(countdown);

    const interval = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(interval);
        setRetryCountdown(null);
      } else {
        setRetryCountdown(countdown);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [error?.retryAfter, isRetrying]);

  if (!error) return null;

  const icon = errorCodeToIcon[error.code] || '❓';
  const title = getErrorTitle(error.code);
  const isOffline = error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT';

  return (
    <Alert 
      variant="destructive" 
      className={className}
      data-testid="alert-error-display"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" role="img" aria-label={title}>
          {icon}
        </div>
        
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            {title}
            {!!error.code && (
              <Badge variant="secondary" className="text-xs">
                {error.code}
              </Badge>
            )}
          </AlertTitle>
          
          <AlertDescription className="mt-2 space-y-3">
            <p>{error.message}</p>
            
            {/* Retry progress */}
            {retryCount > 0 && maxRetries > 1 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Retry attempt {retryCount} of {maxRetries}</span>
                  <span>{Math.round((retryCount / maxRetries) * 100)}%</span>
                </div>
                <Progress 
                  value={(retryCount / maxRetries) * 100} 
                  className="h-1"
                />
              </div>
            )}
            
            {/* Retry countdown */}
            {retryCountdown !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Retrying in {retryCountdown} second{retryCountdown !== 1 ? 's' : ''}...</span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {canRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  disabled={isRetrying || retryCountdown !== null}
                  data-testid="button-retry"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {retryCountdown !== null ? `Wait ${retryCountdown}s` : 'Retry'}
                    </>
                  )}
                </Button>
              )}
              
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  data-testid="button-dismiss-error"
                >
                  Dismiss
                </Button>
              )}
              
              {isOffline && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                  <WifiOff className="h-3 w-3" />
                  <span>Check connection</span>
                </div>
              )}
            </div>
            
            {/* Additional help text */}
            {error.code === 'RATE_LIMIT' && (
              <p className="text-xs text-muted-foreground">
                You've made too many requests. Please wait a moment before trying again.
              </p>
            )}
            
            {error.code === 'CONTEXT_LENGTH_EXCEEDED' && (
              <p className="text-xs text-muted-foreground">
                The conversation has become too long. Try starting a new chat or clearing some messages.
              </p>
            )}
            
            {error.code === 'AUTH_ERROR' && (
              <p className="text-xs text-muted-foreground">
                There's an issue with authentication. Please try logging out and back in.
              </p>
            )}
            
            {error.code === 'CIRCUIT_OPEN' && (
              <p className="text-xs text-muted-foreground">
                The service is temporarily unavailable due to high error rates. It will automatically recover soon.
              </p>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Inline error message for forms
 */
interface InlineErrorProps {
  error: AIErrorInfo | null;
  className?: string;
}

export function InlineError({ error, className }: InlineErrorProps) {
  if (!error) return null;

  return (
    <div 
      className={`flex items-center gap-2 text-sm text-destructive ${className}`}
      data-testid="text-inline-error"
    >
      <AlertCircle className="h-4 w-4" />
      <span>{error.message}</span>
    </div>
  );
}

/**
 * Connection status indicator
 */
export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Alert className="w-auto">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Offline</AlertTitle>
        <AlertDescription>
          You're offline. Messages will be sent when connection is restored.
        </AlertDescription>
      </Alert>
    </div>
  );
}