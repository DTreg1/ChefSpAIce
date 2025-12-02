/**
 * Vector Math Utilities
 *
 * Shared mathematical operations for vector calculations.
 * Used primarily for embedding-based similarity calculations.
 */

/**
 * Calculate cosine similarity between two vectors
 *
 * Measures the cosine of the angle between two vectors, returning a value between -1 and 1.
 * Values closer to 1 indicate high similarity, 0 indicates orthogonality, -1 indicates opposition.
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity score between -1 and 1
 * @throws Error if vectors have different dimensions
 *
 * @example
 * const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]); // 1.0 (identical)
 * const similarity = cosineSimilarity([1, 0, 0], [0, 1, 0]); // 0.0 (orthogonal)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate dot product of two vectors
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Dot product value
 * @throws Error if vectors have different dimensions
 */
export function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let result = 0;
  for (let i = 0; i < vecA.length; i++) {
    result += vecA[i] * vecB[i];
  }
  return result;
}

/**
 * Calculate the Euclidean (L2) norm of a vector
 *
 * @param vec - Input vector
 * @returns Euclidean norm (magnitude) of the vector
 */
export function euclideanNorm(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 *
 * @param vec - Input vector
 * @returns Normalized vector with unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const norm = euclideanNorm(vec);
  if (norm === 0) {
    return vec.map(() => 0);
  }
  return vec.map((v) => v / norm);
}

/**
 * Calculate Euclidean distance between two vectors
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Euclidean distance
 * @throws Error if vectors have different dimensions
 */
export function euclideanDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Add two vectors element-wise
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Sum vector
 * @throws Error if vectors have different dimensions
 */
export function addVectors(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }
  return vecA.map((v, i) => v + vecB[i]);
}

/**
 * Subtract two vectors element-wise (vecA - vecB)
 *
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Difference vector
 * @throws Error if vectors have different dimensions
 */
export function subtractVectors(vecA: number[], vecB: number[]): number[] {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }
  return vecA.map((v, i) => v - vecB[i]);
}

/**
 * Multiply a vector by a scalar
 *
 * @param vec - Input vector
 * @param scalar - Scalar multiplier
 * @returns Scaled vector
 */
export function scaleVector(vec: number[], scalar: number): number[] {
  return vec.map((v) => v * scalar);
}

/**
 * Calculate the mean (average) of multiple vectors
 *
 * @param vectors - Array of vectors to average
 * @returns Mean vector
 * @throws Error if no vectors provided or vectors have different dimensions
 */
export function meanVector(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    throw new Error("Cannot calculate mean of empty vector array");
  }

  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);

  for (const vec of vectors) {
    if (vec.length !== dim) {
      throw new Error("All vectors must have the same dimensions");
    }
    for (let i = 0; i < dim; i++) {
      result[i] += vec[i];
    }
  }

  return result.map((v) => v / vectors.length);
}
