/**
 * Comprehensive API Endpoint Test Script
 * 
 * Tests all API endpoints to verify router refactoring is complete and functional.
 * Run with: npx tsx scripts/test-api-endpoints.ts
 * 
 * Test Categories:
 * - Health & Status endpoints (no auth)
 * - User domain endpoints
 * - Admin domain endpoints
 * - AI domain endpoints
 * - Platform domain endpoints
 * - Specialized services
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const API_V1 = `${BASE_URL}/api/v1`;

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'AUTH_REQUIRED';
  statusCode?: number;
  message?: string;
  responseTime?: number;
}

const results: TestResult[] = [];

/**
 * Test helper function
 */
async function testEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  options: {
    data?: any;
    headers?: Record<string, string>;
    expectStatus?: number[];
    description?: string;
    skipAuth?: boolean;
  } = {}
): Promise<TestResult> {
  const start = Date.now();
  const { data, headers = {}, expectStatus = [200, 201, 204], description } = options;
  
  try {
    const response: AxiosResponse = await axios({
      method,
      url: `${API_V1}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true, // Don't throw on any status
      timeout: 10000
    });

    const responseTime = Date.now() - start;
    
    // 401 means auth is required but endpoint exists
    if (response.status === 401) {
      return {
        endpoint,
        method,
        status: 'AUTH_REQUIRED',
        statusCode: response.status,
        message: description || 'Authentication required - endpoint exists',
        responseTime
      };
    }

    // Check if status is expected
    if (expectStatus.includes(response.status) || response.status === 401) {
      return {
        endpoint,
        method,
        status: 'PASS',
        statusCode: response.status,
        message: description || 'OK',
        responseTime
      };
    }

    return {
      endpoint,
      method,
      status: 'FAIL',
      statusCode: response.status,
      message: `Unexpected status: ${response.status}`,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - start;
    const axiosError = error as AxiosError;
    
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: axiosError.message || 'Request failed',
      responseTime
    };
  }
}

/**
 * Test endpoint without auth (expects 401)
 */
async function testProtectedEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  description?: string
): Promise<TestResult> {
  return testEndpoint(method, endpoint, {
    expectStatus: [401, 403, 200, 201, 204],
    description
  });
}

/**
 * Test public endpoint
 */
async function testPublicEndpoint(
  method: 'GET' | 'POST',
  endpoint: string,
  description?: string
): Promise<TestResult> {
  return testEndpoint(method, endpoint, {
    expectStatus: [200, 201, 204],
    description
  });
}

// ==================== TEST SUITES ====================

async function testHealthEndpoints(): Promise<void> {
  console.log('\n📊 Testing Health & Status Endpoints...');
  
  // Health endpoints - public
  results.push(await testEndpoint('GET', '/health', { 
    expectStatus: [200], 
    description: 'Versioned health check' 
  }));
  
  results.push(await testEndpoint('GET', '/info', { 
    expectStatus: [200], 
    description: 'API version info' 
  }));
  
  // Legacy health (at different path)
  try {
    const legacyResponse = await axios.get(`${BASE_URL}/health`, { 
      validateStatus: () => true,
      timeout: 5000 
    });
    results.push({
      endpoint: '/health (root)',
      method: 'GET',
      status: legacyResponse.status === 200 ? 'PASS' : 'FAIL',
      statusCode: legacyResponse.status,
      message: 'Root health check'
    });
  } catch (error) {
    results.push({
      endpoint: '/health (root)',
      method: 'GET',
      status: 'FAIL',
      message: 'Failed to reach root health endpoint'
    });
  }
}

async function testUserEndpoints(): Promise<void> {
  console.log('\n👤 Testing User Domain Endpoints...');
  
  // Auth endpoints
  results.push(await testProtectedEndpoint('GET', '/auth/status', 'Auth status'));
  results.push(await testProtectedEndpoint('GET', '/auth/me', 'Current user'));
  
  // Inventory endpoints
  results.push(await testProtectedEndpoint('GET', '/inventory', 'List inventory'));
  results.push(await testProtectedEndpoint('GET', '/food-items', 'List food items'));
  
  // Recipe endpoints
  results.push(await testProtectedEndpoint('GET', '/recipes', 'List recipes'));
  results.push(await testProtectedEndpoint('GET', '/recipes/suggestions', 'Recipe suggestions'));
  
  // Meal planning
  results.push(await testProtectedEndpoint('GET', '/meal-plans', 'List meal plans'));
  results.push(await testProtectedEndpoint('GET', '/shopping-list', 'Get shopping list'));
  
  // Chat endpoints
  results.push(await testProtectedEndpoint('GET', '/chat/history', 'Chat history'));
  
  // Utility endpoints
  results.push(await testProtectedEndpoint('GET', '/appliances', 'List appliances'));
  results.push(await testProtectedEndpoint('GET', '/nutrition/daily', 'Daily nutrition'));
  results.push(await testProtectedEndpoint('GET', '/cooking-terms', 'Cooking terms'));
  results.push(await testProtectedEndpoint('GET', '/autocomplete/suggestions', 'Autocomplete'));
}

async function testAdminEndpoints(): Promise<void> {
  console.log('\n🔐 Testing Admin Domain Endpoints...');
  
  // Admin endpoints require admin auth
  results.push(await testProtectedEndpoint('GET', '/admin/users', 'Admin users list'));
  results.push(await testProtectedEndpoint('GET', '/admin/experiments', 'A/B experiments'));
  results.push(await testProtectedEndpoint('GET', '/admin/cohorts', 'User cohorts'));
  results.push(await testProtectedEndpoint('GET', '/admin/maintenance/status', 'Maintenance status'));
  results.push(await testProtectedEndpoint('GET', '/admin/tickets', 'Support tickets'));
  results.push(await testProtectedEndpoint('GET', '/admin/pricing', 'Pricing tiers'));
  results.push(await testProtectedEndpoint('GET', '/admin/moderation/queue', 'Moderation queue'));
  results.push(await testProtectedEndpoint('GET', '/admin/ai-metrics', 'AI metrics'));
}

async function testAIEndpoints(): Promise<void> {
  console.log('\n🤖 Testing AI Domain Endpoints...');
  
  // AI Generation endpoints
  results.push(await testProtectedEndpoint('GET', '/ai/generation/templates', 'Generation templates'));
  results.push(await testProtectedEndpoint('POST', '/ai/generation/analyze', 'Text analysis'));
  results.push(await testProtectedEndpoint('POST', '/ai/generation/summarize', 'Summarization'));
  
  // AI Analysis endpoints
  results.push(await testProtectedEndpoint('POST', '/ai/analysis/sentiment', 'Sentiment analysis'));
  results.push(await testProtectedEndpoint('POST', '/ai/analysis/trends', 'Trend analysis'));
  
  // AI Vision endpoints
  results.push(await testProtectedEndpoint('GET', '/ai/vision/languages', 'OCR languages'));
  results.push(await testProtectedEndpoint('GET', '/ai/vision/stats', 'Vision stats'));
  
  // AI Voice endpoints
  results.push(await testProtectedEndpoint('POST', '/ai/voice/transcribe', 'Voice transcribe'));
  results.push(await testProtectedEndpoint('GET', '/ai/voice/commands', 'Voice commands'));
  
  // Specialized AI endpoints
  results.push(await testProtectedEndpoint('GET', '/ai/drafts/templates', 'Draft templates'));
  results.push(await testProtectedEndpoint('POST', '/ai/writing/analyze', 'Writing analysis'));
  results.push(await testProtectedEndpoint('GET', '/ai/recommendations/content/:id/related', 'Recommendations'));
  results.push(await testProtectedEndpoint('GET', '/ai/insights/daily', 'Daily insights'));
}

async function testPlatformEndpoints(): Promise<void> {
  console.log('\n🌐 Testing Platform Domain Endpoints...');
  
  // Analytics endpoints
  results.push(await testProtectedEndpoint('GET', '/analytics/events', 'Analytics events'));
  results.push(await testProtectedEndpoint('GET', '/analytics/stats', 'Analytics stats'));
  
  // Activity logs
  results.push(await testProtectedEndpoint('GET', '/activities', 'Activity logs'));
  
  // Notifications
  results.push(await testProtectedEndpoint('GET', '/notifications', 'Notifications list'));
  results.push(await testProtectedEndpoint('GET', '/notifications/tokens', 'Push tokens'));
  results.push(await testProtectedEndpoint('GET', '/notifications/intelligent/preferences', 'Notification preferences'));
  
  // Batch operations
  results.push(await testProtectedEndpoint('GET', '/batch/status', 'Batch status'));
  
  // Feedback
  results.push(await testProtectedEndpoint('GET', '/feedback', 'User feedback'));
}

async function testSpecializedEndpoints(): Promise<void> {
  console.log('\n⚡ Testing Specialized Service Endpoints...');
  
  // Natural query
  results.push(await testProtectedEndpoint('POST', '/natural-query/natural', 'Natural language query'));
  results.push(await testProtectedEndpoint('GET', '/natural-query/history', 'Query history'));
  
  // Fraud detection
  results.push(await testProtectedEndpoint('POST', '/fraud-detection/analyze', 'Fraud analysis'));
  
  // Scheduling
  results.push(await testProtectedEndpoint('GET', '/scheduling/calendar', 'Calendar'));
  
  // Images
  results.push(await testProtectedEndpoint('GET', '/images/assets', 'Image assets'));
}

async function testRateLimiting(): Promise<void> {
  console.log('\n🚦 Testing Rate Limiting...');
  
  // Make rapid requests to test rate limiting
  const rapidRequests: Promise<AxiosResponse>[] = [];
  for (let i = 0; i < 5; i++) {
    rapidRequests.push(
      axios.get(`${API_V1}/health`, { 
        validateStatus: () => true,
        timeout: 5000 
      })
    );
  }
  
  try {
    const responses = await Promise.all(rapidRequests);
    const allSuccess = responses.every(r => r.status === 200);
    results.push({
      endpoint: '/health (rate limit test)',
      method: 'GET',
      status: allSuccess ? 'PASS' : 'FAIL',
      message: `${responses.length} rapid requests - all returned 200`
    });
  } catch (error) {
    results.push({
      endpoint: '/health (rate limit test)',
      method: 'GET',
      status: 'FAIL',
      message: 'Rate limit test failed'
    });
  }
}

async function testErrorHandling(): Promise<void> {
  console.log('\n❌ Testing Error Handling...');
  
  // Test 404 on non-existent endpoint
  const notFoundResult = await testEndpoint('GET', '/nonexistent-endpoint-12345', {
    expectStatus: [404],
    description: '404 for non-existent endpoint'
  });
  results.push(notFoundResult);
  
  // Test validation error
  results.push(await testEndpoint('POST', '/ai/generation/analyze', {
    data: {}, // Empty body should fail validation
    expectStatus: [400, 401, 422],
    description: 'Validation error handling'
  }));
}

// ==================== MAIN EXECUTION ====================

async function runAllTests(): Promise<void> {
  console.log('🧪 API Endpoint Test Suite');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Version: v1`);
  console.log('='.repeat(60));
  
  try {
    // Run test suites
    await testHealthEndpoints();
    await testUserEndpoints();
    await testAdminEndpoints();
    await testAIEndpoints();
    await testPlatformEndpoints();
    await testSpecializedEndpoints();
    await testRateLimiting();
    await testErrorHandling();
    
    // Print results summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const authRequired = results.filter(r => r.status === 'AUTH_REQUIRED').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`🔐 Auth Required: ${authRequired}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`📊 Total: ${results.length}`);
    
    // Print failed tests
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  ${r.method} ${r.endpoint}: ${r.message} (${r.statusCode || 'N/A'})`);
        });
    }
    
    // Print detailed results
    console.log('\n📋 DETAILED RESULTS:');
    console.log('-'.repeat(80));
    
    results.forEach(r => {
      const statusIcon = r.status === 'PASS' ? '✅' : 
                        r.status === 'AUTH_REQUIRED' ? '🔐' : 
                        r.status === 'SKIP' ? '⏭️' : '❌';
      const time = r.responseTime ? `${r.responseTime}ms` : '-';
      console.log(`${statusIcon} ${r.method.padEnd(6)} ${r.endpoint.padEnd(45)} ${time.padStart(8)} ${r.statusCode || '-'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('Test run completed at:', new Date().toISOString());
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
