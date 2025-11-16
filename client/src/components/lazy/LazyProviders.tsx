/**
 * Lazy-loaded providers and components
 * These components are conditionally loaded based on routes and user preferences
 */

import { lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

// Lazy load heavy components (handling named exports)
const AnimatedBackground = lazy(() => 
  import("@/components/animated-background").then(module => ({ default: module.AnimatedBackground }))
);
const PushNotificationHandler = lazy(() => 
  import("@/components/PushNotificationHandler").then(module => ({ default: module.PushNotificationHandler }))
);
const ChatWidget = lazy(() => 
  import("@/components/ChatWidget").then(module => ({ default: module.ChatWidget }))
);
const VoiceControl = lazy(() => 
  import("@/components/voice/VoiceControl").then(module => ({ default: module.VoiceControl }))
);
const FeedbackWidget = lazy(() => 
  import("@/components/feedback-widget").then(module => ({ default: module.FeedbackWidget }))
);

interface LazyProvidersProps {
  children?: React.ReactNode;
}

export function LazyAnimatedBackground() {
  const [location] = useLocation();
  
  // Only load on chat/home page
  if (location !== "/" && location !== "/chat") {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <AnimatedBackground
        variant="both"
        gradientType="primary"
        particleCount={1000}
      />
    </Suspense>
  );
}

export function LazyPushNotificationHandler() {
  const { isAuthenticated } = useAuth();
  
  // Only load for authenticated users
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <PushNotificationHandler />
    </Suspense>
  );
}

export function LazyChatWidget() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  // Only load for authenticated users and not on chat page (to avoid duplication)
  if (!isAuthenticated || location === "/" || location === "/chat") {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

export function LazyVoiceControl() {
  const { isAuthenticated } = useAuth();
  
  // Only load for authenticated users
  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <VoiceControl />
    </Suspense>
  );
}

export function LazyFeedbackWidget() {
  const [location] = useLocation();
  
  // Only show on non-chat pages
  if (location === "/" || location.startsWith("/chat")) {
    return null;
  }
  
  return (
    <Suspense fallback={null}>
      <FeedbackWidget />
    </Suspense>
  );
}