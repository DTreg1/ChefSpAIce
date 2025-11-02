/**
 * Simple Seed Script for Sentiment Demo Data
 * Creates minimal demo data to show the sentiment dashboard functionality
 */

import { db } from "./db";

async function seedSimpleSentimentData() {
  console.log("🌱 Seeding simple sentiment demo data...");

  try {
    // Insert simple sentiment metrics using raw SQL
    await db.execute(`
      INSERT INTO sentiment_metrics (period, period_type, avg_sentiment, total_items, percentage_change, alert_triggered, categories, pain_points)
      VALUES 
        ('2024-11-01', 'week', 0.55, 486, -15.4, true, 
         '{"authentication": 0.25, "performance": 0.65, "features": 0.70}',
         '[{"issue": "Login issues", "impact": 22.5, "category": "authentication"}]'),
        ('2024-10-25', 'week', 0.65, 312, -9.7, false,
         '{"authentication": 0.45, "performance": 0.70, "features": 0.75}',
         '[]'),
        ('2024-10-18', 'week', 0.72, 245, 0, false,
         '{"authentication": 0.65, "performance": 0.75, "features": 0.80}',
         '[]')
    `);

    console.log("✅ Sentiment metrics inserted");

    // Insert simple alerts
    await db.execute(`
      INSERT INTO sentiment_alerts (alert_type, threshold, current_value, severity, message, status, affected_category, metadata)
      VALUES 
        ('sentiment_drop', -10, -15.4, 'high', 
         'Sentiment dropped 15.4% compared to last week - exceeds threshold', 
         'active', 'authentication',
         '{"percentageChange": -15.4, "relatedIssues": ["Login issues", "Session timeouts"]}'),
        ('category_issue', 0.4, 0.25, 'critical',
         'Authentication category sentiment critically low at 0.25',
         'active', 'authentication',
         '{"percentageChange": -44.4, "relatedIssues": ["Login timeouts", "2FA not working"]}')
    `);

    console.log("✅ Sentiment alerts inserted");

    // Insert simple segments
    await db.execute(`
      INSERT INTO sentiment_segments (period, period_type, segment_name, sentiment_score, sample_size, positive_count, negative_count, neutral_count, top_issues)
      VALUES 
        ('2024-11-01', 'week', 'New Users', 0.35, 142, 28, 85, 29,
         '[{"issue": "Cannot login", "count": 45, "sentiment": -0.8}, {"issue": "Account creation fails", "count": 40, "sentiment": -0.9}]'),
        ('2024-11-01', 'week', 'Premium Users', 0.62, 198, 98, 55, 45,
         '[{"issue": "Login delays", "count": 25, "sentiment": -0.6}, {"issue": "Session expires quickly", "count": 30, "sentiment": -0.7}]'),
        ('2024-11-01', 'week', 'Mobile Users', 0.48, 146, 45, 72, 29,
         '[{"issue": "App crashes on login", "count": 35, "sentiment": -0.85}, {"issue": "Fingerprint auth not working", "count": 37, "sentiment": -0.8}]')
    `);

    console.log("✅ Sentiment segments inserted");

    console.log("\n✅ Simple sentiment demo data seeded successfully!");
    console.log("\n🎯 Key Demo Points:");
    console.log("   - 15.4% sentiment drop in current week");
    console.log("   - Login issues identified as main pain point");
    console.log("   - Authentication category critically low (0.25 score)");
    console.log("   - 2 active alerts for admin team");

  } catch (error) {
    console.error("❌ Error seeding sentiment data:", error);
    throw error;
  }
}

// Run the seed function
seedSimpleSentimentData()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedSimpleSentimentData };