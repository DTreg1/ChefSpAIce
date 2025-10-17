import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { logWebVitalsToConsole, reportWebVitals } from "./utils/reportWebVitals";

createRoot(document.getElementById("root")!).render(<App />);

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
