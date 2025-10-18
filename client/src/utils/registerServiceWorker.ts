// Register service worker for offline functionality
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Force unregister old service worker and clear caches on first visit
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      if (existingRegistrations.length > 0) {
        // Check for updates immediately
        existingRegistrations.forEach(reg => {
          reg.update();
        });
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Always fetch fresh service worker
      });

      console.log('Service Worker registered successfully:', registration.scope);

      // Check for updates on interval
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New service worker available. Activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // Listen for controller change and reload
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('Service worker updated. Reloading page...');
          window.location.reload();
        }
      });

      // Listen for cache cleared messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
          // Only clear localStorage cache (don't call clearAllCaches to avoid loop)
          clearLocalStorageCache();
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Unregister service worker (useful for debugging)
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Worker unregistered');
  }
}

// Check if app is offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Listen for online/offline events
export function setupConnectivityListener(
  onOnline?: () => void,
  onOffline?: () => void
) {
  window.addEventListener('online', () => {
    console.log('App is online');
    onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    onOffline?.();
  });
}

// Clear localStorage cache only
function clearLocalStorageCache() {
  console.log('Clearing localStorage cache...');
  
  // Clear localStorage caches (items starting with 'cache:')
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('cache:') || key.startsWith('chefspaice-'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    console.log('Removing localStorage key:', key);
    localStorage.removeItem(key);
  });
  
  // Clear sessionStorage as well
  sessionStorage.clear();
  
  console.log('localStorage cache cleared');
}

// Clear all caches (service worker + localStorage)
export async function clearAllCaches() {
  console.log('Clearing all caches...');
  
  // Clear service worker caches
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  }
  
  // Clear localStorage cache directly (not waiting for message back)
  clearLocalStorageCache();
  
  console.log('All caches cleared');
}

// Force refresh the app (clear caches and reload)
export async function forceRefresh() {
  await clearAllCaches();
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
  }
  
  // Hard reload the page
  window.location.reload();
}

// Get current service worker version
export async function getServiceWorkerVersion(): Promise<string | null> {
  if ('serviceWorker' in navigator) {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data?.version || null);
        };
        controller.postMessage(
          { type: 'GET_VERSION' },
          [channel.port2]
        );
        
        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
      });
    }
  }
  return null;
}
