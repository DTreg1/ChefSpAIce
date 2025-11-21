import { Router, Request, Response } from "express";
import { experimentsStorage } from "../storage/index";
import { asyncHandler } from "../middleware/error.middleware";
import { getAuthenticatedUserId } from "../middleware/auth.middleware";
import { insertAbTestSchema, insertAbTestResultSchema } from "@shared/schema";
import OpenAI from "openai";

const router = Router();

// Create new A/B test
router.post(
  "/create",
  asyncHandler(
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      try {
        const validated = insertAbTestSchema.parse({
          ...req.body,
          createdBy: userId,
        });

        const test = await experimentsStorage.createAbTest(validated);
        res.json(test);
      } catch (error: any) {
        console.error("Error creating A/B test:", error);
        res
          .status(400)
          .json({ error: error.message || "Failed to create test" });
      }
    },
  ),
);

// Get all tests
router.get(
  "/",
  asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const filters: any = {};

        if (req.query.status) {
          filters.status = req.query.status as string;
        }
        if (req.query.createdBy) {
          filters.createdBy = req.query.createdBy as string;
        }

        const tests = await experimentsStorage.getAbTests(filters);
        res.json(tests);
      } catch (error: any) {
        console.error("Error fetching A/B tests:", error);
        res.status(500).json({ error: "Failed to fetch tests" });
      }
    },
  ),
);

// Get specific test results
router.get(
  "/results/:id",
  asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;

      try {
        const test = await experimentsStorage.getAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        const results = await experimentsStorage.getAbTestResults(id);
        const aggregated =
          await experimentsStorage.getAggregatedAbTestResults(id);
        const insights = await experimentsStorage.getAbTestInsights(id);

        res.json({
          test,
          results,
          aggregated,
          insights,
        });
      } catch (error: any) {
        console.error("Error fetching test results:", error);
        res.status(500).json({ error: "Failed to fetch results" });
      }
    },
  ),
);

// Update test results
router.post(
  "/results",
  asyncHandler(
    async (req: Request, res: Response) => {
      try {
        const validated = insertAbTestResultSchema.parse(req.body);
        const result = await experimentsStorage.upsertAbTestResult(validated);
        res.json(result);
      } catch (error: any) {
        console.error("Error updating test results:", error);
        res
          .status(400)
          .json({ error: error.message || "Failed to update results" });
      }
    },
  ),
);

// Analyze test for statistical significance
router.post(
  "/analyze",
  asyncHandler(
    async (req: Request, res: Response) => {
      const { testId } = req.body;

      if (!testId) {
        return res.status(400).json({ error: "Test ID required" });
      }

      try {
        const test = await experimentsStorage.getAbTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Calculate statistical significance
        const significance =
          await experimentsStorage.calculateStatisticalSignificance(testId);

        // Get aggregated results for AI analysis
        const aggregated =
          await experimentsStorage.getAggregatedAbTestResults(testId);

        // Generate AI insights if OpenAI API key is available
        let aiInsights = null;
        if (process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          try {
            const prompt = `
          Analyze this A/B test result and provide actionable insights:
          
          Test Name: ${test.name}
          Variant A (Control): ${test.variantA}
          Variant B (Test): ${test.variantB}
          
          Results:
          Variant A: ${aggregated.variantA.conversions} conversions from ${aggregated.variantA.visitors} visitors (${((aggregated.variantA.conversions / aggregated.variantA.visitors) * 100).toFixed(2)}% conversion rate)
          Variant B: ${aggregated.variantB.conversions} conversions from ${aggregated.variantB.visitors} visitors (${((aggregated.variantB.conversions / aggregated.variantB.visitors) * 100).toFixed(2)}% conversion rate)
          
          Statistical Analysis:
          - P-value: ${significance.pValue.toFixed(4)}
          - Confidence: ${(significance.confidence * 100).toFixed(2)}%
          - Lift: ${significance.liftPercentage.toFixed(2)}%
          - Winner: ${significance.winner}
          
          Provide:
          1. A plain-language explanation of what these results mean
          2. Key findings and insights
          3. Recommended next steps
          4. Any warnings or considerations
          5. Best practices for implementing the winner
          
          Keep the response practical and actionable for non-technical stakeholders.
        `;

            const response = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert in A/B testing and conversion rate optimization. Provide clear, actionable insights in plain language.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens: 1000,
              temperature: 0.7,
            });

            const aiContent = response.choices[0].message.content || "";

            // Parse AI response into structured insights
            const lines = aiContent.split("\n").filter((line) => line.trim());
            const keyFindings: string[] = [];
            const nextSteps: string[] = [];
            const warnings: string[] = [];
            let explanation = "";

            let currentSection = "";
            for (const line of lines) {
              if (
                line.toLowerCase().includes("explanation") ||
                line.startsWith("1.")
              ) {
                currentSection = "explanation";
              } else if (
                line.toLowerCase().includes("findings") ||
                line.toLowerCase().includes("insights") ||
                line.startsWith("2.")
              ) {
                currentSection = "findings";
              } else if (
                line.toLowerCase().includes("next steps") ||
                line.toLowerCase().includes("recommendations") ||
                line.startsWith("3.")
              ) {
                currentSection = "nextsteps";
              } else if (
                line.toLowerCase().includes("warning") ||
                line.toLowerCase().includes("consideration") ||
                line.startsWith("4.")
              ) {
                currentSection = "warnings";
              } else if (
                line.toLowerCase().includes("best practice") ||
                line.startsWith("5.")
              ) {
                currentSection = "bestpractices";
              } else if (line.trim()) {
                switch (currentSection) {
                  case "explanation":
                    explanation += line + " ";
                    break;
                  case "findings":
                    if (!line.match(/^\d+\./))
                      keyFindings.push(line.replace(/^[-•*]\s*/, ""));
                    break;
                  case "nextsteps":
                    if (!line.match(/^\d+\./))
                      nextSteps.push(line.replace(/^[-•*]\s*/, ""));
                    break;
                  case "warnings":
                    if (!line.match(/^\d+\./))
                      warnings.push(line.replace(/^[-•*]\s*/, ""));
                    break;
                }
              }
            }

            // Save insights to database
            aiInsights = await experimentsStorage.upsertAbTestInsight({
              testId,
              winner: significance.winner,
              confidence: significance.confidence,
              pValue: significance.pValue,
              liftPercentage: significance.liftPercentage,
              recommendation:
                significance.winner !== "inconclusive"
                  ? "implement"
                  : "continue",
              explanation: explanation.trim() || aiContent.substring(0, 500),
              insights: {
                keyFindings,
                nextSteps,
                warnings,
                learnings: keyFindings.slice(0, 3),
                bestPractices: nextSteps.slice(0, 3),
              },
              statisticalAnalysis: {
                sampleSizeA: aggregated.variantA.visitors,
                sampleSizeB: aggregated.variantB.visitors,
                conversionRateA:
                  aggregated.variantA.visitors > 0
                    ? aggregated.variantA.conversions /
                      aggregated.variantA.visitors
                    : 0,
                conversionRateB:
                  aggregated.variantB.visitors > 0
                    ? aggregated.variantB.conversions /
                      aggregated.variantB.visitors
                    : 0,
                zScore: 0, // Calculated in storage
                power: 0.8, // Standard assumption
                minimumDetectableEffect: 0.05,
              },
            });
          } catch (aiError) {
            console.error("Error generating AI insights:", aiError);
            // Continue without AI insights
          }
        }

        res.json({
          test,
          significance,
          aggregated,
          insights: aiInsights,
        });
      } catch (error: any) {
        console.error("Error analyzing test:", error);
        res.status(500).json({ error: "Failed to analyze test" });
      }
    },
  ),
);

// Get recommendations
router.get(
  "/recommendations",
  asyncHandler(
    async (req: Request, res: Response) => {
      const userId = getAuthenticatedUserId(req);

      try {
        const recommendations =
          await experimentsStorage.getAbTestRecommendations(
            userId ?? undefined,
          );
        res.json(recommendations);
      } catch (error: any) {
        console.error("Error fetching recommendations:", error);
        res.status(500).json({ error: "Failed to fetch recommendations" });
      }
    },
  ),
);

// Implement test winner
router.post(
  "/implement",
  asyncHandler(
    async (req: Request, res: Response) => {
      const { testId, variant } = req.body;
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!testId || !variant) {
        return res.status(400).json({ error: "Test ID and variant required" });
      }

      if (variant !== "A" && variant !== "B") {
        return res.status(400).json({ error: "Invalid variant" });
      }

      try {
        const test = await experimentsStorage.getAbTest(testId);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Check if user has permission (created the test or is admin)
        if (test.createdBy !== userId) {
          const user = await experimentsStorage.getUser(userId);
          if (!user?.isAdmin) {
            return res.status(403).json({ error: "Permission denied" });
          }
        }

        await experimentsStorage.implementAbTestWinner(testId, variant);

        res.json({
          success: true,
          message: `Variant ${variant} has been implemented for test "${test.name}"`,
        });
      } catch (error: any) {
        console.error("Error implementing winner:", error);
        res.status(500).json({ error: "Failed to implement winner" });
      }
    },
  ),
);

// Update test
router.put(
  "/:id",
  asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      try {
        const test = await experimentsStorage.getAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Check permission
        if (test.createdBy !== userId) {
          const user = await experimentsStorage.getUser(userId);
          if (!user?.isAdmin) {
            return res.status(403).json({ error: "Permission denied" });
          }
        }

        const updated = await experimentsStorage.updateAbTest(id, req.body);
        res.json(updated);
      } catch (error: any) {
        console.error("Error updating test:", error);
        res.status(500).json({ error: "Failed to update test" });
      }
    },
  ),
);

// Delete test
router.delete(
  "/:id",
  asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      try {
        const test = await experimentsStorage.getAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "Test not found" });
        }

        // Check permission
        if (test.createdBy !== userId) {
          const user = await experimentsStorage.getUser(userId);
          if (!user?.isAdmin) {
            return res.status(403).json({ error: "Permission denied" });
          }
        }

        await experimentsStorage.deleteAbTest(id);
        res.json({ success: true, message: "Test deleted successfully" });
      } catch (error: any) {
        console.error("Error deleting test:", error);
        res.status(500).json({ error: "Failed to delete test" });
      }
    },
  ),
);

export default router;
