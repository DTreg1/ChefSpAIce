// Test TTL configuration parsing
import { ApiCacheService } from '../utils/ApiCacheService';

// console.log('=== TTL Configuration Test ===\n');

// Test 1: Default configuration
// console.log('Test 1: Default TTL Configuration');
process.env.CACHE_TTL_FOOD_DAYS = undefined;
process.env.CACHE_TTL_SEARCH_DAYS = undefined;

const defaultCache = new ApiCacheService();
const defaultConfig = (defaultCache as any).config;

// console.log('✓ Default TTLs (should be in milliseconds):');
// console.log('  - Food: ', defaultConfig.ttlConfig['usda.food'] / (24 * 60 * 60 * 1000), 'days');
// console.log('  - Search: ', defaultConfig.ttlConfig['usda.search'] / (24 * 60 * 60 * 1000), 'days');
// console.log('  - Nutrients: ', defaultConfig.ttlConfig['usda.nutrients'] / (24 * 60 * 60 * 1000), 'days');
// console.log('  - Branded: ', defaultConfig.ttlConfig['usda.branded'] / (24 * 60 * 60 * 1000), 'days');

// Test 2: Override with days
// console.log('\nTest 2: Override with days');
process.env.CACHE_TTL_FOOD_DAYS = '60';  // 60 days
process.env.CACHE_TTL_SEARCH_DAYS = '14'; // 14 days

const customCache = new ApiCacheService();
const customConfig = (customCache as any).config;

// console.log('✓ Custom TTLs (specified in days):');
// console.log('  - Food: ', customConfig.ttlConfig['usda.food'] / (24 * 60 * 60 * 1000), 'days (expected: 60)');
// console.log('  - Search: ', customConfig.ttlConfig['usda.search'] / (24 * 60 * 60 * 1000), 'days (expected: 14)');

// Test 3: Backward compatibility with milliseconds
// console.log('\nTest 3: Backward compatibility with milliseconds');
process.env.CACHE_TTL_FOOD_DAYS = '86400000';  // 1 day in milliseconds
process.env.CACHE_TTL_SEARCH_DAYS = '604800000'; // 7 days in milliseconds

const msCache = new ApiCacheService();
const msConfig = (msCache as any).config;

// console.log('✓ TTLs specified in milliseconds (values >= 365):');
// console.log('  - Food: ', Math.round(msConfig.ttlConfig['usda.food'] / (24 * 60 * 60 * 1000)), 'days (expected: 1)');
// console.log('  - Search: ', Math.round(msConfig.ttlConfig['usda.search'] / (24 * 60 * 60 * 1000)), 'days (expected: 7)');

// Test 4: Verify required TTLs
// console.log('\nTest 4: Verify Required TTL Values');
// Reset to required values
process.env.CACHE_TTL_FOOD_DAYS = '30';
process.env.CACHE_TTL_SEARCH_DAYS = '7';
process.env.CACHE_TTL_NUTRIENTS_DAYS = '90';
process.env.CACHE_TTL_BRANDED_DAYS = '14';
process.env.CACHE_TTL_BARCODE_DAYS = '14';

const requiredCache = new ApiCacheService();
const requiredConfig = (requiredCache as any).config;

const requiredTTLs = {
  'usda.food': 30,
  'usda.search': 7,
  'usda.nutrients': 90,
  'usda.branded': 14,
  'barcode': 14
};

let allCorrect = true;
for (const [key, expectedDays] of Object.entries(requiredTTLs)) {
  const actualDays = requiredConfig.ttlConfig[key] / (24 * 60 * 60 * 1000);
  const isCorrect = actualDays === expectedDays;
  // console.log(`  ${isCorrect ? '✓' : '✗'} ${key}: ${actualDays} days (expected: ${expectedDays})`);
  allCorrect = allCorrect && isCorrect;
}

// console.log(`\n${allCorrect ? '✅ All required TTL values are correct!' : '❌ Some TTL values are incorrect!'}`);
// console.log('\n=== TTL Configuration Test Complete ===');

process.exit(allCorrect ? 0 : 1);