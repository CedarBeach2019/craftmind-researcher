/**
 * Statistical analysis utilities for experiment results.
 * Zero dependencies — pure math.
 * @module craftmind-researcher/statistics
 */

/**
 * Compute mean of numeric array.
 * @param {number[]} values
 * @returns {number}
 */
export function mean(values) {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Compute sample standard deviation.
 * @param {number[]} values
 * @returns {number}
 */
export function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute standard error of the mean.
 * @param {number[]} values
 * @returns {number}
 */
export function standardError(values) {
  if (values.length < 2) return NaN;
  return stdDev(values) / Math.sqrt(values.length);
}

/**
 * Compute 95% confidence interval for the mean.
 * Uses t-distribution approximation for small samples.
 * @param {number[]} values
 * @returns {{ lower: number, upper: number, marginOfError: number }}
 */
export function confidenceInterval(values, confidence = 0.95) {
  if (values.length < 2) return { lower: NaN, upper: NaN, marginOfError: NaN };
  const m = mean(values);
  const se = standardError(values);
  // t-critical values for common confidence levels (two-tailed)
  const tCritical = tScore(values.length - 1, confidence);
  const marginOfError = se * tCritical;
  return { lower: m - marginOfError, upper: m + marginOfError, marginOfError };
}

/**
 * Approximate t-critical value using the inverse of the incomplete beta function.
 * For practical purposes, we use a lookup table for common df/alpha combinations
 * and interpolate for values in between.
 * @param {number} df - Degrees of freedom
 * @param {number} confidence - Confidence level (0.95 = alpha 0.05 two-tailed)
 * @returns {number}
 */
export function tScore(df, confidence = 0.95) {
  const alpha = 1 - confidence;
  // Common t-critical values: { df: [alpha=0.1, 0.05, 0.01] }
  const table = {
    1:  [6.314, 12.706, 63.657],
    2:  [2.920, 4.303, 9.925],
    3:  [2.353, 3.182, 5.841],
    4:  [2.132, 2.776, 4.604],
    5:  [2.015, 2.571, 4.032],
    6:  [1.943, 2.447, 3.707],
    7:  [1.895, 2.365, 3.499],
    8:  [1.860, 2.306, 3.355],
    9:  [1.833, 2.262, 3.250],
    10: [1.812, 2.228, 3.169],
    15: [1.753, 2.131, 2.947],
    20: [1.725, 2.086, 2.845],
    30: [1.697, 2.042, 2.750],
    60: [1.671, 2.000, 2.660],
    120:[1.658, 1.980, 2.617],
    Infinity: [1.645, 1.960, 2.576],
  };

  let col;
  if (alpha <= 0.01) col = 2;
  else if (alpha <= 0.05) col = 1;
  else col = 0;

  const dfs = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Exact match or beyond table
  if (table[df]) return table[df][col];
  if (df > dfs[dfs.length - 1]) return table[Infinity][col];

  // Interpolate between nearest table entries
  let lower = dfs[0], upper = dfs[dfs.length - 1];
  for (let i = 0; i < dfs.length - 1; i++) {
    if (df >= dfs[i] && df <= dfs[i + 1]) {
      lower = dfs[i];
      upper = dfs[i + 1];
      break;
    }
  }
  const t = (df - lower) / (upper - lower);
  return table[lower][col] * (1 - t) + table[upper][col] * t;
}

/**
 * Welch's t-test (unequal variances) for comparing two sample means.
 * @param {number[]} a - Sample 1
 * @param {number[]} b - Sample 2
 * @returns {{ tStatistic: number, pValue: number, significant: boolean, df: number }}
 */
export function tTest(a, b) {
  if (a.length < 2 || b.length < 2) {
    return { tStatistic: NaN, pValue: NaN, significant: false, df: 0 };
  }

  const n1 = a.length, n2 = b.length;
  const m1 = mean(a), m2 = mean(b);
  const v1 = stdDev(a) ** 2, v2 = stdDev(b) ** 2;

  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return { tStatistic: 0, pValue: 1, significant: false, df: 0 };

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));

  // Approximate p-value using t-distribution CDF approximation
  const pValue = 2 * tCDF(-Math.abs(t), df);

  return {
    tStatistic: t,
    pValue,
    significant: pValue < 0.05,
    df,
  };
}

/**
 * Two-proportion z-test for comparing success rates.
 * @param {number} successes1 - Successes in group 1
 * @param {number} trials1 - Total trials in group 1
 * @param {number} successes2 - Successes in group 2
 * @param {number} trials2 - Total trials in group 2
 * @returns {{ zStatistic: number, pValue: number, significant: boolean }}
 */
export function proportionTest(successes1, trials1, successes2, trials2) {
  const p1 = successes1 / trials1;
  const p2 = successes2 / trials2;
  const pPooled = (successes1 + successes2) / (trials1 + trials2);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / trials1 + 1 / trials2));
  if (se === 0) return { zStatistic: 0, pValue: 1, significant: false };

  const z = (p1 - p2) / se;
  // Two-tailed p-value from standard normal
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return { zStatistic: z, pValue, significant: pValue < 0.05 };
}

/**
 * Compute effect size (Cohen's d) for two samples.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Cohen's d
 */
export function cohensD(a, b) {
  const m1 = mean(a), m2 = mean(b);
  const s1 = stdDev(a), s2 = stdDev(b);
  const pooled = Math.sqrt((s1 ** 2 * (a.length - 1) + s2 ** 2 * (b.length - 1)) / (a.length + b.length - 2));
  if (pooled === 0) return 0;
  return (m1 - m2) / pooled;
}

/**
 * Evaluate whether sample size is adequate.
 * @param {number} n - Actual sample size
 * @param {string} [rigor='moderate'] - 'quick', 'moderate', or 'high'
 * @returns {{ adequate: boolean, minimum: number, recommendation: string }}
 */
export function evaluateSampleSize(n, rigor = 'moderate') {
  const minimums = { quick: 5, moderate: 10, high: 20 };
  const min = minimums[rigor] || 10;
  return {
    adequate: n >= min,
    minimum: min,
    recommendation: n < min
      ? `Sample size ${n} is below recommended minimum of ${min} for ${rigor} rigor. Results may be unreliable.`
      : `Sample size ${n} meets ${rigor} rigor threshold.`,
  };
}

/**
 * Detect outliers using IQR method.
 * @param {number[]} values
 * @param {number} [k=1.5] - IQR multiplier (1.5 = mild, 3.0 = extreme)
 * @returns {{ outliers: number[], clean: number[], iqr: number, q1: number, q3: number }}
 */
export function detectOutliers(values, k = 1.5) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - k * iqr;
  const upper = q3 + k * iqr;
  const outliers = sorted.filter(v => v < lower || v > upper);
  const clean = sorted.filter(v => v >= lower && v <= upper);
  return { outliers, clean, iqr, q1, q3 };
}

// ─── Internal helpers ────────────────────────────────────────

/** Approximate standard normal CDF using error function approximation. */
function normalCDF(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

/**
 * Approximate t-distribution CDF using a regularized incomplete beta function approximation.
 * This is a simplified version — accurate enough for p-value estimation.
 */
function tCDF(t, df) {
  // Use normal approximation for large df
  if (df > 30) return normalCDF(t);
  // For small df, use the approximation: t_cdf ≈ normal_cdf * correction
  // This is not exact but good enough for determining significance
  const x = df / (df + t * t);
  const p = incompleteBeta(df / 2, 0.5, x) / 2;
  return t >= 0 ? 1 - p : p;
}

/** Regularized incomplete beta function I_x(a, b) — simplified approximation. */
function incompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Simple continued fraction approximation
  if (x < (a + 1) / (a + b + 2)) {
    return Math.exp(logBeta(a, b)) * Math.pow(x, a) * Math.pow(1 - x, b) * betaCF(a, b, x) / a;
  }
  return 1 - incompleteBeta(b, a, 1 - x);
}

/** Log of Beta function. */
function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/** Log of Gamma function (Stirling's approximation + Lanczos). */
function logGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Continued fraction for incomplete beta. */
function betaCF(a, b, x) {
  const maxIter = 100;
  const eps = 1e-10;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    let m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    let delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < eps) break;
  }
  return h;
}
