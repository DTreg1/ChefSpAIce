import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

// Analytics configuration
const ANALYTICS_CONFIG = {
  // Enable analytics in dev mode for debugging (can be disabled in env)
  enableInDev: import.meta.env.VITE_ENABLE_DEV_ANALYTICS === 'true',
  // Allow custom analytics endpoint
  endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics',
  // Whether to log to console in addition to sending
  logToConsole: import.meta.env.VITE_ANALYTICS_LOG_TO_CONSOLE === 'true',
};

// Track analytics failures to avoid repeated errors
let failureCount = 0;
const MAX_FAILURES = 3;

function sendToAnalytics(metric: Metric) {
  // Skip if in development and not explicitly enabled
  if (import.meta.env.DEV && !ANALYTICS_CONFIG.enableInDev) {
    return;
  }
  
  // Skip if too many failures occurred
  if (failureCount >= MAX_FAILURES) {
    return;
  }
  
  const data = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };

  // Log to console if configured
  if (ANALYTICS_CONFIG.logToConsole) {
    console.group(`Web Vital: ${metric.name}`);
    console.log('Value:', metric.value);
    console.log('Rating:', metric.rating);
    console.log('Delta:', metric.delta);
    console.log('ID:', metric.id);
    console.groupEnd();
  }

  try {
    // navigator.sendBeacon requires a Blob with proper content type
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const success = navigator.sendBeacon(ANALYTICS_CONFIG.endpoint, blob);
      if (!success) {
        failureCount++;
        console.warn(`Analytics beacon failed (${failureCount}/${MAX_FAILURES})`);
      }
    } else {
      fetch(ANALYTICS_CONFIG.endpoint, {
        body: JSON.stringify(data),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch((error) => {
        failureCount++;
        console.warn(`Analytics fetch failed (${failureCount}/${MAX_FAILURES}):`, error);
      });
    }
  } catch (error) {
    // Silently fail analytics to not break app functionality
    failureCount++;
    console.warn(`Analytics error (${failureCount}/${MAX_FAILURES}):`, error);
  }
}

export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
    onINP(onPerfEntry);
  } else {
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);
  }
}

export function logWebVitalsToConsole() {
  reportWebVitals((metric) => {
    console.group(`Web Vital: ${metric.name}`);
    console.log('Value:', metric.value);
    console.log('Rating:', metric.rating);
    console.log('Delta:', metric.delta);
    console.log('ID:', metric.id);
    console.groupEnd();
  });
}
