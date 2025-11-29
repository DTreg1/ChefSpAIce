/**
 * Lightweight Prediction Service
 * 
 * Replaces heavy TensorFlow models with simple, rule-based algorithms
 * that don't block the server startup
 */

import type { UserMetrics } from './predictionService';

/**
 * Rule-based churn prediction
 * Returns probability between 0 and 1
 */
export function predictChurnLightweight(metrics: UserMetrics): number {
  let churnScore = 0;
  let weightSum = 0;

  // Days since last active (weight: 0.35)
  const daysSinceActive = Math.floor((Date.now() - metrics.lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceActive > 30) churnScore += 0.35;
  else if (daysSinceActive > 14) churnScore += 0.25;
  else if (daysSinceActive > 7) churnScore += 0.15;
  weightSum += 0.35;

  // Session frequency (weight: 0.25)
  if (metrics.sessionCount < 5) churnScore += 0.25;
  else if (metrics.sessionCount < 10) churnScore += 0.15;
  else if (metrics.sessionCount < 20) churnScore += 0.05;
  weightSum += 0.25;

  // Average session duration in seconds (weight: 0.15)
  if (metrics.averageSessionDuration < 60) churnScore += 0.15;
  else if (metrics.averageSessionDuration < 180) churnScore += 0.10;
  else if (metrics.averageSessionDuration < 300) churnScore += 0.05;
  weightSum += 0.15;

  // Feature adoption (weight: 0.15)
  const featuresUsed = Object.keys(metrics.featureUsageCount).length;
  if (featuresUsed < 2) churnScore += 0.15;
  else if (featuresUsed < 4) churnScore += 0.10;
  else if (featuresUsed < 6) churnScore += 0.05;
  weightSum += 0.15;

  // Activity trend (weight: 0.10)
  if (metrics.activityTrend < -0.5) churnScore += 0.10;
  else if (metrics.activityTrend < -0.2) churnScore += 0.07;
  else if (metrics.activityTrend < 0) churnScore += 0.03;
  weightSum += 0.10;

  // Normalize score
  return Math.min(1, Math.max(0, churnScore));
}

/**
 * Calculate engagement probability for a given hour
 * Based on common user behavior patterns
 */
export function calculateEngagementProbability(
  hour: number,
  dayOfWeek: number,
  notificationType: string,
  userActiveHours?: number[]
): number {
  let score = 0.5; // Base score

  // If we have user's active hours history, use it
  if (userActiveHours && userActiveHours.length > 0) {
    const avgActiveHour = userActiveHours.reduce((a, b) => a + b, 0) / userActiveHours.length;
    const hourDiff = Math.abs(hour - avgActiveHour);
    
    // Score based on proximity to user's typical active time
    if (hourDiff <= 1) score = 0.9;
    else if (hourDiff <= 2) score = 0.7;
    else if (hourDiff <= 3) score = 0.5;
    else score = 0.3;
  } else {
    // Use general patterns
    // Peak hours: 8-10am, 12-1pm, 6-9pm
    if ((hour >= 8 && hour <= 10) || (hour === 12) || (hour >= 18 && hour <= 21)) {
      score = 0.8;
    }
    // Good hours: 10am-12pm, 2-6pm
    else if ((hour > 10 && hour < 12) || (hour >= 14 && hour < 18)) {
      score = 0.6;
    }
    // Off hours: late night/early morning
    else if (hour >= 22 || hour < 7) {
      score = 0.2;
    }
    else {
      score = 0.4;
    }
  }

  // Adjust for weekend vs weekday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend: shift preference later
    if (hour >= 10 && hour <= 14) score += 0.1;
  } else {
    // Weekday: commute times and lunch
    if ((hour >= 7 && hour <= 9) || (hour >= 11 && hour <= 13)) score += 0.1;
  }

  // Adjust for notification type
  switch (notificationType) {
    case 'expiring_food':
      // Higher score during meal prep times
      if ((hour >= 16 && hour <= 19) || (hour >= 9 && hour <= 11)) score += 0.15;
      break;
    case 'meal_reminder':
      // Peak at meal times
      if ((hour === 7) || (hour === 12) || (hour === 18)) score += 0.2;
      break;
    case 'recipe_suggestion':
      // Best before meal prep times
      if ((hour >= 15 && hour <= 17) || (hour === 10)) score += 0.15;
      break;
    case 'shopping_alert':
      // Weekend mornings or weekday evenings
      if ((dayOfWeek === 0 || dayOfWeek === 6) && hour >= 9 && hour <= 12) score += 0.2;
      else if (dayOfWeek !== 0 && dayOfWeek !== 6 && hour >= 17 && hour <= 20) score += 0.15;
      break;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Simple moving average trend detection
 * Returns growth rate and trend strength
 */
export function detectSimpleTrend(values: number[]): {
  growthRate: number;
  strength: number;
  direction: 'up' | 'down' | 'stable';
} {
  if (values.length < 3) {
    return { growthRate: 0, strength: 0, direction: 'stable' };
  }

  // Calculate simple moving averages
  const windowSize = Math.min(Math.floor(values.length / 3), 7);
  const recentAvg = values.slice(-windowSize).reduce((a, b) => a + b, 0) / windowSize;
  const historicalAvg = values.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;

  // Avoid division by zero
  if (historicalAvg === 0) {
    return { 
      growthRate: recentAvg > 0 ? 100 : 0, 
      strength: recentAvg > 0 ? 0.5 : 0, 
      direction: recentAvg > 0 ? 'up' : 'stable' 
    };
  }

  // Calculate growth rate as percentage
  const growthRate = ((recentAvg - historicalAvg) / historicalAvg) * 100;

  // Calculate trend strength (0-1) based on consistency
  let consistentIncreases = 0;
  let consistentDecreases = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) consistentIncreases++;
    else if (values[i] < values[i - 1]) consistentDecreases++;
  }

  const consistency = Math.max(consistentIncreases, consistentDecreases) / (values.length - 1);
  const strength = Math.min(1, consistency * Math.abs(growthRate) / 100);

  // Determine direction
  let direction: 'up' | 'down' | 'stable';
  if (growthRate > 10) direction = 'up';
  else if (growthRate < -10) direction = 'down';
  else direction = 'stable';

  return { growthRate, strength, direction };
}

/**
 * Detect anomalies using statistical methods
 * Returns anomaly score and detected anomalies
 */
export function detectAnomalies(values: number[]): {
  anomalyScore: number;
  anomalies: { index: number; value: number; zscore: number }[];
} {
  if (values.length < 5) {
    return { anomalyScore: 0, anomalies: [] };
  }

  // Calculate mean and standard deviation
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Find anomalies (z-score > 2)
  const anomalies: { index: number; value: number; zscore: number }[] = [];
  
  if (stdDev > 0) {
    values.forEach((value, index) => {
      const zscore = Math.abs((value - mean) / stdDev);
      if (zscore > 2) {
        anomalies.push({ index, value, zscore });
      }
    });
  }

  // Calculate overall anomaly score
  const anomalyScore = Math.min(1, anomalies.length / Math.max(1, values.length * 0.1));

  return { anomalyScore, anomalies };
}

/**
 * Detect seasonal patterns using autocorrelation
 */
export function detectSeasonality(values: number[], periodLength = 7): {
  hasSeasonality: boolean;
  strength: number;
  period: number;
} {
  if (values.length < periodLength * 2) {
    return { hasSeasonality: false, strength: 0, period: 0 };
  }

  // Calculate autocorrelation for the specified period
  let correlation = 0;
  let count = 0;
  
  for (let i = periodLength; i < values.length; i++) {
    correlation += values[i] * values[i - periodLength];
    count++;
  }
  
  if (count > 0) {
    correlation = correlation / count;
    
    // Normalize correlation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    
    if (variance > 0) {
      const normalizedCorrelation = correlation / variance;
      const strength = Math.min(1, Math.abs(normalizedCorrelation));
      
      return {
        hasSeasonality: strength > 0.3,
        strength,
        period: periodLength
      };
    }
  }

  return { hasSeasonality: false, strength: 0, period: 0 };
}