import type { InsertAnalyticsEvent } from '@shared/schema';

// Generate a unique session ID for this browser session
const getOrCreateSessionId = (): string => {
  const SESSION_KEY = 'chefspice_session_id';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  const storedSession = sessionStorage.getItem(SESSION_KEY);
  if (storedSession) {
    const { id, lastActive } = JSON.parse(storedSession);
    if (Date.now() - lastActive < SESSION_TIMEOUT) {
      // Update last active time
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, lastActive: Date.now() }));
      return id;
    }
  }
  
  // Create new session
  const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: newSessionId, lastActive: Date.now() }));
  return newSessionId;
};

// Get device info
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return {
    deviceType: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
    browser,
    os,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: ua,
  };
};

// Queue for batching events
let eventQueue: Partial<InsertAnalyticsEvent>[] = [];
let flushTimer: NodeJS.Timeout | null = null;
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds

// Flush events to the server
const flushEvents = async () => {
  if (eventQueue.length === 0) return;
  
  const eventsToSend = [...eventQueue];
  eventQueue = [];
  
  try {
    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ events: eventsToSend })], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
    } else {
      // Fallback to fetch
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('Failed to send analytics events:', error);
    // Re-queue events if failed (with a limit to prevent infinite growth)
    if (eventQueue.length < 100) {
      eventQueue = [...eventsToSend, ...eventQueue];
    }
  }
};

// Schedule flush
const scheduleFlush = () => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushEvents, BATCH_TIMEOUT);
};

// Main analytics tracking function
export const trackEvent = (
  eventType: string,
  eventCategory: string,
  eventAction: string,
  eventLabel?: string,
  eventValue?: number,
  properties?: Record<string, any>
) => {
  const deviceInfo = getDeviceInfo();
  const sessionId = getOrCreateSessionId();
  
  const event: Partial<InsertAnalyticsEvent> = {
    sessionId,
    eventType,
    eventCategory,
    eventAction,
    eventLabel,
    eventValue,
    properties,
    pageUrl: window.location.href,
    referrer: document.referrer || undefined,
    ...deviceInfo,
    timeOnPage: Math.floor((Date.now() - performance.timing.navigationStart) / 1000),
  };
  
  eventQueue.push(event);
  
  // Flush if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    scheduleFlush();
  }
};

// Convenience functions for common events
export const trackPageView = (pageName?: string) => {
  trackEvent('page_view', 'navigation', 'view', pageName || document.title);
};

export const trackFeatureUse = (feature: string, action: string, details?: Record<string, any>) => {
  trackEvent('feature_use', feature, action, undefined, undefined, details);
};

export const trackButtonClick = (buttonId: string, category: string, label?: string) => {
  trackEvent('button_click', category, buttonId, label);
};

export const trackFormSubmit = (formName: string, category: string, success: boolean) => {
  trackEvent('form_submit', category, formName, success ? 'success' : 'failure');
};

export const trackError = (errorType: string, errorMessage: string, context?: Record<string, any>) => {
  trackEvent('error', errorType, 'occurred', errorMessage, undefined, context);
};

export const trackSearch = (searchType: string, query: string, resultCount?: number) => {
  trackEvent('search', searchType, 'performed', query, resultCount);
};

export const trackTiming = (category: string, action: string, timeInMs: number, label?: string) => {
  trackEvent('timing', category, action, label, timeInMs);
};

// Track goals/conversions
export const trackGoal = (goalName: string, value?: number) => {
  trackEvent('goal_completion', 'conversion', goalName, undefined, value);
};

// Flush events on page unload
window.addEventListener('beforeunload', () => {
  flushEvents();
});

// Also flush when visibility changes (mobile browsers)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    flushEvents();
  }
});

// Session tracking
let sessionStarted = false;
export const startSession = () => {
  if (!sessionStarted) {
    sessionStarted = true;
    const sessionId = getOrCreateSessionId();
    const deviceInfo = getDeviceInfo();
    
    // Send session start event
    fetch('/api/analytics/sessions/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        entryPage: window.location.href,
        referrer: document.referrer || undefined,
        ...deviceInfo,
        // Parse UTM parameters if present
        utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined,
      }),
    }).catch(console.warn);
    
    // Track initial page view
    trackPageView();
  }
};

// End session
export const endSession = () => {
  if (sessionStarted) {
    const sessionId = getOrCreateSessionId();
    
    // Flush any remaining events
    flushEvents();
    
    // Send session end event
    navigator.sendBeacon?.('/api/analytics/sessions/end', 
      new Blob([JSON.stringify({ sessionId, exitPage: window.location.href })], 
        { type: 'application/json' })
    );
  }
};

// Auto-start session on module load
if (typeof window !== 'undefined') {
  startSession();
}