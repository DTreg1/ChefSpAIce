// Helper function to show user-friendly notification
function showNotification(message: string, isError: boolean = false) {
  // Create a simple notification div that mimics toast appearance
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
    isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`;
  notification.style.transform = 'translateX(-50%)';
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Register service worker for offline functionality
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);
      
      // Only show success notification if this is the first registration
      // (not on subsequent page loads when already registered)
      if (!registration.active) {
        showNotification('Offline functionality enabled successfully', false);
      }

      // Listen for controller change and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return registration;
    } catch (error: any) {
      console.error('Service Worker registration failed:', error);
      
      // Show user-friendly error messages based on the error type
      let errorMessage = 'Offline functionality could not be enabled';
      
      if (error.message?.includes('SecurityError') || error.message?.includes('https')) {
        errorMessage = 'Offline features require a secure connection (HTTPS)';
      } else if (error.message?.includes('NotSupportedError')) {
        errorMessage = 'Your browser does not support offline functionality';
      } else if (error.message?.includes('InvalidStateError')) {
        errorMessage = 'Offline functionality setup failed. Please refresh the page';
      } else if (error.message?.includes('NetworkError')) {
        errorMessage = 'Could not download offline resources. Check your connection';
      }
      
      // Show notification to user
      showNotification(errorMessage, true);
    }
  } else {
    console.warn('Service Workers are not supported in this browser');
    // Wait for DOM to be ready before showing notification
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        showNotification('Your browser does not support offline features', true);
      });
    } else {
      showNotification('Your browser does not support offline features', true);
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
