import { Router } from 'express';
import { storage as defaultStorage } from './storage';
import { type InsertAbTest, type InsertAbTestResult, type InsertAbTestInsight } from '@shared/schema';

export function createABTestSeedEndpoint(storage: typeof defaultStorage) {
  const router = Router();
  
  router.post('/ab/seed', async (req, res) => {
      try {
        // Create sample A/B tests
        const tests: InsertAbTest[] = [
          {
            name: 'Homepage CTA Button Color Test',
            variantA: 'Blue button with "Sign Up" text',
            variantB: 'Green button with "Get Started" text',
            startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            status: 'active',
            successMetric: 'conversion',
            targetAudience: 0.5,
            metadata: {
              hypothesis: 'Changing the button color and text will increase click-through rate by 15%',
              featureArea: 'homepage',
              minimumSampleSize: 1000,
              confidenceLevel: 0.95
            },
          },
          {
            name: 'Checkout Form Length Optimization',
            variantA: 'Long form with all fields on one page',
            variantB: 'Multi-step form with progress indicator',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            endDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // ended 5 days ago
            status: 'completed',
            successMetric: 'conversion',
            targetAudience: 0.5,
            metadata: {
              hypothesis: 'Breaking the form into steps will reduce friction and increase completion rate',
              featureArea: 'checkout',
              minimumSampleSize: 2000,
              confidenceLevel: 0.95
            },
          },
          {
            name: 'Product Card Design Test',
            variantA: 'Grid layout with small images',
            variantB: 'List layout with large images and descriptions',
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            status: 'active',
            successMetric: 'engagement',
            targetAudience: 0.3,
            metadata: {
              hypothesis: 'Larger images and descriptions will increase product engagement',
              featureArea: 'catalog',
              minimumSampleSize: 1500,
              confidenceLevel: 0.95
            },
          }
        ];

        // Create tests and capture IDs
        const createdTests = [];
        for (const test of tests) {
          const created = await storage.createAbTest(test);
          createdTests.push(created);
        }

        // Create sample results for active tests
        const results: InsertAbTestResult[] = [
          // Results for test-1 (Homepage CTA)
          {
            testId: createdTests[0].id,
            variant: 'A',
            visitors: 2500,
            conversions: 125,
            revenue: 12500,
            periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
            metadata: {
              customMetrics: {
                avgTimeOnPage: 45,
                bounceRate: 0.35
              }
            }
          },
          {
            testId: createdTests[0].id,
            variant: 'B',
            visitors: 2485,
            conversions: 186,
            revenue: 18600,
            periodStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
            metadata: {
              customMetrics: {
                avgTimeOnPage: 52,
                bounceRate: 0.28
              }
            }
          },
          // Results for test-2 (Checkout Form - completed)
          {
            testId: createdTests[1].id,
            variant: 'A',
            visitors: 5000,
            conversions: 250,
            revenue: 75000,
            periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            metadata: {
              customMetrics: {
                avgTimeToComplete: 180,
                dropoffRate: 0.45
              }
            }
          },
          {
            testId: createdTests[1].id,
            variant: 'B',
            visitors: 4950,
            conversions: 396,
            revenue: 118800,
            periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            metadata: {
              customMetrics: {
                avgTimeToComplete: 120,
                dropoffRate: 0.25
              }
            }
          },
          // Results for test-3 (Product Cards)
          {
            testId: createdTests[2].id,
            variant: 'A',
            visitors: 1200,
            conversions: 84,
            revenue: 4200,
            periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
            metadata: {
              customMetrics: {
                clickThroughRate: 0.07,
                viewsPerSession: 12
              }
            }
          },
          {
            testId: createdTests[2].id,
            variant: 'B',
            visitors: 1180,
            conversions: 94,
            revenue: 5640,
            periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            periodEnd: new Date(),
            metadata: {
              customMetrics: {
                clickThroughRate: 0.08,
                viewsPerSession: 15
              }
            }
          }
        ];

        // Add results
        for (const result of results) {
          await storage.upsertAbTestResult(result);
        }

        // Create insights for completed test
        const insight: InsertAbTestInsight = {
          testId: createdTests[1].id,
          pValue: 0.0001,
          confidence: 0.9999,
          winner: 'B',
          liftPercentage: 58.4,
          recommendation: 'implement',
          explanation: 'Variant B\'s multi-step form with progress indicator achieved statistical significance with 99.99% confidence. The 58.4% lift in conversion rate represents a substantial improvement. The shorter completion time (2 minutes vs 3 minutes) and lower drop-off rate (25% vs 45%) indicate that breaking the form into steps significantly reduced user friction.',
          insights: {
            keyFindings: [
              'Multi-step forms reduce cognitive load and improve completion rates',
              'Progress indicators help users understand the scope of the task',
              'Breaking complex forms into digestible steps increases user confidence',
              'The 20% reduction in drop-off rate translates to significant revenue gains'
            ],
            nextSteps: [
              'Implement the multi-step form design across all checkout flows',
              'Test adding a save-progress feature for returning users',
              'Consider applying this pattern to other long forms in the application',
              'Monitor long-term impact on customer lifetime value'
            ],
            learnings: [
              'Users prefer clear, structured processes over single-page complexity',
              'Visual progress indicators are powerful motivators for form completion',
              'Form design has direct impact on conversion and revenue metrics'
            ]
          },
          statisticalAnalysis: {
            zScore: 3.98,
            sampleSizeA: 5000,
            sampleSizeB: 4950,
            conversionRateA: 0.05,
            conversionRateB: 0.08
          }
        };

        await storage.upsertAbTestInsight(insight);

        res.json({ 
          success: true, 
          message: 'Sample A/B test data created successfully',
          tests: tests.length,
          results: results.length 
        });
      } catch (error) {
        console.error('Error seeding A/B test data:', error);
        res.status(500).json({ error: 'Failed to seed A/B test data' });
      }
    });
    
  return router;
}