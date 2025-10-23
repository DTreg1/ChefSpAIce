import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  const data = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  };

  // navigator.sendBeacon requires a Blob with proper content type
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics', blob);
  } else {
    fetch('/api/analytics', {
      body: JSON.stringify(data),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
    }).catch(console.error);
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
