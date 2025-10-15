// Register service worker for offline functionality
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);


      // Listen for controller change and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
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
