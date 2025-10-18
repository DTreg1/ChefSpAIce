import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { logWebVitalsToConsole, reportWebVitals } from "./utils/reportWebVitals";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for offline functionality
// Enable in both dev and prod to test cache-busting
registerServiceWorker();

if (import.meta.env.PROD) {
  reportWebVitals();
}

// Log Web Vitals to console in development
if (import.meta.env.DEV) {
  logWebVitalsToConsole();
}
