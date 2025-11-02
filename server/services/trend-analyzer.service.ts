/**
 * Trend Analyzer Service
 * 
 * Uses TensorFlow.js for time series analysis to detect emerging trends,
 * patterns, and anomalies in various data sources.
 */

import * as tf from '@tensorflow/tfjs-node';
import { storage } from '../storage';
import { InsertTrend } from '@shared/schema';
import { openai } from '../openai';

interface TrendAnalysisConfig {
  dataSource: 'analytics' | 'feedback' | 'inventory' | 'recipes' | 'all';
  timeWindow: {
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
  minSampleSize: number;
}

interface TimeSeriesData {
  dates: Date[];
  values: number[];
  labels?: string[];
  metadata?: any[];
}

interface DetectedTrend {
  name: string;
  type: string;
  strength: number;
  confidence: number;
  growthRate: number;
  startDate: Date;
  peakDate?: Date;
  dataPoints: any;
  keywords?: string[];
}

class TrendAnalyzerService {
  private model: tf.LayersModel | null = null;
  
  constructor() {
    this.initializeModel();
  }
  
  /**
   * Initialize the TensorFlow.js model for trend detection
   */
  private async initializeModel() {
    try {
      // Create a simple LSTM model for time series analysis
      this.model = tf.sequential({
        layers: [
          tf.layers.lstm({
            units: 50,
            returnSequences: true,
            inputShape: [null, 1]
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.lstm({
            units: 50,
            returnSequences: false
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 25, activation: 'relu' }),
          tf.layers.dense({ units: 1 })
        ]
      });
      
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mse']
      });
      
      console.log('✓ TensorFlow.js trend detection model initialized');
    } catch (error) {
      console.error('Error initializing TensorFlow model:', error);
    }
  }
  
  /**
   * Analyze trends in the specified data source
   */
  async analyzeTrends(config: TrendAnalysisConfig): Promise<InsertTrend[]> {
    const trends: InsertTrend[] = [];
    
    try {
      // Fetch data based on the source
      const data = await this.fetchDataForAnalysis(config);
      
      if (!data || data.length === 0) {
        console.log('No data available for trend analysis');
        return trends;
      }
      
      // Process each data stream
      for (const stream of data) {
        if (stream.values.length < config.minSampleSize) {
          continue;
        }
        
        // Detect trends using multiple methods
        const movingAverageTrend = this.detectMovingAverageTrend(stream);
        const changePointTrend = await this.detectChangePoints(stream);
        const seasonalTrend = this.detectSeasonalPatterns(stream);
        const anomalyTrend = await this.detectAnomalies(stream);
        
        // Combine and filter significant trends
        // Requirement: Detect trends with 300%+ growth (growthRate >= 300)
        const detectedTrends = [
          movingAverageTrend,
          changePointTrend,
          seasonalTrend,
          anomalyTrend
        ].filter(t => t && (t.growthRate >= 300 || (t.type === 'anomaly' && t.strength > 0.7)));
        
        // Convert to database format
        for (const trend of detectedTrends) {
          if (trend) {
            const insertTrend = await this.formatTrendForStorage(trend);
            trends.push(insertTrend);
          }
        }
      }
      
      // Store trends in database
      const storedTrends = [];
      for (const trend of trends) {
        try {
          const stored = await storage.createTrend(trend);
          storedTrends.push(stored);
          
          // Check if we should trigger alerts
          await this.checkTrendAlerts(stored);
        } catch (error) {
          console.error('Error storing trend:', error);
        }
      }
      
      return storedTrends;
    } catch (error) {
      console.error('Error analyzing trends:', error);
      return trends;
    }
  }
  
  /**
   * Fetch data for trend analysis based on configuration
   */
  private async fetchDataForAnalysis(config: TrendAnalysisConfig): Promise<TimeSeriesData[]> {
    const data: TimeSeriesData[] = [];
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, config.timeWindow);
    
    try {
      if (config.dataSource === 'analytics' || config.dataSource === 'all') {
        // Fetch analytics events
        const events = await storage.getAnalyticsEvents({
          dateRange: { start: startDate, end: endDate }
        });
        
        // Group events by type and create time series
        const eventGroups = this.groupEventsByType(events);
        for (const [eventType, eventData] of Object.entries(eventGroups)) {
          data.push({
            dates: eventData.dates,
            values: eventData.counts,
            labels: Array(eventData.dates.length).fill(eventType),
            metadata: eventData.metadata
          });
        }
      }
      
      if (config.dataSource === 'feedback' || config.dataSource === 'all') {
        // Fetch user feedback
        const feedback = await storage.getFeedback({
          dateRange: { start: startDate, end: endDate }
        });
        
        // Analyze feedback sentiment and topics
        const feedbackSeries = this.processFeedbackData(feedback);
        data.push(...feedbackSeries);
      }
      
      if (config.dataSource === 'inventory' || config.dataSource === 'all') {
        // Fetch inventory changes
        const activityLogs = await storage.getActivityLogs({
          dateRange: { start: startDate, end: endDate },
          actionTypes: ['item_added', 'item_removed', 'item_updated']
        });
        
        // Create time series from inventory activities
        const inventorySeries = this.processInventoryData(activityLogs);
        data.push(...inventorySeries);
      }
      
      if (config.dataSource === 'recipes' || config.dataSource === 'all') {
        // Fetch recipe interactions
        const recipeLogs = await storage.getActivityLogs({
          dateRange: { start: startDate, end: endDate },
          actionTypes: ['recipe_viewed', 'recipe_created', 'recipe_favorited']
        });
        
        // Analyze recipe trends
        const recipeSeries = this.processRecipeData(recipeLogs);
        data.push(...recipeSeries);
      }
    } catch (error) {
      console.error('Error fetching data for analysis:', error);
    }
    
    return data;
  }
  
  /**
   * Detect trends using moving average analysis
   */
  private detectMovingAverageTrend(data: TimeSeriesData): DetectedTrend | null {
    if (data.values.length < 7) return null;
    
    // Calculate simple and exponential moving averages
    const windowSize = Math.min(7, Math.floor(data.values.length / 3));
    const sma = this.calculateSMA(data.values, windowSize);
    const ema = this.calculateEMA(data.values, windowSize);
    
    // Detect trend direction and strength
    const lastSMA = sma[sma.length - 1];
    const firstSMA = sma[0];
    const growthRate = ((lastSMA - firstSMA) / firstSMA) * 100;
    
    // Calculate trend strength based on consistency
    const strength = this.calculateTrendStrength(sma);
    
    // Only return trends with significant growth (300%+ for emerging trends)
    if (Math.abs(growthRate) < 50 && strength < 0.5) {
      return null;
    }
    
    // Extract keywords from labels if available
    const keywords = this.extractKeywords(data.labels || []);
    
    return {
      name: `${growthRate > 0 ? 'Growing' : 'Declining'} trend in ${data.labels?.[0] || 'data'}`,
      type: growthRate > 0 ? 'growth' : 'decline',
      strength,
      confidence: 0.7,
      growthRate,
      startDate: data.dates[0],
      peakDate: this.findPeakDate(data),
      dataPoints: {
        timeSeries: data.dates.map((date, i) => ({
          date: date.toISOString(),
          value: data.values[i],
          sma: sma[i],
          ema: ema[i]
        })),
        keywords
      },
      keywords
    };
  }
  
  /**
   * Detect change points in time series data
   */
  private async detectChangePoints(data: TimeSeriesData): Promise<DetectedTrend | null> {
    if (!this.model || data.values.length < 20) return null;
    
    try {
      // Normalize data
      const normalized = this.normalizeData(data.values);
      
      // Prepare data for LSTM
      const sequenceLength = 10;
      const sequences = [];
      const targets = [];
      
      for (let i = 0; i < normalized.length - sequenceLength; i++) {
        sequences.push(normalized.slice(i, i + sequenceLength));
        targets.push(normalized[i + sequenceLength]);
      }
      
      if (sequences.length === 0) return null;
      
      // Create tensors
      const xs = tf.tensor3d(sequences, [sequences.length, sequenceLength, 1]);
      const ys = tf.tensor2d(targets, [targets.length, 1]);
      
      // Train model briefly on this specific data
      await this.model.fit(xs, ys, {
        epochs: 10,
        batchSize: 32,
        verbose: 0
      });
      
      // Predict future values
      const lastSequence = tf.tensor3d(
        [normalized.slice(-sequenceLength)],
        [1, sequenceLength, 1]
      );
      const prediction = this.model.predict(lastSequence) as tf.Tensor;
      const predictedValue = (await prediction.data())[0];
      
      // Calculate prediction error to detect change points
      const actualLast = normalized[normalized.length - 1];
      const error = Math.abs(predictedValue - actualLast);
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      lastSequence.dispose();
      prediction.dispose();
      
      // If error is significant, we have a change point
      if (error > 0.3) {
        const growthRate = ((data.values[data.values.length - 1] - data.values[data.values.length - 10]) / 
                           data.values[data.values.length - 10]) * 100;
        
        return {
          name: `Significant change detected in ${data.labels?.[0] || 'pattern'}`,
          type: 'change_point',
          strength: Math.min(error, 1),
          confidence: 0.65,
          growthRate,
          startDate: data.dates[data.dates.length - 10],
          dataPoints: {
            timeSeries: data.dates.slice(-20).map((date, i) => ({
              date: date.toISOString(),
              value: data.values[data.values.length - 20 + i],
              predicted: i === 19 ? predictedValue * this.getDataScale(data.values) : undefined
            })),
            changePoint: data.dates[data.dates.length - 1].toISOString(),
            predictionError: error
          }
        };
      }
    } catch (error) {
      console.error('Error detecting change points:', error);
    }
    
    return null;
  }
  
  /**
   * Detect seasonal patterns
   */
  private detectSeasonalPatterns(data: TimeSeriesData): DetectedTrend | null {
    if (data.values.length < 28) return null; // Need at least 4 weeks of data
    
    // Perform FFT to find periodic components
    const fftResult = this.performFFT(data.values);
    const dominantFrequency = this.findDominantFrequency(fftResult);
    
    if (!dominantFrequency || dominantFrequency.power < 0.3) {
      return null;
    }
    
    const period = Math.round(data.values.length / dominantFrequency.frequency);
    const periodName = this.getPeriodName(period);
    
    return {
      name: `${periodName} pattern in ${data.labels?.[0] || 'activity'}`,
      type: 'seasonal',
      strength: dominantFrequency.power,
      confidence: 0.6,
      growthRate: 0,
      startDate: data.dates[0],
      dataPoints: {
        timeSeries: data.dates.map((date, i) => ({
          date: date.toISOString(),
          value: data.values[i]
        })),
        period,
        periodName,
        frequency: dominantFrequency.frequency
      }
    };
  }
  
  /**
   * Detect anomalies using statistical methods
   */
  private async detectAnomalies(data: TimeSeriesData): Promise<DetectedTrend | null> {
    if (data.values.length < 10) return null;
    
    // Calculate statistics
    const mean = data.values.reduce((a, b) => a + b, 0) / data.values.length;
    const stdDev = Math.sqrt(
      data.values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.values.length
    );
    
    // Find anomalies (values beyond 2.5 standard deviations)
    const anomalies = data.values
      .map((value, index) => ({
        index,
        value,
        date: data.dates[index],
        zScore: Math.abs((value - mean) / stdDev)
      }))
      .filter(item => item.zScore > 2.5);
    
    if (anomalies.length === 0) return null;
    
    // Check if anomalies are recent (last 25% of data)
    const recentThreshold = Math.floor(data.values.length * 0.75);
    const recentAnomalies = anomalies.filter(a => a.index >= recentThreshold);
    
    if (recentAnomalies.length > 0) {
      const maxAnomaly = recentAnomalies.reduce((max, a) => 
        a.zScore > max.zScore ? a : max
      );
      
      return {
        name: `Unusual spike in ${data.labels?.[0] || 'metrics'}`,
        type: 'anomaly',
        strength: Math.min(maxAnomaly.zScore / 4, 1),
        confidence: 0.75,
        growthRate: ((maxAnomaly.value - mean) / mean) * 100,
        startDate: maxAnomaly.date,
        dataPoints: {
          timeSeries: data.dates.map((date, i) => ({
            date: date.toISOString(),
            value: data.values[i],
            isAnomaly: anomalies.some(a => a.index === i)
          })),
          anomalies: anomalies.map(a => ({
            date: a.date.toISOString(),
            value: a.value,
            zScore: a.zScore
          })),
          statistics: { mean, stdDev }
        }
      };
    }
    
    return null;
  }
  
  /**
   * Format trend for database storage
   */
  private async formatTrendForStorage(trend: DetectedTrend): Promise<InsertTrend> {
    // Determine status based on trend characteristics
    let status: 'emerging' | 'active' | 'peaking' | 'declining' | 'ended' = 'emerging';
    
    if (trend.strength > 0.7) {
      status = 'active';
    } else if (trend.growthRate < -20) {
      status = 'declining';
    } else if (trend.peakDate && 
               new Date().getTime() - trend.peakDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
      status = 'declining';
    }
    
    return {
      trendName: trend.name,
      trendType: this.mapTrendType(trend.type),
      strength: trend.strength,
      confidence: trend.confidence,
      growthRate: trend.growthRate,
      startDate: trend.startDate,
      peakDate: trend.peakDate,
      status,
      dataPoints: trend.dataPoints,
      metadata: {
        detectionMethod: trend.type,
        modelVersion: '1.0.0',
        dataWindow: {
          start: trend.dataPoints.timeSeries?.[0]?.date,
          end: trend.dataPoints.timeSeries?.[trend.dataPoints.timeSeries.length - 1]?.date
        },
        sampleSize: trend.dataPoints.timeSeries?.length || 0
      }
    };
  }
  
  /**
   * Check if trend should trigger alerts
   */
  private async checkTrendAlerts(trend: any): Promise<void> {
    try {
      // Get active alert configurations
      const alerts = await storage.getTrendAlerts();
      
      for (const alert of alerts) {
        if (!alert.isActive) continue;
        
        let shouldTrigger = false;
        const conditions = alert.conditions as any;
        
        // Check alert conditions
        if (alert.alertType === 'emergence' && trend.status === 'emerging') {
          shouldTrigger = true;
        } else if (alert.alertType === 'threshold' && 
                   alert.threshold && 
                   trend.strength >= alert.threshold) {
          shouldTrigger = true;
        } else if (alert.alertType === 'acceleration' && 
                   conditions?.minGrowthRate &&
                   trend.growthRate >= conditions.minGrowthRate) {
          shouldTrigger = true;
        }
        
        // Check additional conditions
        if (shouldTrigger && conditions) {
          if (conditions.minConfidence && trend.confidence < conditions.minConfidence) {
            shouldTrigger = false;
          }
          if (conditions.trendTypes && !conditions.trendTypes.includes(trend.trendType)) {
            shouldTrigger = false;
          }
          if (conditions.keywords && trend.dataPoints?.keywords) {
            const hasKeyword = conditions.keywords.some((kw: string) => 
              trend.dataPoints.keywords.includes(kw)
            );
            if (!hasKeyword) shouldTrigger = false;
          }
        }
        
        if (shouldTrigger) {
          // Generate alert message
          const message = `Trend Alert: ${trend.trendName} detected with ${trend.strength.toFixed(2)} strength and ${trend.growthRate.toFixed(1)}% growth rate.`;
          
          // Notify users
          const notifiedUsers = alert.userId ? [alert.userId] : [];
          await storage.triggerTrendAlert(alert.id, message, notifiedUsers);
          
          console.log(`Triggered alert ${alert.id} for trend ${trend.id}`);
        }
      }
    } catch (error) {
      console.error('Error checking trend alerts:', error);
    }
  }
  
  // Helper methods
  
  private getStartDate(endDate: Date, timeWindow: { value: number; unit: string }): Date {
    const startDate = new Date(endDate);
    switch (timeWindow.unit) {
      case 'hours':
        startDate.setHours(startDate.getHours() - timeWindow.value);
        break;
      case 'days':
        startDate.setDate(startDate.getDate() - timeWindow.value);
        break;
      case 'weeks':
        startDate.setDate(startDate.getDate() - (timeWindow.value * 7));
        break;
      case 'months':
        startDate.setMonth(startDate.getMonth() - timeWindow.value);
        break;
    }
    return startDate;
  }
  
  private groupEventsByType(events: any[]): Record<string, any> {
    const groups: Record<string, any> = {};
    
    events.forEach(event => {
      const eventType = event.eventType || 'unknown';
      if (!groups[eventType]) {
        groups[eventType] = {
          dates: [],
          counts: [],
          metadata: []
        };
      }
      
      const date = new Date(event.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      const index = groups[eventType].dates.findIndex((d: Date) => 
        d.toISOString().split('T')[0] === dateStr
      );
      
      if (index >= 0) {
        groups[eventType].counts[index]++;
      } else {
        groups[eventType].dates.push(date);
        groups[eventType].counts.push(1);
        groups[eventType].metadata.push(event);
      }
    });
    
    return groups;
  }
  
  private processFeedbackData(feedback: any[]): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    // Group by date and calculate sentiment
    const dailyData: Record<string, any> = {};
    
    feedback.forEach(item => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          count: 0,
          positive: 0,
          negative: 0,
          keywords: []
        };
      }
      
      dailyData[date].count++;
      if (item.sentiment === 'positive') dailyData[date].positive++;
      if (item.sentiment === 'negative') dailyData[date].negative++;
      
      // Extract keywords from feedback
      if (item.feedback) {
        const words = item.feedback.toLowerCase().split(/\W+/);
        dailyData[date].keywords.push(...words.filter((w: string) => w.length > 4));
      }
    });
    
    const dates = Object.keys(dailyData).sort();
    
    // Create time series for feedback volume
    data.push({
      dates: dates.map(d => new Date(d)),
      values: dates.map(d => dailyData[d].count),
      labels: Array(dates.length).fill('feedback_volume')
    });
    
    // Create time series for sentiment
    if (dates.length > 0) {
      data.push({
        dates: dates.map(d => new Date(d)),
        values: dates.map(d => 
          dailyData[d].positive / (dailyData[d].count || 1)
        ),
        labels: Array(dates.length).fill('positive_sentiment')
      });
    }
    
    return data;
  }
  
  private processInventoryData(logs: any[]): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    // Group by date and action type
    const dailyData: Record<string, any> = {};
    
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          added: 0,
          removed: 0,
          updated: 0
        };
      }
      
      if (log.actionType === 'item_added') dailyData[date].added++;
      if (log.actionType === 'item_removed') dailyData[date].removed++;
      if (log.actionType === 'item_updated') dailyData[date].updated++;
    });
    
    const dates = Object.keys(dailyData).sort();
    
    if (dates.length > 0) {
      // Inventory additions
      data.push({
        dates: dates.map(d => new Date(d)),
        values: dates.map(d => dailyData[d].added),
        labels: Array(dates.length).fill('inventory_additions')
      });
      
      // Inventory turnover
      data.push({
        dates: dates.map(d => new Date(d)),
        values: dates.map(d => dailyData[d].removed),
        labels: Array(dates.length).fill('inventory_turnover')
      });
    }
    
    return data;
  }
  
  private processRecipeData(logs: any[]): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    
    // Track recipe categories and cuisines
    const dailyData: Record<string, any> = {};
    const recipeTypes: Record<string, number> = {};
    
    logs.forEach(log => {
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          views: 0,
          created: 0,
          favorited: 0
        };
      }
      
      if (log.actionType === 'recipe_viewed') dailyData[date].views++;
      if (log.actionType === 'recipe_created') dailyData[date].created++;
      if (log.actionType === 'recipe_favorited') dailyData[date].favorited++;
      
      // Track recipe metadata
      if (log.metadata?.recipeType) {
        recipeTypes[log.metadata.recipeType] = 
          (recipeTypes[log.metadata.recipeType] || 0) + 1;
      }
    });
    
    const dates = Object.keys(dailyData).sort();
    
    if (dates.length > 0) {
      // Recipe engagement
      data.push({
        dates: dates.map(d => new Date(d)),
        values: dates.map(d => dailyData[d].views),
        labels: Array(dates.length).fill('recipe_views')
      });
      
      // Recipe creation
      data.push({
        dates: dates.map(d => new Date(d)),
        values: dates.map(d => dailyData[d].created),
        labels: Array(dates.length).fill('recipe_creation')
      });
    }
    
    return data;
  }
  
  private calculateSMA(values: number[], windowSize: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < windowSize - 1) {
        sma.push(values[i]);
      } else {
        const sum = values.slice(i - windowSize + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / windowSize);
      }
    }
    return sma;
  }
  
  private calculateEMA(values: number[], windowSize: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (windowSize + 1);
    
    // Start with SMA for first value
    const firstSMA = values.slice(0, windowSize).reduce((a, b) => a + b, 0) / windowSize;
    ema.push(firstSMA);
    
    for (let i = 1; i < values.length; i++) {
      const emaValue = (values[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
      ema.push(emaValue);
    }
    
    return ema;
  }
  
  private calculateTrendStrength(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Calculate correlation coefficient with time
    const n = values.length;
    const times = Array.from({ length: n }, (_, i) => i);
    
    const sumX = times.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = times.reduce((sum, x, i) => sum + x * values[i], 0);
    const sumX2 = times.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = values.reduce((sum, y) => sum + y * y, 0);
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return Math.abs(correlation);
  }
  
  private findPeakDate(data: TimeSeriesData): Date | undefined {
    if (data.values.length === 0) return undefined;
    
    const maxIndex = data.values.indexOf(Math.max(...data.values));
    return data.dates[maxIndex];
  }
  
  private extractKeywords(labels: string[]): string[] {
    const wordCount: Record<string, number> = {};
    
    labels.forEach(label => {
      const words = label.toLowerCase().split(/[\s_-]+/);
      words.forEach(word => {
        if (word.length > 3 && !this.isStopWord(word)) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });
    
    // Return top keywords
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will'];
    return stopWords.includes(word);
  }
  
  private normalizeData(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    return values.map(v => (v - min) / range);
  }
  
  private getDataScale(values: number[]): number {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max - min || 1;
  }
  
  private performFFT(values: number[]): number[] {
    // Simple DFT implementation for frequency analysis
    const n = values.length;
    const frequencies: number[] = [];
    
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let t = 0; t < n; t++) {
        const angle = -2 * Math.PI * k * t / n;
        real += values[t] * Math.cos(angle);
        imag += values[t] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(real * real + imag * imag) / n;
      frequencies.push(magnitude);
    }
    
    return frequencies;
  }
  
  private findDominantFrequency(fftResult: number[]): { frequency: number; power: number } | null {
    if (fftResult.length < 2) return null;
    
    // Skip DC component (index 0)
    let maxIndex = 1;
    let maxPower = fftResult[1];
    
    for (let i = 2; i < fftResult.length; i++) {
      if (fftResult[i] > maxPower) {
        maxPower = fftResult[i];
        maxIndex = i;
      }
    }
    
    // Normalize power to 0-1 range
    const totalPower = fftResult.reduce((sum, p) => sum + p, 0);
    const normalizedPower = totalPower > 0 ? maxPower / totalPower : 0;
    
    return {
      frequency: maxIndex,
      power: Math.min(normalizedPower * 2, 1) // Scale up for visibility
    };
  }
  
  private getPeriodName(period: number): string {
    if (period <= 1) return 'Daily';
    if (period <= 7) return 'Weekly';
    if (period <= 14) return 'Bi-weekly';
    if (period <= 30) return 'Monthly';
    if (period <= 90) return 'Quarterly';
    return 'Long-term';
  }
  
  private mapTrendType(type: string): string {
    const typeMap: Record<string, string> = {
      'growth': 'behavior',
      'decline': 'behavior',
      'change_point': 'behavior',
      'seasonal': 'seasonal',
      'anomaly': 'behavior'
    };
    
    return typeMap[type] || 'topic';
  }
}

export const trendAnalyzer = new TrendAnalyzerService();