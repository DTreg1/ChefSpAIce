#!/usr/bin/env node

/**
 * Test script for the Content Moderation System
 * 
 * This script tests the moderation endpoints to ensure they're working correctly.
 * Run with: node test-moderation.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test content samples
const testContent = {
  safe: "This is a perfectly safe recipe for chocolate cake. Mix flour, sugar, cocoa, eggs, and milk.",
  mild: "This recipe is really stupid but it works. Just throw everything in a bowl!",
  offensive: "You're an idiot if you can't make this simple recipe. Even a moron could do it.",
  threat: "I'll come to your house and show you how to cook if you can't figure this out.",
  spam: "BUY CHEAP KITCHEN EQUIPMENT NOW!!! CLICK HERE!!! BEST DEALS!!! LIMITED TIME!!!",
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper function to print colored output
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Include cookies for authentication
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Test moderation check endpoint
async function testModerationCheck() {
  log('\n=== Testing Moderation Check Endpoint ===', colors.blue);
  
  for (const [type, content] of Object.entries(testContent)) {
    log(`\nTesting ${type} content...`, colors.cyan);
    
    const result = await makeRequest('POST', '/api/moderate/check', {
      content,
      contentType: 'recipe',
    });
    
    if (result.success) {
      const { allowed, blocked, flagged, severity, categories, confidence } = result.data;
      
      log(`Content: "${content.substring(0, 50)}..."`, colors.reset);
      log(`Result: ${allowed ? '✓ Allowed' : blocked ? '✗ Blocked' : '⚠ Flagged'}`, 
        allowed ? colors.green : blocked ? colors.red : colors.yellow);
      log(`Severity: ${severity || 'N/A'}`);
      log(`Confidence: ${confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A'}`);
      
      if (categories && categories.length > 0) {
        log(`Categories: ${categories.join(', ')}`);
      }
    } else {
      log(`Error: ${JSON.stringify(result.error)}`, colors.red);
    }
  }
}

// Test moderation statistics endpoint
async function testModerationStats() {
  log('\n=== Testing Moderation Statistics Endpoint ===', colors.blue);
  
  const result = await makeRequest('GET', '/api/moderate/stats?period=day');
  
  if (result.success) {
    const stats = result.data;
    log('Statistics retrieved successfully:', colors.green);
    log(`Total Checked: ${stats.totalChecked || 0}`);
    log(`Total Blocked: ${stats.totalBlocked || 0}`);
    log(`Total Flagged: ${stats.totalFlagged || 0}`);
    log(`Total Appeals: ${stats.totalAppeals || 0}`);
    log(`Average Confidence: ${stats.averageConfidence ? (stats.averageConfidence * 100).toFixed(1) + '%' : 'N/A'}`);
  } else {
    log(`Error: ${JSON.stringify(result.error)}`, colors.red);
  }
}

// Main test function
async function runTests() {
  log('========================================', colors.cyan);
  log('Content Moderation System Test Suite', colors.cyan);
  log('========================================', colors.cyan);
  
  try {
    // Note: In a real test, you'd need to authenticate first
    log('\nNote: These tests require authentication. Make sure you\'re logged in.', colors.yellow);
    
    // Run tests
    await testModerationCheck();
    await testModerationStats();
    
    log('\n========================================', colors.cyan);
    log('All tests completed!', colors.green);
    log('========================================', colors.cyan);
  } catch (error) {
    log(`\nTest suite failed: ${error.message}`, colors.red);
  }
}

// Run the tests
runTests();