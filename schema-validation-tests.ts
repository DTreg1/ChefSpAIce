/**
 * Schema Validation Tests
 * 
 * Simple tests to verify Zod schemas work correctly.
 * Run with: tsx schema-validation-tests.ts
 */

import {
  sentimentDataSchema,
  cohortDefinitionSchema,
  fraudRiskFactorSchema,
} from './shared/schema';

// Color codes for console output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function logTest(testName: string, expected: boolean, actual: boolean, details?: any) {
  const passed = expected === actual;
  const status = passed ? `${GREEN}✓ PASS${RESET}` : `${RED}✗ FAIL${RESET}`;
  console.log(`  ${status} - ${testName}`);
  
  if (!passed && details) {
    console.log(`    Expected: ${expected}, Got: ${actual}`);
    if (details.error) {
      console.log(`    Error: ${JSON.stringify(details.error.issues, null, 2)}`);
    }
  }
}

console.log(`\n${BOLD}=== Schema Validation Tests ===${RESET}\n`);

// ========================================
// 1. SentimentDataSchema Tests
// ========================================
console.log(`${BOLD}1. sentimentDataSchema${RESET}`);

// Test 1.1: Valid data - should pass
const validSentiment = {
  overallScore: 0.75,
  polarity: 'positive' as const,
  subjectivity: 0.6,
};
const result1_1 = sentimentDataSchema.safeParse(validSentiment);
logTest('Valid sentiment data passes', true, result1_1.success);

// Test 1.2: Valid data with optional fields
const validSentimentWithOptional = {
  overallScore: -0.5,
  polarity: 'negative' as const,
  subjectivity: 0.8,
  documentScore: 0.3,
  aspectScores: { food: 0.9, service: -0.2 },
};
const result1_2 = sentimentDataSchema.safeParse(validSentimentWithOptional);
logTest('Valid sentiment with optional fields passes', true, result1_2.success);

// Test 1.3: Invalid overallScore (out of range)
const invalidSentiment1 = {
  overallScore: 2.0, // Should be between -1 and 1
  polarity: 'positive' as const,
  subjectivity: 0.6,
};
const result1_3 = sentimentDataSchema.safeParse(invalidSentiment1);
logTest('Rejects overallScore out of range (2.0)', false, result1_3.success, { error: result1_3.error });

// Test 1.4: Invalid polarity enum value
const invalidSentiment2 = {
  overallScore: 0.5,
  polarity: 'happy', // Should be 'positive', 'negative', or 'neutral'
  subjectivity: 0.6,
};
const result1_4 = sentimentDataSchema.safeParse(invalidSentiment2);
logTest('Rejects invalid enum value for polarity', false, result1_4.success, { error: result1_4.error });

// Test 1.5: Missing required field
const invalidSentiment3 = {
  overallScore: 0.5,
  // Missing polarity (required)
  subjectivity: 0.6,
};
const result1_5 = sentimentDataSchema.safeParse(invalidSentiment3);
logTest('Rejects missing required field (polarity)', false, result1_5.success, { error: result1_5.error });

// Test 1.6: Invalid type for subjectivity
const invalidSentiment4 = {
  overallScore: 0.5,
  polarity: 'positive' as const,
  subjectivity: 'high', // Should be number
};
const result1_6 = sentimentDataSchema.safeParse(invalidSentiment4);
logTest('Rejects invalid type (string instead of number)', false, result1_6.success, { error: result1_6.error });

// Test 1.7: Optional fields can be omitted
const validSentimentMinimal = {
  overallScore: 0.0,
  polarity: 'neutral' as const,
  subjectivity: 0.5,
};
const result1_7 = sentimentDataSchema.safeParse(validSentimentMinimal);
logTest('Optional fields can be omitted', true, result1_7.success);

console.log('');

// ========================================
// 2. CohortDefinitionSchema Tests
// ========================================
console.log(`${BOLD}2. cohortDefinitionSchema${RESET}`);

// Test 2.1: Valid cohort definition with all fields
const validCohort = {
  signupDateRange: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
  userAttributes: {
    plan: 'premium',
    region: 'US',
  },
  behaviorCriteria: {
    events: ['login', 'purchase'],
    minSessionCount: 5,
    minEngagementScore: 0.7,
  },
  customQueries: ['SELECT * FROM users WHERE active = true'],
  source: 'product_hunt',
};
const result2_1 = cohortDefinitionSchema.safeParse(validCohort);
logTest('Valid cohort definition with all fields passes', true, result2_1.success);

// Test 2.2: Valid with only some optional fields
const validCohortPartial = {
  signupDateRange: {
    start: '2024-06-01',
    end: '2024-06-30',
  },
  source: 'organic',
};
const result2_2 = cohortDefinitionSchema.safeParse(validCohortPartial);
logTest('Valid cohort with partial optional fields passes', true, result2_2.success);

// Test 2.3: Empty object (all fields optional)
const validCohortEmpty = {};
const result2_3 = cohortDefinitionSchema.safeParse(validCohortEmpty);
logTest('Empty cohort definition passes (all fields optional)', true, result2_3.success);

// Test 2.4: Invalid signupDateRange (missing required nested field)
const invalidCohort1 = {
  signupDateRange: {
    start: '2024-01-01',
    // Missing 'end' field
  },
};
const result2_4 = cohortDefinitionSchema.safeParse(invalidCohort1);
logTest('Rejects signupDateRange missing required nested field', false, result2_4.success, { error: result2_4.error });

// Test 2.5: Invalid minSessionCount (not an integer)
const invalidCohort2 = {
  behaviorCriteria: {
    minSessionCount: 5.5, // Should be integer
  },
};
const result2_5 = cohortDefinitionSchema.safeParse(invalidCohort2);
logTest('Rejects non-integer minSessionCount', false, result2_5.success, { error: result2_5.error });

// Test 2.6: Invalid minSessionCount (negative number)
const invalidCohort3 = {
  behaviorCriteria: {
    minSessionCount: -5, // Should be non-negative
  },
};
const result2_6 = cohortDefinitionSchema.safeParse(invalidCohort3);
logTest('Rejects negative minSessionCount', false, result2_6.success, { error: result2_6.error });

// Test 2.7: Invalid events (not an array of strings)
const invalidCohort4 = {
  behaviorCriteria: {
    events: ['login', 123, 'purchase'], // Contains number
  },
};
const result2_7 = cohortDefinitionSchema.safeParse(invalidCohort4);
logTest('Rejects events array with non-string elements', false, result2_7.success, { error: result2_7.error });

console.log('');

// ========================================
// 3. FraudRiskFactorSchema Tests
// ========================================
console.log(`${BOLD}3. fraudRiskFactorSchema${RESET}`);

// Test 3.1: Valid fraud risk factor
const validFraudRisk = {
  behaviorScore: 0.75,
  accountAgeScore: 0.3,
  transactionVelocityScore: 0.85,
  contentPatternScore: 0.6,
  networkScore: 0.4,
  deviceScore: 0.5,
  geoScore: 0.2,
  details: {
    ip: '192.168.1.1',
    country: 'US',
    previousViolations: 2,
  },
};
const result3_1 = fraudRiskFactorSchema.safeParse(validFraudRisk);
logTest('Valid fraud risk factor passes', true, result3_1.success);

// Test 3.2: Edge case - all scores at 0
const validFraudRiskMin = {
  behaviorScore: 0.0,
  accountAgeScore: 0.0,
  transactionVelocityScore: 0.0,
  contentPatternScore: 0.0,
  networkScore: 0.0,
  deviceScore: 0.0,
  geoScore: 0.0,
  details: {},
};
const result3_2 = fraudRiskFactorSchema.safeParse(validFraudRiskMin);
logTest('Valid fraud risk with minimum scores (0.0) passes', true, result3_2.success);

// Test 3.3: Edge case - all scores at 1
const validFraudRiskMax = {
  behaviorScore: 1.0,
  accountAgeScore: 1.0,
  transactionVelocityScore: 1.0,
  contentPatternScore: 1.0,
  networkScore: 1.0,
  deviceScore: 1.0,
  geoScore: 1.0,
  details: { highRisk: true },
};
const result3_3 = fraudRiskFactorSchema.safeParse(validFraudRiskMax);
logTest('Valid fraud risk with maximum scores (1.0) passes', true, result3_3.success);

// Test 3.4: Invalid - score out of range (too high)
const invalidFraudRisk1 = {
  behaviorScore: 1.5, // Out of range (0-1)
  accountAgeScore: 0.3,
  transactionVelocityScore: 0.85,
  contentPatternScore: 0.6,
  networkScore: 0.4,
  deviceScore: 0.5,
  geoScore: 0.2,
  details: {},
};
const result3_4 = fraudRiskFactorSchema.safeParse(invalidFraudRisk1);
logTest('Rejects behaviorScore out of range (1.5)', false, result3_4.success, { error: result3_4.error });

// Test 3.5: Invalid - score out of range (negative)
const invalidFraudRisk2 = {
  behaviorScore: 0.5,
  accountAgeScore: -0.1, // Negative not allowed
  transactionVelocityScore: 0.85,
  contentPatternScore: 0.6,
  networkScore: 0.4,
  deviceScore: 0.5,
  geoScore: 0.2,
  details: {},
};
const result3_5 = fraudRiskFactorSchema.safeParse(invalidFraudRisk2);
logTest('Rejects negative score (-0.1)', false, result3_5.success, { error: result3_5.error });

// Test 3.6: Missing required field
const invalidFraudRisk3 = {
  behaviorScore: 0.5,
  // Missing accountAgeScore (required)
  transactionVelocityScore: 0.85,
  contentPatternScore: 0.6,
  networkScore: 0.4,
  deviceScore: 0.5,
  geoScore: 0.2,
  details: {},
};
const result3_6 = fraudRiskFactorSchema.safeParse(invalidFraudRisk3);
logTest('Rejects missing required field (accountAgeScore)', false, result3_6.success, { error: result3_6.error });

// Test 3.7: Invalid details type (should be Record)
const invalidFraudRisk4 = {
  behaviorScore: 0.5,
  accountAgeScore: 0.3,
  transactionVelocityScore: 0.85,
  contentPatternScore: 0.6,
  networkScore: 0.4,
  deviceScore: 0.5,
  geoScore: 0.2,
  details: 'invalid', // Should be object
};
const result3_7 = fraudRiskFactorSchema.safeParse(invalidFraudRisk4);
logTest('Rejects invalid details type (string instead of Record)', false, result3_7.success, { error: result3_7.error });

console.log('');

// ========================================
// Summary
// ========================================
console.log(`${BOLD}=== Test Summary ===${RESET}\n`);

const totalTests = 21;
const passedTests = [
  result1_1, result1_2, result1_7,  // Sentiment: 3 passed
  result2_1, result2_2, result2_3,  // Cohort: 3 passed
  result3_1, result3_2, result3_3,  // Fraud: 3 passed
].filter(r => r.success).length;

const failedAsExpectedTests = [
  !result1_3.success, !result1_4.success, !result1_5.success, !result1_6.success, // Sentiment: 4 failed as expected
  !result2_4.success, !result2_5.success, !result2_6.success, !result2_7.success, // Cohort: 4 failed as expected
  !result3_4.success, !result3_5.success, !result3_6.success, !result3_7.success, // Fraud: 4 failed as expected
].filter(Boolean).length;

const totalPassing = passedTests + failedAsExpectedTests;

console.log(`Total tests run: ${totalTests}`);
console.log(`${GREEN}Tests passing: ${totalPassing}/${totalTests}${RESET}`);
console.log(`${passedTests} validation successes + ${failedAsExpectedTests} rejections (as expected)`);

if (totalPassing === totalTests) {
  console.log(`\n${GREEN}${BOLD}✓ All schemas validated correctly!${RESET}\n`);
} else {
  console.log(`\n${RED}${BOLD}✗ Some tests failed${RESET}\n`);
  process.exit(1);
}
