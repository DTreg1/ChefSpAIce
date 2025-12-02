// Test script for cache functionality
import { ApiCacheService } from "../utils/ApiCacheService";

// console.log('=== Cache Functionality Test ===\n');

// Test 1: Basic cache operations
// console.log('Test 1: Basic Cache Operations');
const cache = new ApiCacheService({ maxSize: 5 }); // Small cache size for testing

// Set some items
cache.set("test:1", { data: "value1" }, 1000); // 1 second TTL
cache.set("test:2", { data: "value2" }, 60000); // 60 seconds TTL
cache.set("test:3", { data: "value3" }, 60000);

// Test get
const value1 = cache.get("test:1");
// console.log('✓ Get test:1:', value1 ? 'Found' : 'Not found');

// Test stats
const stats = cache.getStats();
console.log("✓ Cache stats:", {
  entries: stats.size,
  hits: stats.totalHits,
  misses: stats.totalMisses,
  hitRate: (stats.hitRate * 100).toFixed(2) + "%",
});

// Test 2: TTL Expiration
// console.log('\nTest 2: TTL Expiration');
setTimeout(() => {
  const expiredValue = cache.get("test:1");
  // console.log('✓ After TTL expiry (1 sec):', expiredValue ? 'Still exists (ERROR!)' : 'Expired correctly');
}, 1500);

// Test 3: LRU Eviction
// console.log('\nTest 3: LRU Eviction');
// Fill cache to trigger eviction
cache.set("test:4", { data: "value4" }, 60000);
cache.set("test:5", { data: "value5" }, 60000);
cache.set("test:6", { data: "value6" }, 60000); // Should trigger eviction

const afterEvictionStats = cache.getStats();
// console.log('✓ After eviction - Cache size:', afterEvictionStats.size);
// console.log('✓ Evictions:', afterEvictionStats.evictions);

// Test 4: Cache invalidation
// console.log('\nTest 4: Cache Invalidation');
const invalidated = cache.invalidate("test:");
// console.log('✓ Invalidated entries matching "test:":', invalidated);

const afterInvalidateStats = cache.getStats();
// console.log('✓ Cache size after invalidation:', afterInvalidateStats.size);

// Test 5: Cache statistics detailed
// console.log('\nTest 5: Cache Statistics');
const detailedStats = cache.getStats();
console.log("✓ Detailed Stats:", {
  hitRate: (detailedStats.hitRate * 100).toFixed(2) + "%",
  totalHits: detailedStats.totalHits,
  totalMisses: detailedStats.totalMisses,
  evictions: detailedStats.evictions,
  avgAccessTime: detailedStats.avgAccessTime,
});

// Test 6: Cache clearing
// console.log('\nTest 6: Cache Clear');
cache.clear();
const afterClearStats = cache.getStats();
// console.log('✓ Cache size after clear:', afterClearStats.size);

// console.log('\n=== All Tests Completed ===');

// Exit after async tests complete
setTimeout(() => {
  process.exit(0);
}, 2000);
