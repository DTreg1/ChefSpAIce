import { useEffect, useState } from "react";
import { Loader2, ChefHat } from "lucide-react";

export function InitialLoadingScreen() {
  const [showRetryHint, setShowRetryHint] = useState(false);
  
  useEffect(() => {
    // Show retry hint after 3 seconds
    const timer = setTimeout(() => {
      setShowRetryHint(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg animate-pulse">
            <ChefHat className="w-10 h-10 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">
              ChefSpAIce
            </h1>
            <p className="text-sm text-muted-foreground">
              Your Smart Kitchen Assistant
            </p>
          </div>
        </div>
        
        {/* Loading spinner */}
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {showRetryHint ? "Connecting to server..." : "Loading ChefSpAIce..."}
          </p>
        </div>
        
        {/* Retry hint */}
        {showRetryHint && (
          <p className="text-xs text-muted-foreground text-center max-w-md animate-fade-in">
            Taking longer than expected? The server might be warming up.
            <br />
            Please wait a moment while we establish the connection.
          </p>
        )}
      </div>
    </div>
  );
}