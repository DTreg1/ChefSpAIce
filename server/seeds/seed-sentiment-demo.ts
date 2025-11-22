/**
 * Seed Script for Sentiment Demo Data
 * Creates demo data showing a 15% sentiment drop over the past week
 * and identifies login issues as the main pain point
 */

import { db } from "./db";
import { 
  sentimentMetrics, 
  sentimentAlerts, 
  sentimentSegments,
  sentimentAnalysis,
  sentimentTrends
} from "@shared/schema";
import { subDays, format } from "date-fns";

async function seedSentimentData() {
  console.log("🌱 Seeding sentiment demo data...");

  const now = new Date();
  const oneWeekAgo = subDays(now, 7);
  const twoWeeksAgo = subDays(now, 14);

  try {
    // Clear existing demo data (optional, be careful in production)
    console.log("Clearing existing sentiment demo data...");
    await db.delete(sentimentMetrics);
    await db.delete(sentimentAlerts);
    await db.delete(sentimentSegments);

    // Create sentiment metrics showing declining trend
    const metricsData = [
      // Two weeks ago - positive sentiment
      {
        period: format(twoWeeksAgo, 'yyyy-MM-dd'),
        periodType: 'day' as const,
        avgSentiment: 0.72,
        totalItems: 245,
        metadata: {
          topEmotions: { joy: 0.45, trust: 0.35, anticipation: 0.2 },
          significantChanges: []
        },
        categories: {
          "user_interface": 0.68,
          "performance": 0.75,
          "features": 0.80,
          "authentication": 0.65
        },
        painPoints: [],
        createdAt: twoWeeksAgo,
      },
      // One week ago - slight decline
      {
        period: format(oneWeekAgo, 'yyyy-MM-dd'),
        periodType: 'day' as const,
        avgSentiment: 0.65,
        totalItems: 312,
        percentageChange: -9.7,
        metadata: {
          topEmotions: { joy: 0.35, trust: 0.3, frustration: 0.25, anger: 0.1 },
          significantChanges: ["Increased complaints about login process"]
        },
        categories: {
          "user_interface": 0.62,
          "performance": 0.70,
          "features": 0.75,
          "authentication": 0.45
        },
        painPoints: [
          { issue: "Login timeout errors", impact: 8.5, category: "authentication" },
          { issue: "Password reset delays", impact: 5.2, category: "authentication" }
        ],
        alertTriggered: false,
        createdAt: oneWeekAgo,
      },
      // Current week - significant drop (15% decline)
      {
        period: format(now, 'yyyy-MM-dd'),
        periodType: 'week' as const,
        avgSentiment: 0.55,
        totalItems: 486,
        percentageChange: -15.4,
        metadata: {
          topEmotions: { frustration: 0.4, anger: 0.25, sadness: 0.15, joy: 0.2 },
          significantChanges: [
            "Major spike in login-related complaints",
            "Users reporting frequent session timeouts",
            "Multiple reports of 2FA not working"
          ]
        },
        categories: {
          "user_interface": 0.58,
          "performance": 0.65,
          "features": 0.70,
          "authentication": 0.25
        },
        painPoints: [
          { issue: "Login issues - session timeout", impact: 22.5, category: "authentication" },
          { issue: "2FA verification failures", impact: 18.3, category: "authentication" },
          { issue: "Password reset not working", impact: 12.7, category: "authentication" },
          { issue: "Slow page load times", impact: 8.2, category: "performance" }
        ],
        alertTriggered: true,
        createdAt: now,
      }
    ];

    console.log("Inserting sentiment metrics...");
    await db.insert(sentimentMetrics).values(metricsData);

    // Create alerts for the sentiment drop
    const alertsData = [
      {
        alertType: 'sentiment_drop' as const,
        threshold: -10,
        currentValue: -15.4,
        severity: 'high' as const,
        message: 'Sentiment dropped 15.4% compared to last week - exceeds threshold',
        status: 'active' as const,
        metadata: {
          percentageChange: -15.4,
          previousValue: 0.65,
          affectedUsers: 486,
          relatedIssues: ['Login issues', 'Session timeouts', '2FA failures'],
          suggestedActions: [
            'Review authentication system logs',
            'Check session management configuration',
            'Verify 2FA provider status',
            'Consider implementing emergency fix for login issues'
          ]
        },
        triggeredAt: now,
        affectedCategory: 'authentication',
        notificationSent: true,
        createdAt: now,
      },
      {
        alertType: 'category_issue' as const,
        threshold: 0.4,
        currentValue: 0.25,
        severity: 'critical' as const,
        message: 'Authentication category sentiment critically low at 0.25',
        status: 'active' as const,
        metadata: {
          percentageChange: -44.4,
          previousValue: 0.45,
          affectedUsers: 312,
          relatedIssues: ['Login timeouts', '2FA not working', 'Password reset failures'],
          suggestedActions: [
            'Immediate investigation of auth service',
            'Rollback recent authentication changes if any',
            'Increase monitoring on auth endpoints'
          ]
        },
        triggeredAt: subDays(now, 2),
        affectedCategory: 'authentication',
        notificationSent: true,
        createdAt: subDays(now, 2),
      },
      {
        alertType: 'sustained_negative' as const,
        threshold: 0.4,
        currentValue: 0.35,
        severity: 'medium' as const,
        message: 'Sustained negative sentiment in authentication for 5 days',
        status: 'acknowledged' as const,
        metadata: {
          durationDays: 5,
          affectedUsers: 245,
          relatedIssues: ['Ongoing login issues'],
        },
        triggeredAt: subDays(now, 3),
        acknowledgedAt: subDays(now, 1),
        acknowledgedBy: 'admin_user',
        affectedCategory: 'authentication',
        notificationSent: true,
        createdAt: subDays(now, 3),
      }
    ];

    console.log("Inserting sentiment alerts...");
    await db.insert(sentimentAlerts).values(alertsData);

    // Create segment data
    const segmentsData = [
      {
        period: format(now, 'yyyy-MM-dd'),
        periodType: 'week' as const,
        segmentName: 'New Users',
        sentimentScore: 0.35,
        sampleSize: 142,
        positiveCount: 28,
        negativeCount: 85,
        neutralCount: 29,
        topIssues: ['Cannot login', 'Account creation fails', 'Verification email not received'],
        topPraises: ['Clean interface', 'Good feature set'],
        comparisonToPrevious: -25.5,
        createdAt: now,
      },
      {
        period: format(now, 'yyyy-MM-dd'),
        periodType: 'week' as const,
        segmentName: 'Premium Users',
        sentimentScore: 0.62,
        sampleSize: 198,
        positiveCount: 98,
        negativeCount: 55,
        neutralCount: 45,
        topIssues: ['Login delays', 'Session expires too quickly'],
        topPraises: ['Great features', 'Good customer support', 'Value for money'],
        comparisonToPrevious: -8.2,
        createdAt: now,
      },
      {
        period: format(now, 'yyyy-MM-dd'),
        periodType: 'week' as const,
        segmentName: 'Mobile Users',
        sentimentScore: 0.48,
        sampleSize: 146,
        positiveCount: 45,
        negativeCount: 72,
        neutralCount: 29,
        topIssues: ['App crashes on login', 'Fingerprint auth not working', 'Slow performance'],
        topPraises: ['Convenient', 'Good notifications'],
        comparisonToPrevious: -18.3,
        createdAt: now,
      }
    ];

    console.log("Inserting sentiment segments...");
    await db.insert(sentimentSegments).values(segmentsData);

    // Create sample sentiment analysis entries
    const analysisData = [
      {
        content: "The login page keeps timing out and I can't access my account. This is extremely frustrating!",
        sentiment: 'negative' as const,
        contentId: `demo_${Date.now()}_1`,
        confidence: 0.92,
        emotions: { anger: 0.7, frustration: 0.85, sadness: 0.3 },
        userId: 'demo_user_1',
        contentType: 'feedback',
        metadata: { source: 'support_ticket', category: 'authentication' },
        topics: ['login', 'timeout', 'account_access'],
        keywords: ['login', 'timeout', 'frustrated', 'account'],
        analyzedAt: subDays(now, 1),
        createdAt: subDays(now, 1),
      },
      {
        content: "2FA is completely broken. I've tried 5 times and it won't accept my code. Please fix this ASAP!",
        sentiment: 'negative' as const,
        contentId: `demo_${Date.now()}_2`,
        confidence: 0.88,
        emotions: { anger: 0.8, frustration: 0.9 },
        userId: 'demo_user_2',
        contentType: 'feedback',
        metadata: { source: 'in_app_feedback', category: 'authentication' },
        topics: ['2fa', 'authentication', 'verification'],
        keywords: ['2FA', 'broken', 'code', 'fix'],
        analyzedAt: subDays(now, 1),
        createdAt: subDays(now, 1),
      },
      {
        content: "Been trying to reset my password for 2 hours. The reset email never arrives. This is unacceptable.",
        sentiment: 'negative' as const,
        contentId: `demo_${Date.now()}_3`,
        confidence: 0.95,
        emotions: { anger: 0.85, frustration: 0.95, disappointment: 0.7 },
        userId: 'demo_user_3',
        contentType: 'feedback',
        metadata: { source: 'email', category: 'authentication' },
        topics: ['password_reset', 'email', 'authentication'],
        keywords: ['password', 'reset', 'email', 'unacceptable'],
        analyzedAt: now,
        createdAt: now,
      },
      {
        content: "Love the new features but the constant logouts are driving me crazy. Fix the session management!",
        sentiment: 'mixed' as const,
        contentId: `demo_${Date.now()}_4`,
        confidence: 0.78,
        emotions: { joy: 0.4, frustration: 0.7, anger: 0.5 },
        userId: 'demo_user_4',
        contentType: 'feedback',
        metadata: { source: 'survey', category: 'mixed' },
        topics: ['features', 'session', 'logout'],
        keywords: ['features', 'logouts', 'session', 'management'],
        analyzedAt: now,
        createdAt: now,
      },
      {
        content: "The platform has great potential but these login issues need urgent attention.",
        sentiment: 'mixed' as const,
        contentId: `demo_${Date.now()}_5`,
        confidence: 0.82,
        emotions: { hope: 0.6, concern: 0.7, frustration: 0.4 },
        userId: 'demo_user_5',
        contentType: 'review',
        metadata: { source: 'app_store', category: 'review' },
        topics: ['platform', 'login', 'issues'],
        keywords: ['potential', 'login', 'urgent', 'attention'],
        analyzedAt: now,
        createdAt: now,
      }
    ];

    console.log("Inserting sentiment analysis samples...");
    await db.insert(sentimentAnalysis).values(analysisData);

    // Create trend data
    const trendsData = [];
    for (let i = 13; i >= 0; i--) {
      const date = subDays(now, i);
      const baseScore = i > 7 ? 0.7 : (i > 3 ? 0.6 : 0.5);
      const variance = Math.random() * 0.1 - 0.05;
      
      trendsData.push({
        userId: null, // Global trend
        period: format(date, 'yyyy-MM-dd'),
        periodType: 'day' as const,
        avgSentiment: baseScore + variance,
        totalAnalyses: Math.floor(Math.random() * 50) + 30,
        positiveCount: Math.floor(Math.random() * 20) + 10,
        negativeCount: i > 7 ? Math.floor(Math.random() * 10) + 5 : Math.floor(Math.random() * 25) + 15,
        neutralCount: Math.floor(Math.random() * 15) + 10,
        metadata: {
          topEmotions: i > 7 
            ? { joy: 0.4, trust: 0.3, anticipation: 0.3 }
            : { frustration: 0.4, anger: 0.3, sadness: 0.3 }
        },
        createdAt: date,
      });
    }

    console.log("Inserting sentiment trends...");
    await db.insert(sentimentTrends).values(trendsData);

    console.log("✅ Sentiment demo data seeded successfully!");
    console.log("📊 Created:");
    console.log(`   - ${metricsData.length} sentiment metrics`);
    console.log(`   - ${alertsData.length} sentiment alerts (2 active, 1 acknowledged)`);
    console.log(`   - ${segmentsData.length} segment analyses`);
    console.log(`   - ${analysisData.length} sample analyses`);
    console.log(`   - ${trendsData.length} trend data points`);
    console.log("\n🎯 Key Demo Points:");
    console.log("   - 15.4% sentiment drop in current week");
    console.log("   - Login issues identified as main pain point (22.5% impact)");
    console.log("   - Authentication category critically low (0.25 score)");
    console.log("   - Multiple active alerts for admin team");

  } catch (error) {
    console.error("❌ Error seeding sentiment data:", error);
    throw error;
  }
}

// Run the seed function
seedSentimentData()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedSentimentData };