import { Router } from 'express';
import { type Storage } from './storage';
import { type InsertAbTest, type InsertAbTestResult, type InsertAbTestInsight } from '@shared/schema';

export function createABTestSeedEndpoint(storage: Storage) {
  const router = Router();
  
  router.post('/ab/seed', async (req, res) => {
      try {
        // Create sample A/B tests
        const tests: InsertAbTest[] = [
          {
            id: 'test-1',
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
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          },
          {
            id: 'test-2',
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
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          },
          {
            id: 'test-3',
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
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            updatedAt: new Date()
          }
        ];

        // Create tests
        for (const test of tests) {
          await storage.createAbTest(test);
        }

        // Create sample results for active tests
        const results: InsertAbTestResult[] = [
          // Results for test-1 (Homepage CTA)
          {
            testId: 'test-1',
            variant: 'A',
            visitors: 2500,
            conversions: 125,
            revenue: 12500,
            date: new Date(),
            metadata: {
              avgTimeOnPage: 45,
              bounceRate: 0.35
            }
          },
          {
            testId: 'test-1',
            variant: 'B',
            visitors: 2485,
            conversions: 186,
            revenue: 18600,
            date: new Date(),
            metadata: {
              avgTimeOnPage: 52,
              bounceRate: 0.28
            }
          },
          // Results for test-2 (Checkout Form - completed)
          {
            testId: 'test-2',
            variant: 'A',
            visitors: 5000,
            conversions: 250,
            revenue: 75000,
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            metadata: {
              avgTimeToComplete: 180,
              dropoffRate: 0.45
            }
          },
          {
            testId: 'test-2',
            variant: 'B',
            visitors: 4950,
            conversions: 396,
            revenue: 118800,
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            metadata: {
              avgTimeToComplete: 120,
              dropoffRate: 0.25
            }
          },
          // Results for test-3 (Product Cards)
          {
            testId: 'test-3',
            variant: 'A',
            visitors: 1200,
            conversions: 84,
            revenue: 4200,
            date: new Date(),
            metadata: {
              clickThroughRate: 0.07,
              viewsPerSession: 12
            }
          },
          {
            testId: 'test-3',
            variant: 'B',
            visitors: 1180,
            conversions: 94,
            revenue: 5640,
            date: new Date(),
            metadata: {
              clickThroughRate: 0.08,
              viewsPerSession: 15
            }
          }
        ];

        // Add results
        for (const result of results) {
          await storage.addAbTestResult(result);
        }

        // Create insights for completed test
        const insight: InsertAbTestInsight = {
          testId: 'test-2',
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
            chiSquare: 45.2,
            zScore: 3.98,
            sampleSizeA: 5000,
            sampleSizeB: 4950,
            conversionRateA: 0.05,
            conversionRateB: 0.08
          },
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        };

        await storage.saveAbTestInsight(insight);

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