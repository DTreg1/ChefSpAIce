import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Props {
  children: ReactNode;
  onLogin?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: "auth" | "network" | "unknown";
  retryCount: number;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorType: "unknown",
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    let errorType: "auth" | "network" | "unknown" = "unknown";
    
    if (isUnauthorizedError(error)) {
      errorType = "auth";
    } else if (
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("Service temporarily unavailable")
    ) {
      errorType = "network";
    }

    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Auth Error Boundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleLogin = () => {
    if (this.props.onLogin) {
      this.props.onLogin();
    } else {
      window.location.href = "/api/login?returnTo=" + encodeURIComponent(window.location.pathname);
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { errorType, error, retryCount } = this.state;

      if (errorType === "auth") {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <Alert className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>Your session has expired or you need to log in to continue.</p>
                {retryCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Authentication retry attempts: {retryCount}
                  </p>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3 mt-6">
              <Button onClick={this.handleLogin} data-testid="button-login-retry">
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </Button>
              {retryCount < 3 && (
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline"
                  data-testid="button-retry-auth"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        );
      }

      if (errorType === "network") {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <Alert className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>There was a problem connecting to our services. This might be temporary.</p>
                <p className="text-sm text-muted-foreground">
                  Error: {error.message}
                </p>
                {retryCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Retry attempts: {retryCount}
                  </p>
                )}
              </AlertDescription>
            </Alert>
            <div className="flex gap-3 mt-6">
              <Button onClick={this.handleRetry} data-testid="button-retry-network">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                data-testid="button-refresh-page"
              >
                Refresh Page
              </Button>
            </div>
          </div>
        );
      }

      // Unknown error fallback
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>An unexpected error occurred. Please try refreshing the page.</p>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Technical details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {error.message}
                </pre>
              </details>
            </AlertDescription>
          </Alert>
          <div className="flex gap-3 mt-6">
            <Button onClick={this.handleRetry} data-testid="button-retry-unknown">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              data-testid="button-reload-page"
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}