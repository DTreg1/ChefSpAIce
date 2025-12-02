/**
 * Fraud Detection Accuracy Validation Test
 *
 * This test validates that the fraud detection system achieves
 * the required 90% accuracy in detecting unusual transaction patterns.
 */

import { FraudDetectionService } from "../services/fraud.service";

// Test dataset with known fraud/legitimate patterns
const testPatterns = [
  // Known fraudulent patterns (should be detected)
  {
    id: "fraud-1",
    type: "rapid_transactions",
    metadata: { count: 100, timeWindow: 60, amount: 10000 },
    expectedFraud: true,
    description: "Rapid high-value transactions",
  },
  {
    id: "fraud-2",
    type: "account_takeover",
    metadata: { loginAttempts: 50, timeWindow: 300, differentIPs: 10 },
    expectedFraud: true,
    description: "Multiple login attempts from different IPs",
  },
  {
    id: "fraud-3",
    type: "card_testing",
    metadata: {
      failedTransactions: 20,
      successfulTransactions: 1,
      timeWindow: 600,
    },
    expectedFraud: true,
    description: "Card testing pattern with multiple failures",
  },
  {
    id: "fraud-4",
    type: "velocity_abuse",
    metadata: { transactionCount: 500, timeWindow: 3600, averageAmount: 5 },
    expectedFraud: true,
    description: "Abnormal transaction velocity",
  },
  {
    id: "fraud-5",
    type: "geo_hopping",
    metadata: { locations: ["US", "RU", "CN", "BR"], timeWindow: 300 },
    expectedFraud: true,
    description: "Transactions from multiple countries in short time",
  },
  {
    id: "fraud-6",
    type: "account_creation_abuse",
    metadata: { accountsCreated: 10, fromSameIP: true, timeWindow: 600 },
    expectedFraud: true,
    description: "Multiple accounts from same IP",
  },
  {
    id: "fraud-7",
    type: "unusual_purchase",
    metadata: {
      amount: 50000,
      userAverageSpend: 100,
      itemCategory: "electronics",
    },
    expectedFraud: true,
    description: "Purchase far exceeding normal spending",
  },
  {
    id: "fraud-8",
    type: "identity_theft",
    metadata: {
      nameChange: true,
      addressChange: true,
      immediateTransaction: true,
    },
    expectedFraud: true,
    description: "Profile changes followed by immediate transaction",
  },
  {
    id: "fraud-9",
    type: "bot_behavior",
    metadata: {
      actionsPerMinute: 100,
      mouseMovement: "linear",
      keyboardTiming: "uniform",
    },
    expectedFraud: true,
    description: "Automated bot-like behavior patterns",
  },
  {
    id: "fraud-10",
    type: "payment_fraud",
    metadata: { paymentMethod: "stolen_card", billingAddressMismatch: true },
    expectedFraud: true,
    description: "Stolen payment method indicators",
  },

  // Known legitimate patterns (should NOT be detected as fraud)
  {
    id: "legit-1",
    type: "normal_purchase",
    metadata: { amount: 50, userAverageSpend: 75, itemCategory: "groceries" },
    expectedFraud: false,
    description: "Normal grocery purchase",
  },
  {
    id: "legit-2",
    type: "regular_login",
    metadata: { loginAttempts: 1, knownDevice: true, knownLocation: true },
    expectedFraud: false,
    description: "Regular login from known device",
  },
  {
    id: "legit-3",
    type: "seasonal_shopping",
    metadata: { amount: 500, timeOfYear: "december", itemCategory: "gifts" },
    expectedFraud: false,
    description: "Holiday shopping spike",
  },
  {
    id: "legit-4",
    type: "travel_purchase",
    metadata: { location: "different_country", travelBookingExists: true },
    expectedFraud: false,
    description: "Purchase during documented travel",
  },
  {
    id: "legit-5",
    type: "bulk_purchase",
    metadata: { amount: 1000, businessAccount: true, regularPattern: true },
    expectedFraud: false,
    description: "Regular business bulk purchase",
  },
  {
    id: "legit-6",
    type: "subscription_renewal",
    metadata: { amount: 99, recurring: true, sameVendor: true },
    expectedFraud: false,
    description: "Regular subscription renewal",
  },
  {
    id: "legit-7",
    type: "family_sharing",
    metadata: { multipleDevices: true, familyAccount: true },
    expectedFraud: false,
    description: "Family members using shared account",
  },
  {
    id: "legit-8",
    type: "gradual_increase",
    metadata: { spendingTrend: "gradual_increase", timeFrame: "months" },
    expectedFraud: false,
    description: "Gradual increase in spending over time",
  },
  {
    id: "legit-9",
    type: "verified_large_purchase",
    metadata: { amount: 5000, twoFactorAuth: true, emailConfirmed: true },
    expectedFraud: false,
    description: "Large purchase with proper verification",
  },
  {
    id: "legit-10",
    type: "regular_pattern",
    metadata: {
      consistentTime: true,
      consistentAmount: true,
      consistentVendor: true,
    },
    expectedFraud: false,
    description: "Regular repeating pattern",
  },
];

async function validateAccuracy(): Promise<void> {
  console.log("🔍 Fraud Detection Accuracy Validation Test");
  console.log("==========================================");
  console.log(`Testing ${testPatterns.length} patterns...\n`);

  const service = new FraudDetectionService();
  let correctDetections = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const pattern of testPatterns) {
    const result = await service.analyzeTransaction(
      `test-user-${pattern.id}`,
      pattern.type,
      pattern.metadata,
    );

    // Determine if fraud was correctly detected
    const detectedAsFraud = result.shouldBlock || result.fraudScore > 0.75;
    const isCorrect = detectedAsFraud === pattern.expectedFraud;

    if (isCorrect) {
      correctDetections++;
      console.log(
        `✅ ${pattern.id}: Correctly identified as ${pattern.expectedFraud ? "FRAUD" : "LEGITIMATE"}`,
      );
      console.log(
        `   Score: ${(result.fraudScore * 100).toFixed(1)}% | ${pattern.description}`,
      );
    } else {
      if (detectedAsFraud && !pattern.expectedFraud) {
        falsePositives++;
        console.log(
          `❌ ${pattern.id}: FALSE POSITIVE - Legitimate flagged as fraud`,
        );
        console.log(
          `   Score: ${(result.fraudScore * 100).toFixed(1)}% | ${pattern.description}`,
        );
      } else {
        falseNegatives++;
        console.log(`❌ ${pattern.id}: FALSE NEGATIVE - Fraud not detected`);
        console.log(
          `   Score: ${(result.fraudScore * 100).toFixed(1)}% | ${pattern.description}`,
        );
      }
    }
  }

  const accuracy = (correctDetections / testPatterns.length) * 100;
  const precision =
    (correctDetections / (correctDetections + falsePositives)) * 100;
  const recall =
    (correctDetections / (correctDetections + falseNegatives)) * 100;
  const f1Score = (2 * (precision * recall)) / (precision + recall);

  console.log("\n==========================================");
  console.log("📊 RESULTS SUMMARY");
  console.log("==========================================");
  console.log(`Total Patterns Tested: ${testPatterns.length}`);
  console.log(`Correct Detections: ${correctDetections}`);
  console.log(`False Positives: ${falsePositives}`);
  console.log(`False Negatives: ${falseNegatives}`);
  console.log(`\nAccuracy: ${accuracy.toFixed(1)}%`);
  console.log(`Precision: ${precision.toFixed(1)}%`);
  console.log(`Recall: ${recall.toFixed(1)}%`);
  console.log(`F1 Score: ${f1Score.toFixed(1)}%`);

  if (accuracy >= 90) {
    console.log(
      "\n✅ SUCCESS: Fraud detection system meets 90% accuracy requirement!",
    );
  } else {
    console.log(
      "\n❌ FAILURE: Fraud detection system does not meet 90% accuracy requirement.",
    );
    console.log("   Required: 90% | Achieved: " + accuracy.toFixed(1) + "%");
    process.exit(1);
  }
}

// Run the validation if this file is executed directly
if (require.main === module) {
  validateAccuracy().catch(console.error);
}

export { validateAccuracy, testPatterns };
