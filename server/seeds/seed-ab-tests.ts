import { Router } from "express";
import { storage as defaultStorage } from "../storage/index";
import {
  type InsertAbTest,
  type InsertAbTestResult,
  type InsertAbTestVariantMetric,
  type AbTest,
} from "@shared/schema";

export function createABTestSeedEndpoint(storage: typeof defaultStorage) {
  const router = Router();

  router.post("/ab/seed", async (req, res) => {
    try {
      // Create sample A/B tests
      const tests: InsertAbTest[] = [
        {
          testName: "Homepage CTA Button Color Test",
          description: "Testing button color and text impact on conversion",
          hypothesis:
            "Changing the button color and text will increase click-through rate by 15%",
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: "running",
          targetSampleSize: 5000,
          currentSampleSize: 4985,
          configuration: {
            controlGroup: {
              size: 0.5,
              features: {
                buttonColor: "blue",
                buttonText: "Sign Up",
              },
            },
            variants: [
              {
                name: "variant_b",
                size: 0.5,
                features: {
                  buttonColor: "green",
                  buttonText: "Get Started",
                },
              },
            ],
            targetingCriteria: {
              featureArea: "homepage",
              minimumSampleSize: 1000,
              confidenceLevel: 0.95,
            },
          },
        },
        {
          testName: "Checkout Form Length Optimization",
          description: "Testing single-page vs multi-step checkout form",
          hypothesis:
            "Breaking the form into steps will reduce friction and increase completion rate",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // ended 5 days ago
          status: "completed",
          targetSampleSize: 10000,
          currentSampleSize: 9950,
          configuration: {
            controlGroup: {
              size: 0.5,
              features: {
                formType: "single-page",
                allFieldsVisible: true,
              },
            },
            variants: [
              {
                name: "variant_b",
                size: 0.5,
                features: {
                  formType: "multi-step",
                  progressIndicator: true,
                },
              },
            ],
            targetingCriteria: {
              featureArea: "checkout",
              minimumSampleSize: 2000,
              confidenceLevel: 0.95,
            },
          },
        },
        {
          testName: "Product Card Design Test",
          description: "Testing grid vs list layout for product cards",
          hypothesis:
            "Larger images and descriptions will increase product engagement",
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          status: "running",
          targetSampleSize: 3000,
          currentSampleSize: 2380,
          configuration: {
            controlGroup: {
              size: 0.5,
              features: {
                layout: "grid",
                imageSize: "small",
                showDescription: false,
              },
            },
            variants: [
              {
                name: "variant_b",
                size: 0.5,
                features: {
                  layout: "list",
                  imageSize: "large",
                  showDescription: true,
                },
              },
            ],
            targetingCriteria: {
              featureArea: "catalog",
              minimumSampleSize: 1500,
              confidenceLevel: 0.95,
            },
          },
        },
      ];

      // Create tests and capture IDs
      const createdTests: AbTest[] = [];
      for (const test of tests) {
        const created = await storage.admin.experiments.createAbTest(test);
        createdTests.push(created);
      }

      // Create sample individual user results for tests
      const results: InsertAbTestResult[] = [];

      // Generate results for test 1 (Homepage CTA)
      for (let i = 0; i < 50; i++) {
        // Control group users
        results.push({
          testId: createdTests[0].id,
          userId: `user_${i * 2}`,
          variant: "control",
          exposedAt: new Date(
            Date.now() - (14 - (i % 14)) * 24 * 60 * 60 * 1000,
          ),
          converted: i % 20 === 0, // 5% conversion
          convertedAt:
            i % 20 === 0
              ? new Date(Date.now() - (13 - (i % 14)) * 24 * 60 * 60 * 1000)
              : undefined,
          conversionValue: i % 20 === 0 ? 100 : undefined,
          metadata: {
            source: "homepage",
            device: i % 2 === 0 ? "mobile" : "desktop",
          },
        });

        // Variant B users
        results.push({
          testId: createdTests[0].id,
          userId: `user_${i * 2 + 1}`,
          variant: "variant_b",
          exposedAt: new Date(
            Date.now() - (14 - (i % 14)) * 24 * 60 * 60 * 1000,
          ),
          converted: i % 13 === 0, // ~7.5% conversion
          convertedAt:
            i % 13 === 0
              ? new Date(Date.now() - (13 - (i % 14)) * 24 * 60 * 60 * 1000)
              : undefined,
          conversionValue: i % 13 === 0 ? 100 : undefined,
          metadata: {
            source: "homepage",
            device: i % 2 === 0 ? "mobile" : "desktop",
          },
        });
      }

      // Generate results for test 2 (Checkout Form - completed)
      for (let i = 0; i < 100; i++) {
        // Control group users
        results.push({
          testId: createdTests[1].id,
          userId: `user_checkout_${i * 2}`,
          variant: "control",
          exposedAt: new Date(
            Date.now() - (25 - (i % 25)) * 24 * 60 * 60 * 1000,
          ),
          converted: i % 20 === 0, // 5% conversion
          convertedAt:
            i % 20 === 0
              ? new Date(Date.now() - (24 - (i % 25)) * 24 * 60 * 60 * 1000)
              : undefined,
          conversionValue: i % 20 === 0 ? 300 : undefined,
          metadata: {
            source: "checkout",
            cartSize: Math.floor(Math.random() * 5) + 1,
          },
        });

        // Variant B users
        results.push({
          testId: createdTests[1].id,
          userId: `user_checkout_${i * 2 + 1}`,
          variant: "variant_b",
          exposedAt: new Date(
            Date.now() - (25 - (i % 25)) * 24 * 60 * 60 * 1000,
          ),
          converted: i % 12 === 0, // ~8% conversion
          convertedAt:
            i % 12 === 0
              ? new Date(Date.now() - (24 - (i % 25)) * 24 * 60 * 60 * 1000)
              : undefined,
          conversionValue: i % 12 === 0 ? 300 : undefined,
          metadata: {
            source: "checkout",
            cartSize: Math.floor(Math.random() * 5) + 1,
          },
        });
      }

      // Add results
      for (const result of results) {
        await storage.admin.experiments.upsertAbTestResult(result);
      }

      // Create variant metrics for completed test
      const controlResults = results.filter(
        (r) => r.testId === createdTests[1].id && r.variant === "control",
      );
      const variantBResults = results.filter(
        (r) => r.testId === createdTests[1].id && r.variant === "variant_b",
      );

      const variantMetrics: InsertAbTestVariantMetric[] = [
        {
          testId: createdTests[1].id,
          variant: "control",
          sampleSize: controlResults.length,
          conversionRate:
            controlResults.filter((r) => r.converted).length /
            controlResults.length,
          averageValue: 300,
          standardDeviation: 45.5,
          confidence: 0.95,
          pValue: 0.0001,
          isSignificant: false,
          recommendation: "Control group baseline performance",
        },
        {
          testId: createdTests[1].id,
          variant: "variant_b",
          sampleSize: variantBResults.length,
          conversionRate:
            variantBResults.filter((r) => r.converted).length /
            variantBResults.length,
          averageValue: 300,
          standardDeviation: 42.3,
          confidence: 0.9999,
          pValue: 0.0001,
          isSignificant: true,
          recommendation:
            "Implement variant B - Multi-step form shows significant improvement with 60% lift in conversion rate",
        },
      ];

      for (const metric of variantMetrics) {
        await storage.admin.experiments.upsertAbTestVariantMetric(metric);
      }

      res.json({
        success: true,
        message: "Sample A/B test data created successfully",
        tests: tests.length,
        results: results.length,
        variantMetrics: variantMetrics.length,
      });
    } catch (error) {
      console.error("Error seeding A/B test data:", error);
      res.status(500).json({ error: "Failed to seed A/B test data" });
    }
  });

  return router;
}
