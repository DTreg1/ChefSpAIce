// Move service worker registration to after app is loaded
let swRegistered = false;

async function registerSW() {
  if (swRegistered) return;
  swRegistered = true;
  
  // Dynamic import to reduce initial bundle
  const { registerServiceWorker } = await import('./utils/registerServiceWorker');
  await registerServiceWorker();
}

// Setup performance monitoring after initial load
async function setupPerformance() {
  // Performance monitoring would be set up here if needed
  // Currently handled by web vitals directly in the app
}

// Setup logging after initial load  
async function setupLogging() {
  const { Logger } = await import('./lib/logger');
  const logger = Logger.getInstance();
  logger.info('Application started');
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Defer non-critical setup until after initial render
setTimeout(() => {
  registerSW().catch(console.error);
  setupPerformance().catch(console.error);
  setupLogging().catch(console.error);
}, 1000);
