// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push notification received.');
  
  let notification;
  
  try {
    notification = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Error parsing push notification data:', error);
    notification = {
      title: 'ChefSpAIce Notification',
      body: 'You have a new notification!'
    };
  }

  const title = notification.title || 'ChefSpAIce';
  const options = {
    body: notification.body || 'You have a new notification',
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/icon-72x72.png',
    tag: notification.tag || 'default',
    data: notification.data || {},
    actions: notification.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click received.');
  
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  
  // Handle different actions
  if (action === 'view' || action === 'start-cooking') {
    // Open the app at the specified URL
    const urlToOpen = data.url || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  } else if (action === 'snooze') {
    // Handle snooze action - would need to communicate with the server
    console.log('Snooze action clicked - implement snooze logic');
  } else if (action === 'dismiss' || action === 'later') {
    // Just close the notification
    console.log('Notification dismissed');
  } else {
    // Default action - open the app
    const urlToOpen = data.url || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim());
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Background sync for offline support (optional)
self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background sync event:', event.tag);
  if (event.tag === 'sync-notifications') {
    // Handle background sync for notifications
    event.waitUntil(syncNotifications());
  }
});

// Function to sync notifications when back online
async function syncNotifications() {
  try {
    // This would sync any pending notifications with the server
    console.log('[Service Worker] Syncing notifications...');
    // Implementation would go here
  } catch (error) {
    console.error('[Service Worker] Error syncing notifications:', error);
  }
}