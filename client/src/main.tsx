import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { logWebVitalsToConsole, reportWebVitals } from "./utils/reportWebVitals";
import { initializePerformanceOptimizations } from "./utils/performanceOptimizer";

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Log the error but don't prevent default behavior in production
  // This allows proper error reporting to monitoring services
  if (import.meta.env.DEV) {
    // In development, we might want to see the full error
    console.error('Promise rejection details:', {
      promise: event.promise,
      reason: event.reason,
      stack: event.reason?.stack
    });
  }
  
  // Report to error tracking service if available
  if (typeof window.reportError === 'function') {
    window.reportError(event.reason);
  }
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Log additional context in development
  if (import.meta.env.DEV) {
    console.error('Error details:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  }
});

createRoot(document.getElementById("root")!).render(<App />);

// Initialize performance optimizations after initial render
initializePerformanceOptimizations();

// Defer service worker registration until after page load
// This prevents blocking the initial render
if (import.meta.env.PROD) {
  if ('requestIdleCallback' in window) {
    // Use requestIdleCallback if available (most modern browsers)
    requestIdleCallback(() => {
      registerServiceWorker();
      reportWebVitals();
    }, { timeout: 2000 }); // Fallback to 2 seconds if browser is too busy
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      registerServiceWorker();
      reportWebVitals();
    }, 1000);
  }
}

// Log Web Vitals to console in development  
if (import.meta.env.DEV) {
  logWebVitalsToConsole();
}
