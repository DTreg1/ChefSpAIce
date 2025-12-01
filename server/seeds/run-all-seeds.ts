import { storage } from '../storage/index';
import { type InsertAbTest, type InsertAbTestResult, type InsertAbTestVariantMetric, type AbTest } from '@shared/schema';

async function seedAbTests() {
  console.log("🧪 Seeding A/B test data...");
  
  const tests: InsertAbTest[] = [
    {
      testName: 'Homepage CTA Button Color Test',
      description: 'Testing button color and text impact on conversion',
      hypothesis: 'Changing the button color and text will increase click-through rate by 15%',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'running',
      targetSampleSize: 5000,
      currentSampleSize: 4985,
      configuration: {
        controlGroup: { size: 0.5, features: { buttonColor: 'blue', buttonText: 'Sign Up' } },
        variants: [{ name: 'variant_b', size: 0.5, features: { buttonColor: 'green', buttonText: 'Get Started' } }],
        targetingCriteria: { featureArea: 'homepage', minimumSampleSize: 1000, confidenceLevel: 0.95 }
      },
    },
    {
      testName: 'Checkout Form Length Optimization',
      description: 'Testing single-page vs multi-step checkout form',
      hypothesis: 'Breaking the form into steps will reduce friction and increase completion rate',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'completed',
      targetSampleSize: 10000,
      currentSampleSize: 9950,
      configuration: {
        controlGroup: { size: 0.5, features: { formType: 'single-page', allFieldsVisible: true } },
        variants: [{ name: 'variant_b', size: 0.5, features: { formType: 'multi-step', progressIndicator: true } }],
        targetingCriteria: { featureArea: 'checkout', minimumSampleSize: 2000, confidenceLevel: 0.95 }
      },
    },
    {
      testName: 'Recipe Card Layout Test',
      description: 'Testing grid vs list layout for recipe discovery',
      hypothesis: 'Grid layout will increase recipe engagement by 20%',
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: 'running',
      targetSampleSize: 3000,
      currentSampleSize: 856,
      configuration: {
        controlGroup: { size: 0.5, features: { layout: 'list' } },
        variants: [{ name: 'variant_b', size: 0.5, features: { layout: 'grid' } }],
        targetingCriteria: { featureArea: 'recipes', minimumSampleSize: 500, confidenceLevel: 0.95 }
      },
    }
  ];

  const createdTests: AbTest[] = [];
  for (const test of tests) {
    const created = await storage.admin.experiments.createAbTest(test);
    createdTests.push(created);
  }
  console.log(`  ✓ Created ${createdTests.length} A/B tests`);

  const results: InsertAbTestResult[] = [];
  for (let i = 0; i < 50; i++) {
    results.push({
      testId: createdTests[0].id,
      variant: i % 2 === 0 ? 'control' : 'variant_b',
      converted: Math.random() > 0.85,
      metadata: { buttonClicks: Math.floor(Math.random() * 5), timeOnPage: Math.floor(Math.random() * 120) + 10 }
    });
  }

  for (let i = 0; i < 100; i++) {
    const isControl = i % 2 === 0;
    results.push({
      testId: createdTests[1].id,
      variant: isControl ? 'control' : 'variant_b',
      converted: isControl ? Math.random() > 0.75 : Math.random() > 0.60,
      metadata: { formCompletionTime: isControl ? Math.floor(Math.random() * 180) + 60 : Math.floor(Math.random() * 120) + 45 }
    });
  }

  for (const result of results) {
    await storage.admin.experiments.upsertAbTestResult(result);
  }
  console.log(`  ✓ Created ${results.length} test results`);

  const variantMetrics: InsertAbTestVariantMetric[] = [
    {
      testId: createdTests[1].id,
      variant: 'control',
      sampleSize: 4975,
      conversionRate: 0.25,
      confidence: 0.95,
      pValue: 0.032,
      isSignificant: true,
      averageValue: 142.50,
      standardDeviation: 28.30,
      calculatedAt: new Date(),
      recommendation: 'Control group shows baseline performance'
    },
    {
      testId: createdTests[1].id,
      variant: 'variant_b',
      sampleSize: 4975,
      conversionRate: 0.40,
      confidence: 0.98,
      pValue: 0.001,
      isSignificant: true,
      averageValue: 98.75,
      standardDeviation: 22.10,
      calculatedAt: new Date(),
      recommendation: 'Implement variant B - Multi-step form shows significant improvement with 60% lift'
    }
  ];

  for (const metric of variantMetrics) {
    await storage.admin.experiments.upsertAbTestVariantMetric(metric);
  }
  console.log(`  ✓ Created ${variantMetrics.length} variant metrics`);
  
  return { tests: createdTests.length, results: results.length, metrics: variantMetrics.length };
}

async function seedCohorts() {
  console.log("🎯 Seeding cohort data...");
  
  const januaryCohort = await storage.admin.experiments.createCohort({
    cohortName: "January 2025 Signups",
    criteria: { userAttributes: { signupDateRange: { start: "2025-01-01", end: "2025-01-31" }, source: "organic" } },
    userCount: 150,
    isActive: true
  });
  
  const februaryCohort = await storage.admin.experiments.createCohort({
    cohortName: "February 2025 Signups",
    criteria: { userAttributes: { signupDateRange: { start: "2025-02-01", end: "2025-02-28" }, source: "paid_search" } },
    userCount: 200,
    isActive: true
  });
  
  const marchCohort = await storage.admin.experiments.createCohort({
    cohortName: "March 2025 Signups",
    criteria: { userAttributes: { signupDateRange: { start: "2025-03-01", end: "2025-03-31" }, source: "social_media" } },
    userCount: 175,
    isActive: true
  });
  
  console.log(`  ✓ Created 3 cohorts`);
  
  const insights = [
    {
      cohortId: januaryCohort.id,
      insightType: 'retention' as const,
      insight: 'January cohort shows 58% retention at day 30, outperforming historical average by 12%. Strong Day-30 Retention indicates effective onboarding.',
      confidence: 0.92,
      impact: 'high' as const,
      recommendations: ['Continue current onboarding flow', 'A/B test email cadence']
    },
    {
      cohortId: februaryCohort.id,
      insightType: 'engagement' as const,
      insight: 'February cohort experiences 13% drop between day 1 and day 7, higher than expected 8%. Week 1 engagement needs improvement.',
      confidence: 0.85,
      impact: 'medium' as const,
      recommendations: ['Review day 2-3 email content', 'Add in-app nudges']
    },
    {
      cohortId: marchCohort.id,
      insightType: 'growth' as const,
      insight: 'March cohort from social media shows strong initial engagement at 82% day 1 retention. Social acquisition channel performing well.',
      confidence: 0.78,
      impact: 'medium' as const,
      recommendations: ['Increase social media budget', 'Test new ad creatives']
    }
  ];
  
  for (const insight of insights) {
    await storage.admin.experiments.createCohortInsight(insight);
  }
  console.log(`  ✓ Created ${insights.length} cohort insights`);
  
  return { cohorts: 3, insights: insights.length };
}

async function runAllSeeds() {
  console.log("\n📦 Running all seed files...\n");
  
  try {
    const abTestResults = await seedAbTests();
    const cohortResults = await seedCohorts();
    
    console.log("\n✅ All seeds completed successfully!");
    console.log(`   A/B Tests: ${abTestResults.tests} tests, ${abTestResults.results} results, ${abTestResults.metrics} metrics`);
    console.log(`   Cohorts: ${cohortResults.cohorts} cohorts, ${cohortResults.insights} insights\n`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

runAllSeeds();
