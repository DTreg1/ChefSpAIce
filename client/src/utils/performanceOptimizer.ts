// Performance optimization utilities for better initial load times

// Prefetch critical routes when idle
export function prefetchCriticalRoutes() {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Prefetch critical route chunks
      const criticalRoutes = [
        () => import('@/pages/storage'),
        () => import('@/pages/cookbook'),
      ];
      
      criticalRoutes.forEach(route => {
        route().catch(err => {
          console.debug('Route prefetch failed (non-critical):', err);
        });
      });
    }, { timeout: 3000 });
  }
}

// Preconnect to external APIs for faster requests
export function preconnectToAPIs() {
  const apis = [
    'https://api.nal.usda.gov',
    'https://api.barcodelookup.com',
  ];
  
  apis.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}

// Resource hints for critical assets
export function addResourceHints() {
  // DNS prefetch for third-party domains
  const dnsPrefetchDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];
  
  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
}

// Lazy load images with intersection observer
export function setupLazyImageLoading() {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            const srcset = img.dataset.srcset;
            
            if (src) {
              img.src = src;
              delete img.dataset.src;
            }
            if (srcset) {
              img.srcset = srcset;
              delete img.dataset.srcset;
            }
            
            img.classList.add('loaded');
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );
    
    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
    
    return imageObserver;
  }
  
  // Fallback for browsers without IntersectionObserver
  document.querySelectorAll('img[data-src]').forEach(img => {
    const imgElement = img as HTMLImageElement;
    if (imgElement.dataset.src) {
      imgElement.src = imgElement.dataset.src;
    }
    if (imgElement.dataset.srcset) {
      imgElement.srcset = imgElement.dataset.srcset;
    }
  });
  
  return null;
}

// Progressive enhancement for network-aware loading
export function getNetworkSpeed(): 'slow' | 'medium' | 'fast' | 'unknown' {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  
  if (!connection) return 'unknown';
  
  // Check effective type (4g, 3g, 2g, slow-2g)
  if (connection.effectiveType) {
    switch (connection.effectiveType) {
      case '4g':
        return 'fast';
      case '3g':
        return 'medium';
      case '2g':
      case 'slow-2g':
        return 'slow';
      default:
        return 'medium';
    }
  }
  
  // Fallback to downlink speed
  if (connection.downlink) {
    if (connection.downlink > 5) return 'fast';
    if (connection.downlink > 1) return 'medium';
    return 'slow';
  }
  
  return 'unknown';
}

// Memory-aware loading
export function getMemoryStatus(): 'low' | 'medium' | 'high' | 'unknown' {
  const nav = navigator as any;
  
  if (!nav.deviceMemory) return 'unknown';
  
  const memory = nav.deviceMemory;
  
  if (memory >= 8) return 'high';
  if (memory >= 4) return 'medium';
  return 'low';
}

// Adaptive loading based on device capabilities
export function getLoadingStrategy() {
  const networkSpeed = getNetworkSpeed();
  const memoryStatus = getMemoryStatus();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Conservative loading for constrained devices
  if (networkSpeed === 'slow' || memoryStatus === 'low' || isMobile) {
    return {
      prefetchRoutes: false,
      lazyLoadImages: true,
      reducedMotion: true,
      limitConcurrentRequests: 2,
      cacheAggressively: true,
    };
  }
  
  // Balanced loading for average devices
  if (networkSpeed === 'medium' || memoryStatus === 'medium') {
    return {
      prefetchRoutes: true,
      lazyLoadImages: true,
      reducedMotion: false,
      limitConcurrentRequests: 4,
      cacheAggressively: true,
    };
  }
  
  // Aggressive loading for powerful devices
  return {
    prefetchRoutes: true,
    lazyLoadImages: false,
    reducedMotion: false,
    limitConcurrentRequests: 6,
    cacheAggressively: false,
  };
}

// Request idle callback polyfill
export function requestIdleCallbackPolyfill(callback: IdleRequestCallback, options?: IdleRequestOptions) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Polyfill with setTimeout
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    } as IdleDeadline);
  }, 1) as unknown as number;
}

// Initialize all performance optimizations
export function initializePerformanceOptimizations() {
  // Start optimizations after initial render
  requestIdleCallbackPolyfill(() => {
    const strategy = getLoadingStrategy();
    
    // Always add resource hints
    addResourceHints();
    preconnectToAPIs();
    
    // Conditionally prefetch routes
    if (strategy.prefetchRoutes) {
      prefetchCriticalRoutes();
    }
    
    // Set up lazy loading for images
    if (strategy.lazyLoadImages) {
      setupLazyImageLoading();
    }
    
    // Apply reduced motion if needed
    if (strategy.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    }
    
    // Log performance metrics in development
    if (import.meta.env.DEV) {
      console.log('Performance strategy:', strategy);
      console.log('Network speed:', getNetworkSpeed());
      console.log('Memory status:', getMemoryStatus());
    }
  }, { timeout: 2000 });
}