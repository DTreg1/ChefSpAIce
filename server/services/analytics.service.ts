import OpenAI from "openai";
import { storage } from "../storage/index";
import { AnalyticsInsight, InsertAnalyticsInsight } from "@shared/schema";
import pRetry from "p-retry";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Referenced from: blueprint:javascript_openai_ai_integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Helper function to check if error is rate limit
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

export class AnalyticsService {
  /**
   * Detect trends and patterns in data
   */
  private detectTrends(dataPoints: Array<{ date: string; value: number }>): {
    trend: "up" | "down" | "stable";
    percentageChange: number;
    isAnomaly: boolean;
    anomalyDetails?: string;
  } {
    if (!dataPoints || dataPoints.length < 2) {
      return { trend: "stable", percentageChange: 0, isAnomaly: false };
    }

    // Sort by date
    const sorted = [...dataPoints].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate trend
    const recentPoints = sorted.slice(-7);
    const previousPoints = sorted.slice(-14, -7);
    
    const recentAvg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
    const previousAvg = previousPoints.length > 0 
      ? previousPoints.reduce((sum, p) => sum + p.value, 0) / previousPoints.length
      : recentPoints[0].value;

    const percentageChange = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    // Determine trend
    let trend: "up" | "down" | "stable";
    if (percentageChange > 5) trend = "up";
    else if (percentageChange < -5) trend = "down";
    else trend = "stable";

    // Detect anomalies (simple spike/drop detection)
    const values = sorted.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const latestValue = sorted[sorted.length - 1].value;
    const isAnomaly = Math.abs(latestValue - mean) > 2 * stdDev;

    let anomalyDetails;
    if (isAnomaly) {
      if (latestValue > mean) {
        anomalyDetails = `Spike detected: ${Math.round(((latestValue - mean) / mean) * 100)}% above average`;
      } else {
        anomalyDetails = `Drop detected: ${Math.round(((mean - latestValue) / mean) * 100)}% below average`;
      }
    }

    return { trend, percentageChange, isAnomaly, anomalyDetails };
  }

  /**
   * Generate insights from data using OpenAI
   */
  async generateInsight(
    userId: string,
    metricData: {
      metricName: string;
      dataPoints: Array<{ date: string; value: number }>;
      period: string;
    }
  ): Promise<AnalyticsInsight> {
    try {
      // Analyze the data locally first
      const analysis = this.detectTrends(metricData.dataPoints);
      
      // Calculate statistics
      const values = metricData.dataPoints.map(p => p.value);
      const currentValue = values[values.length - 1];
      const previousValue = values.length > 1 ? values[values.length - 2] : currentValue;
      const average = values.reduce((sum, v) => sum + v, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Prepare prompt for OpenAI
      const prompt = `You are an expert data analyst helping non-technical users understand their metrics.
      
Analyze this data and provide a clear, plain-language explanation:
- Metric: ${metricData.metricName}
- Period: ${metricData.period}
- Current Value: ${currentValue}
- Previous Value: ${previousValue}
- Average: ${average.toFixed(2)}
- Min: ${min}
- Max: ${max}
- Trend: ${analysis.trend} (${analysis.percentageChange.toFixed(1)}% change)
${analysis.isAnomaly ? `- Anomaly Detected: ${analysis.anomalyDetails}` : ''}

Data points (last 10):
${metricData.dataPoints.slice(-10).map(p => `${p.date}: ${p.value}`).join('\n')}

Provide a response in JSON format with:
{
  "insightText": "A 1-2 sentence explanation in plain language that a non-technical person can understand",
  "importance": 1-5 (5 being most important),
  "category": "trend" | "anomaly" | "prediction" | "comparison",
  "suggestedActions": ["action1", "action2", "action3"],
  "relatedMetrics": ["metric1", "metric2"],
  "reasoning": "Brief technical reasoning for experts"
}

Example for a traffic spike:
{
  "insightText": "Your website had 40% more visitors than usual on Tuesday, likely due to the newsletter campaign sent that morning.",
  "importance": 4,
  "category": "anomaly",
  "suggestedActions": ["Monitor server capacity", "Analyze visitor behavior", "Plan similar campaigns"],
  "relatedMetrics": ["conversion_rate", "page_load_time"],
  "reasoning": "Significant positive deviation from 7-day moving average correlating with marketing activity"
}`;

      // Call OpenAI with retry logic
      const response = await pRetry(
        async () => {
          try {
            const completion = await openai.chat.completions.create({
              model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
              messages: [
                {
                  role: "system",
                  content: "You are a data analyst expert who explains complex metrics in simple terms for non-technical users."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              response_format: { type: "json_object" },
              max_completion_tokens: 500,
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) throw new Error("No response from OpenAI");
            
            return JSON.parse(content);
          } catch (error: any) {
            if (isRateLimitError(error)) {
              throw error; // Retry on rate limit
            }
            throw error;
          }
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
        }
      );

      // Create the insight record
      const insightData = {
        insightType: analysis.isAnomaly ? "anomaly" : "trend",
        category: "performance",
        title: `${metricData.metricName} Analysis`,
        description: response.insightText as string,
        severity: analysis.isAnomaly ? "warning" : "info",
      } as unknown as InsertAnalyticsInsight;

      return await storage.platform.analytics.createAnalyticsInsight(insightData);
    } catch (error) {
      console.error("Failed to generate insight:", error);
      
      // Fallback to basic insight without AI
      const analysis = this.detectTrends(metricData.dataPoints);
      const values = metricData.dataPoints.map(p => p.value);
      const currentValue = values[values.length - 1];
      
      let insightText = `The ${metricData.metricName} is currently ${currentValue}`;
      if (analysis.trend === "up") {
        insightText += `, showing an upward trend with ${Math.abs(analysis.percentageChange).toFixed(1)}% increase`;
      } else if (analysis.trend === "down") {
        insightText += `, showing a downward trend with ${Math.abs(analysis.percentageChange).toFixed(1)}% decrease`;
      } else {
        insightText += `, remaining stable`;
      }

      if (analysis.isAnomaly) {
        insightText = `Alert: ${analysis.anomalyDetails} for ${metricData.metricName}. Current value is ${currentValue}.`;
      }

      const fallbackInsight = {
        insightType: analysis.isAnomaly ? "anomaly" : "trend",
        category: "performance",
        title: `${metricData.metricName} Analysis`,
        description: insightText,
        severity: analysis.isAnomaly ? "warning" : "info",
      } as unknown as InsertAnalyticsInsight;

      return await storage.platform.analytics.createAnalyticsInsight(fallbackInsight);
    }
  }

  /**
   * Explain a specific metric in plain language
   */
  async explainMetric(
    userId: string,
    metricName: string,
    context?: Record<string, any>
  ): Promise<string> {
    try {
      const prompt = `Explain the metric "${metricName}" in simple terms that a non-technical person can understand.
      
${context ? `Additional context: ${JSON.stringify(context, null, 2)}` : ''}

Provide a clear, concise explanation (2-3 sentences max) that:
1. Explains what this metric measures
2. Why it's important for their business
3. What good vs bad values look like

Example for "bounce_rate":
"Bounce rate shows the percentage of visitors who leave your website after viewing just one page. A lower bounce rate (under 40%) is better because it means visitors are exploring more of your content. High bounce rates might indicate that visitors aren't finding what they're looking for."`;

      const response = await pRetry(
        async () => {
          try {
            const completion = await openai.chat.completions.create({
              model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant who explains technical metrics in simple, everyday language."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              max_completion_tokens: 200,
            });

            return completion.choices[0]?.message?.content || 
              "This metric helps track important aspects of your data.";
          } catch (error: any) {
            if (isRateLimitError(error)) {
              throw error;
            }
            throw error;
          }
        },
        {
          retries: 3,
          minTimeout: 2000,
          maxTimeout: 10000,
          factor: 2,
        }
      );

      return response;
    } catch (error) {
      console.error("Failed to explain metric:", error);
      
      // Fallback explanations for common metrics
      const fallbackExplanations: Record<string, string> = {
        traffic: "Traffic measures how many people visit your website or application. Higher traffic generally means more visibility and potential customers.",
        revenue: "Revenue is the total amount of money your business earns. Tracking revenue helps you understand your financial health and growth.",
        conversion_rate: "Conversion rate shows what percentage of visitors complete a desired action (like making a purchase). Higher rates mean your site is more effective.",
        bounce_rate: "Bounce rate shows the percentage of visitors who leave after viewing just one page. Lower rates suggest visitors find your content engaging.",
        user_engagement: "User engagement measures how actively people interact with your application. Higher engagement often leads to better retention and success.",
        page_load_time: "Page load time measures how quickly your pages display. Faster load times improve user experience and can boost conversions.",
        error_rate: "Error rate tracks how often users encounter problems. Lower error rates mean a smoother, more reliable experience for your users."
      };

      return fallbackExplanations[metricName.toLowerCase()] || 
        `${metricName} is an important metric that helps you track and understand your data patterns. Monitor it regularly to spot trends and make informed decisions.`;
    }
  }
}