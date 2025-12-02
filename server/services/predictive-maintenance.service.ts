/**
 * Predictive Maintenance Service
 *
 * Implements LSTM Autoencoder for anomaly detection and time series forecasting
 * using TensorFlow.js for browser/Node.js compatibility.
 *
 * Architecture:
 * - LSTM Autoencoder: Detects anomalies in system metrics
 * - Time Series Forecasting: Predicts future component failures
 * - Real-time Processing: Streaming metric analysis
 * - Model Management: Training, saving, and loading models
 */

import * as tf from "@tensorflow/tfjs-node";
import { db } from "../db";
import {
  systemMetrics,
  maintenancePredictions,
  maintenanceHistory,
  type SystemMetric,
  type InsertSystemMetric,
  type InsertMaintenancePrediction,
  type MaintenancePrediction,
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

// Model configuration
const MODEL_CONFIG = {
  WINDOW_SIZE: 30, // Time steps for LSTM input
  FEATURES: 4, // Number of metrics per component (cpu, memory, latency, error_rate)
  ENCODING_DIM: 16, // Bottleneck layer size
  LSTM_UNITS: 64, // LSTM layer units
  DROPOUT_RATE: 0.2, // Dropout for regularization
  BATCH_SIZE: 32,
  EPOCHS: 50,
  LEARNING_RATE: 0.001,
  THRESHOLD_PERCENTILE: 95, // Anomaly threshold percentile
};

// Component types we monitor (stored in metricName prefix)
export const MONITORED_COMPONENTS = {
  DATABASE: "database",
  SERVER: "server",
  CACHE: "cache",
  API: "api",
  STORAGE: "storage",
} as const;

// Valid metric types per schema
export const VALID_METRIC_TYPES = {
  PERFORMANCE: "performance",
  RESOURCE: "resource",
  ERROR_RATE: "error_rate",
  AVAILABILITY: "availability",
  LATENCY: "latency",
} as const;

type ValidMetricType =
  (typeof VALID_METRIC_TYPES)[keyof typeof VALID_METRIC_TYPES];

// Metric names we track (stored in metricName)
export const METRIC_NAMES = {
  CPU_USAGE: "cpu_usage",
  MEMORY_USAGE: "memory_usage",
  QUERY_TIME: "query_time",
  ERROR_RATE: "error_rate",
  RESPONSE_TIME: "response_time",
  DISK_USAGE: "disk_usage",
  CONNECTION_COUNT: "connection_count",
} as const;

// Map metric names to valid metric types
function getMetricType(metricName: string): ValidMetricType {
  switch (metricName) {
    case METRIC_NAMES.CPU_USAGE:
    case METRIC_NAMES.MEMORY_USAGE:
    case METRIC_NAMES.DISK_USAGE:
      return "resource";
    case METRIC_NAMES.QUERY_TIME:
    case METRIC_NAMES.RESPONSE_TIME:
      return "latency";
    case METRIC_NAMES.ERROR_RATE:
      return "error_rate";
    case METRIC_NAMES.CONNECTION_COUNT:
      return "performance";
    default:
      return "performance";
  }
}

// Extended metric interface with computed anomaly score
interface MetricWithAnomalyScore extends SystemMetric {
  anomalyScore?: number;
}

/**
 * LSTM Autoencoder Model for Anomaly Detection
 */
class LSTMAutoencoder {
  private model: tf.LayersModel | null = null;
  private threshold: number = 0.1;
  private scaler: { mean: tf.Tensor; std: tf.Tensor } | null = null;

  /**
   * Build the LSTM Autoencoder architecture
   */
  buildModel(): tf.LayersModel {
    const model = tf.sequential();

    // Encoder
    model.add(
      tf.layers.lstm({
        units: MODEL_CONFIG.LSTM_UNITS,
        inputShape: [MODEL_CONFIG.WINDOW_SIZE, MODEL_CONFIG.FEATURES],
        returnSequences: false,
        kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
      }),
    );

    model.add(tf.layers.dropout({ rate: MODEL_CONFIG.DROPOUT_RATE }));

    // Bottleneck
    model.add(
      tf.layers.dense({
        units: MODEL_CONFIG.ENCODING_DIM,
        activation: "relu",
      }),
    );

    // Decoder
    model.add(tf.layers.repeatVector({ n: MODEL_CONFIG.WINDOW_SIZE }));

    model.add(
      tf.layers.lstm({
        units: MODEL_CONFIG.LSTM_UNITS,
        returnSequences: true,
      }),
    );

    model.add(tf.layers.dropout({ rate: MODEL_CONFIG.DROPOUT_RATE }));

    model.add(
      tf.layers.timeDistributed({
        layer: tf.layers.dense({ units: MODEL_CONFIG.FEATURES }),
      }),
    );

    model.compile({
      optimizer: tf.train.adam(MODEL_CONFIG.LEARNING_RATE),
      loss: "meanAbsoluteError",
      metrics: ["mae"],
    });

    this.model = model;
    return model;
  }

  /**
   * Normalize data using z-score normalization
   */
  normalizeData(data: tf.Tensor): tf.Tensor {
    return tf.tidy(() => {
      if (!this.scaler) {
        const mean = data.mean(0);
        const variance = tf.moments(data, 0).variance;
        const std = variance.sqrt();
        this.scaler = { mean, std };
      }
      return data.sub(this.scaler.mean).div(this.scaler.std.add(1e-8));
    });
  }

  /**
   * Create sliding windows from time series data
   */
  createWindows(data: number[][], windowSize: number): number[][][] {
    const windows: number[][][] = [];
    for (let i = 0; i <= data.length - windowSize; i++) {
      windows.push(data.slice(i, i + windowSize));
    }
    return windows;
  }

  /**
   * Train the model on normal data
   */
  async train(normalData: number[][][]): Promise<tf.History> {
    if (!this.model) {
      this.buildModel();
    }

    const dataTensor = tf.tensor3d(normalData);
    const normalizedData = this.normalizeData(dataTensor);

    const history = await this.model!.fit(normalizedData, normalizedData, {
      epochs: MODEL_CONFIG.EPOCHS,
      batchSize: MODEL_CONFIG.BATCH_SIZE,
      validationSplit: 0.1,
      shuffle: false, // Preserve temporal order
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}`);
        },
      },
    });

    // Calculate threshold from training data
    this.threshold = await this.calculateThreshold(normalizedData);

    dataTensor.dispose();
    normalizedData.dispose();

    return history;
  }

  /**
   * Calculate anomaly threshold based on reconstruction error distribution
   */
  async calculateThreshold(trainingData: tf.Tensor): Promise<number> {
    return tf.tidy(() => {
      const predictions = this.model!.predict(trainingData) as tf.Tensor;
      const errors = tf.abs(trainingData.sub(predictions)).mean([1, 2]);
      const errorArray = errors.arraySync() as number[];

      const sorted = errorArray.sort((a, b) => a - b);
      const idx = Math.floor(
        (sorted.length * MODEL_CONFIG.THRESHOLD_PERCENTILE) / 100,
      );

      return sorted[idx];
    });
  }

  /**
   * Detect anomalies in new data
   */
  detectAnomalies(
    testData: number[][][],
  ): Array<{ index: number; score: number; isAnomaly: boolean }> {
    return tf.tidy(() => {
      const dataTensor = tf.tensor3d(testData);
      const normalizedData = this.normalizeData(dataTensor);

      const predictions = this.model!.predict(normalizedData) as tf.Tensor;
      const errors = tf.abs(normalizedData.sub(predictions)).mean([1, 2]);
      const errorArray = errors.arraySync() as number[];

      return errorArray.map((error, idx) => ({
        index: idx,
        score: error / this.threshold, // Normalize to 0-1 scale
        isAnomaly: error > this.threshold,
      }));
    });
  }

  /**
   * Save the model to disk
   */
  async saveModel(path: string): Promise<void> {
    if (this.model) {
      await this.model.save(`file://${path}`);

      // Save scaler parameters and threshold
      const metadata = {
        threshold: this.threshold,
        scaler: this.scaler
          ? {
              mean: await this.scaler.mean.array(),
              std: await this.scaler.std.array(),
            }
          : null,
      };

      const fs = await import("fs/promises");
      await fs.writeFile(`${path}/metadata.json`, JSON.stringify(metadata));
    }
  }

  /**
   * Load a saved model from disk
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);

    // Load metadata
    const fs = await import("fs/promises");
    const metadataStr = await fs.readFile(`${path}/metadata.json`, "utf-8");
    const metadata = JSON.parse(metadataStr);

    this.threshold = metadata.threshold;
    if (metadata.scaler) {
      this.scaler = {
        mean: tf.tensor(metadata.scaler.mean),
        std: tf.tensor(metadata.scaler.std),
      };
    }
  }
}

/**
 * Time Series Forecasting Model for Predictive Maintenance
 */
class TimeSeriesForecaster {
  private model: tf.LayersModel | null = null;

  /**
   * Build LSTM model for time series forecasting
   */
  buildModel(inputShape: [number, number]): tf.LayersModel {
    const model = tf.sequential();

    model.add(
      tf.layers.lstm({
        units: 128,
        returnSequences: true,
        inputShape,
      }),
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(
      tf.layers.lstm({
        units: 64,
        returnSequences: false,
      }),
    );

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(
      tf.layers.dense({
        units: 32,
        activation: "relu",
      }),
    );

    // Output: next N time steps
    model.add(
      tf.layers.dense({
        units: 7, // Predict 7 days ahead
        activation: "linear",
      }),
    );

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "meanSquaredError",
      metrics: ["mae"],
    });

    this.model = model;
    return model;
  }

  /**
   * Prepare data for time series forecasting
   */
  prepareData(
    data: number[][],
    lookback: number = 30,
    horizon: number = 7,
  ): { inputs: number[][][]; targets: number[][] } {
    const inputs: number[][][] = [];
    const targets: number[][] = [];

    for (let i = 0; i < data.length - lookback - horizon + 1; i++) {
      inputs.push(data.slice(i, i + lookback));
      targets.push(
        data.slice(i + lookback, i + lookback + horizon).map((row) => row[0]),
      ); // Predict first metric
    }

    return { inputs, targets };
  }

  /**
   * Train the forecasting model
   */
  async train(data: number[][]): Promise<tf.History> {
    const { inputs, targets } = this.prepareData(data);

    if (!this.model) {
      this.buildModel([30, data[0].length]);
    }

    const inputTensor = tf.tensor3d(inputs);
    const targetTensor = tf.tensor2d(targets);

    const history = await this.model!.fit(inputTensor, targetTensor, {
      epochs: 30,
      batchSize: 16,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `Forecasting Epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}`,
          );
        },
      },
    });

    inputTensor.dispose();
    targetTensor.dispose();

    return history;
  }

  /**
   * Make predictions for future time steps
   */
  predict(recentData: number[][]): number[] {
    const result = tf.tidy(() => {
      const input = tf.tensor3d([recentData]);
      const prediction = this.model!.predict(input) as tf.Tensor;
      return prediction.arraySync() as number[][];
    });
    return result[0];
  }
}

/**
 * Main Predictive Maintenance Service
 */
export class PredictiveMaintenanceService {
  private static instance: PredictiveMaintenanceService;
  private anomalyDetector: LSTMAutoencoder;
  private forecaster: TimeSeriesForecaster;
  private metricsBuffer: Map<string, number[][]> = new Map();
  private lastAnalysis: Map<string, Date> = new Map();
  private anomalyScores: Map<string, number> = new Map(); // Track anomaly scores in memory

  private constructor() {
    this.anomalyDetector = new LSTMAutoencoder();
    this.forecaster = new TimeSeriesForecaster();
  }

  static getInstance(): PredictiveMaintenanceService {
    if (!PredictiveMaintenanceService.instance) {
      PredictiveMaintenanceService.instance =
        new PredictiveMaintenanceService();
    }
    return PredictiveMaintenanceService.instance;
  }

  /**
   * Initialize models (load or train)
   */
  async initialize(): Promise<void> {
    try {
      // Try to load existing models
      await this.anomalyDetector.loadModel("./models/anomaly-detector");
      console.log("✓ Loaded existing predictive maintenance models");
    } catch (error) {
      console.log("Training new predictive maintenance models...");
      await this.trainModels();
    }
  }

  /**
   * Train models on historical data
   */
  async trainModels(): Promise<void> {
    // Fetch historical metrics for training
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const component of Object.values(MONITORED_COMPONENTS)) {
      // Check for metrics that have component prefix in metricName
      const metrics = await db
        .select()
        .from(systemMetrics)
        .where(
          and(
            sql`${systemMetrics.metricName} LIKE ${component + "_%"}`,
            gte(systemMetrics.timestamp, thirtyDaysAgo),
          ),
        )
        .orderBy(asc(systemMetrics.timestamp));

      if (metrics.length < MODEL_CONFIG.WINDOW_SIZE) {
        console.log(
          `Insufficient data for ${component}, generating synthetic data...`,
        );
        await this.generateSyntheticTrainingData(component);
      }
    }

    // Train anomaly detector on normal data
    const normalMetrics = await db
      .select()
      .from(systemMetrics)
      .where(gte(systemMetrics.timestamp, thirtyDaysAgo))
      .orderBy(asc(systemMetrics.timestamp));

    const trainingData = this.prepareTrainingData(normalMetrics);

    if (trainingData.length > 0) {
      await this.anomalyDetector.train(trainingData);
      await this.anomalyDetector.saveModel("./models/anomaly-detector");
    }

    // Train forecaster on all historical data
    const allData = this.prepareTimeSeriesData(normalMetrics);
    if (allData.length > 30) {
      await this.forecaster.train(allData);
    }

    console.log("✓ Predictive maintenance models trained");
  }

  /**
   * Generate synthetic training data for components without history
   */
  private async generateSyntheticTrainingData(
    component: string,
  ): Promise<void> {
    const now = new Date();
    const metrics: InsertSystemMetric[] = [];

    // Generate 30 days of synthetic metrics
    for (let day = 30; day >= 0; day--) {
      for (let hour = 0; hour < 24; hour += 4) {
        // Every 4 hours
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - day);
        timestamp.setHours(hour, 0, 0, 0);

        // Generate realistic patterns with some noise
        const baselineCpu = 30 + Math.sin((hour / 24) * 2 * Math.PI) * 10; // Daily pattern
        const baselineMemory = 50 + Math.sin((hour / 24) * 2 * Math.PI) * 5;
        const baselineLatency = 100 + Math.sin((hour / 24) * 2 * Math.PI) * 20;
        const baselineErrorRate = 0.01 + Math.random() * 0.005;

        // Use component prefix in metricName for grouping
        metrics.push({
          metricType: "resource",
          metricName: `${component}_${METRIC_NAMES.CPU_USAGE}`,
          value: baselineCpu + (Math.random() - 0.5) * 10,
          timestamp,
          unit: "percent",
        });

        metrics.push({
          metricType: "resource",
          metricName: `${component}_${METRIC_NAMES.MEMORY_USAGE}`,
          value: baselineMemory + (Math.random() - 0.5) * 5,
          timestamp,
          unit: "percent",
        });

        metrics.push({
          metricType: "latency",
          metricName: `${component}_${METRIC_NAMES.QUERY_TIME}`,
          value: baselineLatency + (Math.random() - 0.5) * 30,
          timestamp,
          unit: "ms",
        });

        metrics.push({
          metricType: "error_rate",
          metricName: `${component}_${METRIC_NAMES.ERROR_RATE}`,
          value: baselineErrorRate,
          timestamp,
          unit: "rate",
        });
      }
    }

    if (metrics.length > 0) {
      await db
        .insert(systemMetrics)
        .values(metrics as (typeof systemMetrics.$inferInsert)[]);
    }
  }

  /**
   * Prepare training data for anomaly detector
   */
  private prepareTrainingData(metrics: SystemMetric[]): number[][][] {
    const componentData = new Map<string, number[][]>();

    // Group by component (metricType) and prepare feature vectors
    for (const metric of metrics) {
      const key = metric.metricType;
      if (!componentData.has(key)) {
        componentData.set(key, []);
      }
    }

    const windows: number[][][] = [];
    componentData.forEach((data) => {
      if (data.length >= MODEL_CONFIG.WINDOW_SIZE) {
        windows.push(
          ...this.anomalyDetector.createWindows(data, MODEL_CONFIG.WINDOW_SIZE),
        );
      }
    });

    return windows;
  }

  /**
   * Prepare time series data for forecasting
   */
  private prepareTimeSeriesData(metrics: SystemMetric[]): number[][] {
    // Aggregate metrics by timestamp and component
    const timeSeriesMap = new Map<string, Map<string, number>>();

    for (const metric of metrics) {
      const timeKey = metric.timestamp.toISOString();
      if (!timeSeriesMap.has(timeKey)) {
        timeSeriesMap.set(timeKey, new Map());
      }
      timeSeriesMap
        .get(timeKey)!
        .set(`${metric.metricType}_${metric.metricName}`, metric.value);
    }

    // Convert to array format
    return Array.from(timeSeriesMap.values()).map((metricMap) =>
      Array.from(metricMap.values()),
    );
  }

  /**
   * Ingest new metrics and perform real-time analysis
   */
  async ingestMetric(
    metric: InsertSystemMetric,
  ): Promise<{ anomalyScore: number; isAnomaly: boolean }> {
    // Add to buffer using metricType as component key
    const key = metric.metricType;
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }

    const buffer = this.metricsBuffer.get(key)!;
    buffer.push([
      metric.value,
      0, // Would include other metrics in real implementation
      0,
      0,
    ]);

    // Keep only recent window
    if (buffer.length > MODEL_CONFIG.WINDOW_SIZE) {
      buffer.shift();
    }

    // Detect anomalies if we have enough data
    if (buffer.length === MODEL_CONFIG.WINDOW_SIZE) {
      const anomalies = this.anomalyDetector.detectAnomalies([buffer]);
      const result = anomalies[anomalies.length - 1];

      // Store anomaly score in memory map
      const [savedMetric] = await db
        .insert(systemMetrics)
        .values(metric as typeof systemMetrics.$inferInsert)
        .returning();

      this.anomalyScores.set(savedMetric.id, result.score);

      // Trigger prediction if anomaly detected
      if (result.isAnomaly && this.shouldAnalyzeComponent(key)) {
        await this.analyzeComponent(key);
      }

      return { anomalyScore: result.score, isAnomaly: result.isAnomaly };
    }

    // No anomaly detection yet (not enough data)
    await db
      .insert(systemMetrics)
      .values(metric as typeof systemMetrics.$inferInsert);
    return { anomalyScore: 0, isAnomaly: false };
  }

  /**
   * Get anomaly score for a metric
   */
  getAnomalyScore(metricId: string): number {
    return this.anomalyScores.get(metricId) || 0;
  }

  /**
   * Check if we should analyze a component (rate limiting)
   */
  private shouldAnalyzeComponent(component: string): boolean {
    const lastRun = this.lastAnalysis.get(component);
    if (!lastRun) return true;

    const hoursSinceLastRun =
      (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= 1; // Analyze at most once per hour
  }

  /**
   * Analyze a specific component for maintenance needs
   */
  async analyzeComponent(component: string): Promise<MaintenancePrediction[]> {
    this.lastAnalysis.set(component, new Date());

    // Fetch recent metrics that have this component prefix in metricName
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMetrics = await db
      .select()
      .from(systemMetrics)
      .where(
        and(
          sql`${systemMetrics.metricName} LIKE ${component + "_%"}`,
          gte(systemMetrics.timestamp, sevenDaysAgo),
        ),
      )
      .orderBy(asc(systemMetrics.timestamp));

    if (recentMetrics.length < 30) {
      console.log(`Insufficient data for ${component} analysis`);
      return [];
    }

    // Calculate trend and patterns
    const trend = this.calculateTrend(recentMetrics);
    const metricsWithScores = recentMetrics.map((m) => ({
      ...m,
      anomalyScore: this.getAnomalyScore(m.id),
    }));
    const anomalyCount = metricsWithScores.filter(
      (m) => (m.anomalyScore || 0) > 0.5,
    ).length;
    const avgAnomalyScore =
      metricsWithScores.reduce((sum, m) => sum + (m.anomalyScore || 0), 0) /
      metricsWithScores.length;

    // Forecast future values
    const timeSeriesData = this.prepareTimeSeriesData(recentMetrics);
    const forecast =
      timeSeriesData.length > 30
        ? this.forecaster.predict(timeSeriesData.slice(-30))
        : null;

    // Generate predictions based on analysis
    const predictions: InsertMaintenancePrediction[] = [];

    // Database-specific predictions
    if (component === MONITORED_COMPONENTS.DATABASE) {
      if (trend.queryTime > 0.2 && avgAnomalyScore > 0.3) {
        const riskLevel: "low" | "medium" | "high" | "critical" =
          avgAnomalyScore > 0.7 ? "high" : "medium";
        predictions.push({
          component,
          predictionType: "degradation" as const,
          confidence: Math.min(0.9, avgAnomalyScore + trend.queryTime),
          predictedDate: this.calculateMaintenanceDate(7),
          risk: riskLevel,
          recommendation: `Index fragmentation detected (trend: ${trend.queryTime.toFixed(3)}, anomalies: ${anomalyCount}). Actions: Analyze slow queries, rebuild fragmented indexes, update table statistics, vacuum and analyze tables. Estimated downtime: 30 min.`,
        });
      }

      if (trend.connectionCount > 0.3) {
        predictions.push({
          component,
          predictionType: "capacity" as const,
          confidence: Math.min(0.8, trend.connectionCount * 2),
          predictedDate: this.calculateMaintenanceDate(3),
          risk: "high" as const,
          recommendation: `Connection pool exhaustion risk (trend: ${trend.connectionCount.toFixed(3)}, anomalies: ${anomalyCount}). Actions: Increase connection pool size, identify long-running transactions, optimize connection lifecycle. Estimated downtime: 10 min.`,
        });
      }
    }

    // Server-specific predictions
    if (component === MONITORED_COMPONENTS.SERVER) {
      if (trend.memory > 0.15 && forecast && forecast[6] > 85) {
        predictions.push({
          component,
          predictionType: "failure" as const,
          confidence: Math.min(0.85, trend.memory * 3),
          predictedDate: this.calculateMaintenanceDate(5),
          risk: "high" as const,
          recommendation: `Memory leak detected (trend: ${trend.memory.toFixed(3)}, anomalies: ${anomalyCount}). Actions: Identify memory leak sources, restart application servers, update memory allocation settings. Estimated downtime: 15 min.`,
        });
      }
    }

    if (predictions.length === 0) {
      return [];
    }

    // Save predictions to database
    const savedPredictions = await db
      .insert(maintenancePredictions)
      .values(predictions)
      .returning();

    return savedPredictions;
  }

  /**
   * Calculate trend slopes for different metrics
   */
  private calculateTrend(metrics: SystemMetric[]): Record<string, number> {
    const trends: Record<string, number> = {
      queryTime: 0,
      memory: 0,
      cpu: 0,
      errorRate: 0,
      connectionCount: 0,
    };

    // Group by metric name and calculate linear regression slope
    const metricGroups = new Map<string, number[]>();

    for (const metric of metrics) {
      if (!metricGroups.has(metric.metricName)) {
        metricGroups.set(metric.metricName, []);
      }
      metricGroups.get(metric.metricName)!.push(metric.value);
    }

    metricGroups.forEach((values, metricName) => {
      if (values.length < 2) return;

      // Simple linear regression
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      // Map metric name to trend key (check if metricName includes the metric suffix)
      if (metricName.includes(METRIC_NAMES.QUERY_TIME))
        trends.queryTime = slope;
      if (metricName.includes(METRIC_NAMES.MEMORY_USAGE)) trends.memory = slope;
      if (metricName.includes(METRIC_NAMES.CPU_USAGE)) trends.cpu = slope;
      if (metricName.includes(METRIC_NAMES.ERROR_RATE))
        trends.errorRate = slope;
      if (metricName.includes(METRIC_NAMES.CONNECTION_COUNT))
        trends.connectionCount = slope;
    });

    return trends;
  }

  /**
   * Calculate optimal maintenance date (prefer low-traffic periods)
   */
  private calculateMaintenanceDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);

    // Set to early morning (3 AM) on the calculated date
    date.setHours(3, 0, 0, 0);

    // If it's a weekday, move to next weekend
    const dayOfWeek = date.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      date.setDate(date.getDate() + (6 - dayOfWeek)); // Move to Saturday
    }

    return date;
  }

  /**
   * Get predicted maintenance schedule
   */
  async getMaintenanceSchedule(): Promise<MaintenancePrediction[]> {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return await db
      .select()
      .from(maintenancePredictions)
      .where(
        and(
          eq(maintenancePredictions.isAddressed, false),
          lte(maintenancePredictions.predictedDate, thirtyDaysFromNow),
        ),
      )
      .orderBy(asc(maintenancePredictions.predictedDate));
  }

  /**
   * Calculate system health score (0-100)
   */
  async calculateSystemHealth(): Promise<{
    score: number;
    components: Record<string, number>;
    issues: number;
    recommendations: string[];
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Get recent metrics
    const recentMetrics = await db
      .select()
      .from(systemMetrics)
      .where(gte(systemMetrics.timestamp, oneDayAgo));

    // Get active predictions
    const activePredictions = await db
      .select()
      .from(maintenancePredictions)
      .where(eq(maintenancePredictions.isAddressed, false));

    // Calculate component health scores
    const componentScores: Record<string, number> = {};

    for (const component of Object.values(MONITORED_COMPONENTS)) {
      const componentMetrics = recentMetrics.filter(
        (m) => m.metricType === component,
      );
      const metricsWithScores = componentMetrics.map((m) => ({
        ...m,
        anomalyScore: this.getAnomalyScore(m.id),
      }));
      const avgAnomalyScore =
        metricsWithScores.length > 0
          ? metricsWithScores.reduce(
              (sum, m) => sum + (m.anomalyScore || 0),
              0,
            ) / metricsWithScores.length
          : 0;

      const componentPredictions = activePredictions.filter(
        (p) => p.component === component,
      );
      const maxConfidence =
        componentPredictions.length > 0
          ? Math.max(...componentPredictions.map((p) => p.confidence))
          : 0;

      // Health score: 100 - (anomaly impact + prediction impact)
      componentScores[component] = Math.max(
        0,
        100 - (avgAnomalyScore * 50 + maxConfidence * 50),
      );
    }

    // Overall system health (weighted average)
    const overallScore =
      Object.values(componentScores).reduce((sum, score) => sum + score, 0) /
      Object.values(componentScores).length;

    // Generate recommendations
    const recommendations: string[] = [];

    if (componentScores[MONITORED_COMPONENTS.DATABASE] < 70) {
      recommendations.push(
        "Database performance is degrading. Consider index optimization.",
      );
    }

    if (componentScores[MONITORED_COMPONENTS.SERVER] < 70) {
      recommendations.push(
        "Server resources are strained. Review memory allocation.",
      );
    }

    const criticalPredictions = activePredictions.filter(
      (p) => p.risk === "critical",
    );
    if (criticalPredictions.length > 0) {
      recommendations.push(
        "Critical maintenance required. Review urgent predictions.",
      );
    }

    return {
      score: Math.round(overallScore),
      components: componentScores,
      issues: activePredictions.length,
      recommendations,
    };
  }
}

// Export singleton instance
export const predictiveMaintenanceService =
  PredictiveMaintenanceService.getInstance();
