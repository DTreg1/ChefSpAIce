// Service Worker for ChefSpAIce iOS App
// Provides offline functionality for recipes and inventory

// Use timestamp-based versioning to force cache updates
const BUILD_TIMESTAMP = new Date().getTime();
const CACHE_NAME = `chefspaice-v${BUILD_TIMESTAMP}`;
const RUNTIME_CACHE = `chefspaice-runtime-v${BUILD_TIMESTAMP}`;

// Version check interval (check for updates every 5 minutes)
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Resources to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo-192.png',
  '/logo-512.png',
  '/manifest.json'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/recipes',
  '/api/storage-items',
  '/api/user-preferences',
  '/api/cookbook'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches aggressively
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete ALL old caches that don't match current version
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Keep only current version caches
            return !name.includes(`v${BUILD_TIMESTAMP}`);
          })
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      console.log('Service Worker activated with version:', BUILD_TIMESTAMP);
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is an API request that should be cached
  const isApiRequest = API_CACHE_PATTERNS.some(pattern => 
    url.pathname.startsWith(pattern)
  );

  if (isApiRequest) {
    // Network First strategy for API requests
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before caching
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a custom offline response for API calls
              return new Response(
                JSON.stringify({ 
                  error: 'Offline', 
                  message: 'You are currently offline. Showing cached data.' 
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
  } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    // Network First for JS/CSS/HTML to ensure fresh code
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache only if network fails
          return caches.match(request);
        })
    );
  } else {
    // Cache First strategy for other static assets (images, fonts)
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version but fetch update in background
            fetch(request).then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
            });
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
  }
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Clearing all caches...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log('Deleting cache:', name);
            return caches.delete(name);
          })
        );
      }).then(() => {
        // Also clear localStorage cache
        return self.clients.matchAll().then((clients) => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: BUILD_TIMESTAMP });
  }
});
