// Track active notifications to prevent duplicates
const activeNotifications = new Map<string, HTMLDivElement>();

// Helper function to show user-friendly notification with deduplication
function showNotification(message: string, isError: boolean = false) {
  // Create a unique key for this message type
  const notificationKey = `${message}-${isError}`;
  
  // If this notification is already showing, don't create a duplicate
  if (activeNotifications.has(notificationKey)) {
    return;
  }
  
  // Create a simple notification div that mimics toast appearance
  const notification = document.createElement('div');
  notification.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
    isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
  }`;
  notification.style.transform = 'translateX(-50%)';
  notification.textContent = message;
  
  // Track this notification
  activeNotifications.set(notificationKey, notification);
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
      // Remove from tracking map when removed from DOM
      activeNotifications.delete(notificationKey);
    }, 300);
  }, 5000);
}

// Track registration attempts to prevent infinite loops
let registrationAttempts = 0;
const MAX_REGISTRATION_ATTEMPTS = 3;
let isRegistering = false; // Prevent concurrent registration attempts
let hasShownError = false; // Prevent duplicate error notifications

// Register service worker for offline functionality with recovery mechanism
export async function registerServiceWorker(isRetry = false): Promise<ServiceWorkerRegistration | undefined> {
  // Prevent concurrent registration attempts
  if (isRegistering) {
    console.log('Service worker registration already in progress, skipping...');
    return undefined;
  }
  
  if ('serviceWorker' in navigator) {
    // Check if we've exceeded max attempts
    if (registrationAttempts >= MAX_REGISTRATION_ATTEMPTS) {
      console.error('Max service worker registration attempts reached. Stopping.');
      if (!hasShownError) {
        hasShownError = true;
        showNotification('Offline features could not be enabled after multiple attempts', true);
      }
      return undefined;
    }
    
    isRegistering = true;
    
    // Increment attempt counter only for actual registration attempts
    if (!isRetry) {
      registrationAttempts = 0; // Reset on fresh call
      hasShownError = false; // Reset error flag on fresh attempt
    }
    registrationAttempts++;
    
    // Add exponential backoff for retries
    if (isRetry && registrationAttempts > 1) {
      const backoffDelay = Math.min(1000 * Math.pow(2, registrationAttempts - 1), 10000);
      console.log(`Waiting ${backoffDelay}ms before retry attempt ${registrationAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
    
    try {
      // First, check for existing failed registrations and clean them up
      const registrations = await navigator.serviceWorker.getRegistrations();
      let hasFailedRegistration = false;
      
      for (const registration of registrations) {
        // Check if the service worker is in a bad state
        if (registration.installing === null && 
            registration.waiting === null && 
            registration.active === null) {
          hasFailedRegistration = true;
          await registration.unregister();
          console.log('Cleaned up failed service worker registration');
        }
      }
      
      // If we cleaned up failed registrations, wait a bit before re-registering
      if (hasFailedRegistration) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', registration.scope);
      
      // Reset attempts on success
      registrationAttempts = 0;
      
      // Set up a recovery mechanism for persistent failures
      let updateCheckCount = 0;
      const maxUpdateChecks = 3;
      let updateCheckInterval: NodeJS.Timeout | null = null;
      
      const checkForUpdates = async () => {
        try {
          await registration.update();
          updateCheckCount = 0; // Reset counter on successful update
        } catch (error) {
          updateCheckCount++;
          console.error(`Service Worker update check failed (attempt ${updateCheckCount}):`, error);
          
          if (updateCheckCount >= maxUpdateChecks) {
            console.log('Service Worker appears to be in a bad state, attempting recovery...');
            
            // Clear the interval to prevent further checks
            if (updateCheckInterval) {
              clearInterval(updateCheckInterval);
              updateCheckInterval = null;
            }
            
            // Unregister and re-register after a delay (with retry flag)
            await registration.unregister();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Only retry if we haven't exceeded max attempts
            if (registrationAttempts < MAX_REGISTRATION_ATTEMPTS) {
              await registerServiceWorker(true); // Pass retry flag
            } else {
              console.error('Cannot recover service worker after max attempts');
              showNotification('Offline features have been disabled due to errors', true);
            }
          }
        }
      };
      
      // Check for updates periodically (every 30 minutes)
      updateCheckInterval = setInterval(checkForUpdates, 30 * 60 * 1000);
      
      // Only show success notification if this is the first registration
      // (not on subsequent page loads when already registered)
      if (!registration.active) {
        showNotification('Offline functionality enabled successfully', false);
      }

      // Listen for controller change and reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      isRegistering = false; // Reset flag on success
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
      if (!hasShownError) {
        hasShownError = true;
        showNotification(errorMessage, true);
      }
      return undefined;
    } finally {
      isRegistering = false; // Always reset flag
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
    return undefined;
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
