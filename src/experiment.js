import { randomUUID } from 'node:crypto';
import { mean, stdDev, confidenceInterval, tTest, proportionTest, cohensD, evaluateSampleSize, detectOutliers } from './statistics.js';

/**
 * Experiment framework with statistical rigor.
 * Supports A/B testing, confidence intervals, t-tests, falsification criteria, and full reproducibility context.
 */
export class Experiment {
  /**
   * @param {object} opts
   * @param {string} opts.hypothesis - The hypothesis to test.
   * @param {string} opts.domain - Domain (mining, farming, etc.)
   * @param {object[]} [opts.variables] - Independent variables with values.
   * @param {object} [opts.controls] - Control variables.
   * @param {number} [opts.sampleSize] - Number of trials per condition.
   * @param {string} [opts.type] - 'simple' or 'ab_test'.
   * @param {string} [opts.falsificationCriterion] - What would disprove the hypothesis.
   * @param {object} [opts.reproducibilityContext] - { worldSeed, biome, coordinates, weather, timeOfDay, gameVersion }
   * @param {string} [opts.minimumRigor='moderate'] - 'quick', 'moderate', 'high'
   */
  constructor({
    hypothesis, domain, variables = [], controls = {}, sampleSize = 10,
    type = 'simple', falsificationCriterion = null, reproducibilityContext = {},
    minimumRigor = 'moderate',
  }) {
    this.id = `exp-${randomUUID().slice(0, 8)}`;
    this.hypothesis = hypothesis;
    this.domain = domain;
    this.variables = variables;
    this.controls = controls;
    this.sampleSize = Math.max(3, sampleSize); // Enforce minimum
    this.minimumRigor = minimumRigor;
    this.type = type;
    this.conditions = type === 'ab_test' ? this._generateConditions() : [{ label: 'test', variables: {} }];
    this.results = [];
    this.setupLog = [];
    this.observationLog = [];
    this.conclusion = null;
    this.status = 'draft';
    this.startedAt = null;
    this.completedAt = null;

    // Scientific rigor
    this.falsificationCriterion = falsificationCriterion || this._defaultFalsification();
    this.reproducibilityContext = {
      gameVersion: 'unknown',
      worldSeed: null,
      coordinates: null,
      biome: null,
      weather: null,
      timeOfDay: null,
      difficulty: null,
      ...reproducibilityContext,
    };

    // Failure tracking
    this.failures = [];
  }

  /** Generate A/B test conditions from variable combinations. */
  _generateConditions() {
    const combos = [{}];
    for (const v of this.variables) {
      const newCombos = [];
      for (const combo of combos) {
        for (const val of v.values) {
          newCombos.push({ ...combo, [v.name]: val });
        }
      }
      combos.length = 0;
      combos.push(...newCombos);
    }
    return combos.map((vars, i) => ({ label: `condition_${i}`, variables: vars }));
  }

  _defaultFalsification() {
    if (this.type === 'ab_test') {
      return 'Hypothesis refuted if no statistically significant difference between conditions (p >= 0.05).';
    }
    return 'Hypothesis refuted if the expected effect is not observed across trials.';
  }

  start() {
    this.status = 'running';
    this.startedAt = new Date().toISOString();
  }

  logSetup(step) {
    this.setupLog.push({ timestamp: Date.now(), step });
  }

  recordObservation(conditionLabel, observation) {
    this.observationLog.push({ timestamp: Date.now(), condition: conditionLabel, ...observation });
  }

  recordResult(conditionLabel, result) {
    this.results.push({ condition: conditionLabel, ...result, timestamp: Date.now() });
  }

  /**
   * Log a failure (bot died, TNT exploded, wrong dimension, etc.).
   * @param {string} reason
   * @param {string[]} lessons - What was learned from this failure
   */
  logFailure(reason, lessons = []) {
    this.failures.push({ reason, lessons, timestamp: Date.now() });
  }

  /**
   * Check whether the experiment has collected enough data.
   * @returns {{ sufficient: boolean, byCondition: object }}
   */
  checkDataSufficiency() {
    const byCondition = {};
    let sufficient = true;
    for (const cond of this.conditions) {
      const count = this.results.filter(r => r.condition === cond.label).length;
      const eval_ = evaluateSampleSize(count, this.minimumRigor);
      byCondition[cond.label] = { count, ...eval_ };
      if (!eval_.adequate) sufficient = false;
    }
    return { sufficient, byCondition };
  }

  /**
   * Compute enhanced summary statistics per condition with confidence intervals.
   * @returns {object}
   */
  getSummary() {
    const summary = {};
    for (const cond of this.conditions) {
      const trials = this.results.filter(r => r.condition === cond.label);
      if (trials.length === 0) { summary[cond.label] = { count: 0 }; continue; }

      const metrics = {};
      for (const t of trials) {
        if (t.metrics) {
          for (const [k, v] of Object.entries(t.metrics)) {
            if (typeof v === 'number') {
              if (!metrics[k]) metrics[k] = [];
              metrics[k].push(v);
            }
          }
        }
      }

      const computed = {};
      for (const [k, vals] of Object.entries(metrics)) {
        const outliers = detectOutliers(vals);
        computed[k] = {
          avg: mean(vals),
          stdDev: stdDev(vals),
          min: Math.min(...vals),
          max: Math.max(...vals),
          count: vals.length,
          confidenceInterval95: confidenceInterval(vals),
          outliers: outliers.outliers,
          outlierCount: outliers.outliers.length,
        };
      }

      summary[cond.label] = {
        count: trials.length,
        successRate: trials.length > 0 ? trials.filter(t => t.success).length / trials.length : 0,
        metrics: computed,
      };
    }
    return summary;
  }

  /**
   * Run statistical tests comparing conditions.
   * Only meaningful for A/B tests with 2+ conditions.
   * @returns {{ tTest: object|null, proportionTest: object|null, effectSize: number|null, pairwise: object[] }}
   */
  analyze() {
    const summary = this.getSummary();
    const conditions = this.conditions;

    if (conditions.length < 2) {
      // Simple experiment — just return descriptive stats
      const cond = conditions[0];
      const data = summary[cond?.label];
      return { tTest: null, proportionTest: null, effectSize: null, pairwise: [], descriptive: data };
    }

    // Collect data from all conditions (use first numeric metric)
    const conditionData = {};
    for (const cond of conditions) {
      const s = summary[cond.label];
      if (!s?.metrics) continue;
      const firstMetric = Object.keys(s.metrics)[0];
      if (!firstMetric) continue;
      conditionData[cond.label] = s.metrics[firstMetric];
    }

    const labels = Object.keys(conditionData);

    // Pairwise comparisons
    const pairwise = [];
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        // We need raw values — extract from results
        const aVals = this._getMetricValues(labels[i], Object.keys(conditionData[labels[i]] || {})[0] || null);
        const bVals = this._getMetricValues(labels[j], Object.keys(conditionData[labels[j]] || {})[0] || null);

        if (aVals.length >= 2 && bVals.length >= 2) {
          const tt = tTest(aVals, bVals);
          const d = cohensD(aVals, bVals);
          pairwise.push({
            groupA: labels[i],
            groupB: labels[j],
            tTest: tt,
            effectSize: d,
            meanA: mean(aVals),
            meanB: mean(bVals),
          });
        }
      }
    }

    // Overall t-test (first two conditions if available)
    let tTestResult = null;
    let propTestResult = null;
    let overallEffect = null;

    if (labels.length >= 2) {
      const aVals = this._getMetricValues(labels[0], null);
      const bVals = this._getMetricValues(labels[1], null);
      if (aVals.length >= 2 && bVals.length >= 2) {
        tTestResult = tTest(aVals, bVals);
        overallEffect = cohensD(aVals, bVals);
      }

      // Proportion test if binary outcomes
      const sA = summary[labels[0]];
      const sB = summary[labels[1]];
      if (sA && sB && sA.count >= 5 && sB.count >= 5) {
        const succA = Math.round(sA.successRate * sA.count);
        const succB = Math.round(sB.successRate * sB.count);
        propTestResult = proportionTest(succA, sA.count, succB, sB.count);
      }
    }

    return { tTest: tTestResult, proportionTest: propTestResult, effectSize: overallEffect, pairwise };
  }

  /**
   * Check falsification: does the evidence support or refute the hypothesis?
   * @returns {{ supported: boolean|null, reason: string, evidence: string }}
   */
  checkFalsification() {
    if (this.status !== 'completed') {
      return { supported: null, reason: 'Experiment not completed', evidence: '' };
    }

    const analysis = this.analyze();
    const summary = this.getSummary();

    // If we have t-test results
    if (analysis.tTest) {
      if (analysis.tTest.significant) {
        return {
          supported: this.conclusion?.hypothesisSupported ?? true,
          reason: `Statistically significant difference detected (p=${analysis.tTest.pValue.toFixed(4)})`,
          evidence: `t(${analysis.tTest.df.toFixed(1)}) = ${analysis.tTest.tStatistic.toFixed(3)}`,
        };
      }
      return {
        supported: false,
        reason: `No statistically significant difference (p=${analysis.tTest.pValue.toFixed(4)}). Hypothesis REFUTED per falsification criterion.`,
        evidence: `Effect size d=${(analysis.effectSize || 0).toFixed(3)} — too small to detect with current sample size`,
      };
    }

    // For simple experiments, rely on conclusion
    return {
      supported: this.conclusion?.hypothesisSupported ?? null,
      reason: this.conclusion?.text || 'No conclusion reached',
      evidence: JSON.stringify(summary).slice(0, 200),
    };
  }

  conclude(conclusion, hypothesisSupported) {
    this.status = 'completed';
    this.completedAt = new Date().toISOString();
    this.conclusion = { text: conclusion, hypothesisSupported };
  }

  fail(reason) {
    this.status = 'failed';
    this.conclusion = { text: reason, hypothesisSupported: null };
    this.completedAt = new Date().toISOString();
  }

  /**
   * Get the full reproducibility context.
   * @returns {object}
   */
  getReproducibilityContext() {
    return {
      experimentId: this.id,
      hypothesis: this.hypothesis,
      domain: this.domain,
      ...this.reproducibilityContext,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      setupLog: this.setupLog.map(s => s.step),
      controls: this.controls,
      sampleSize: this.sampleSize,
    };
  }

  /** Helper: extract metric values for a condition */
  _getMetricValues(conditionLabel, metricName) {
    const trials = this.results.filter(r => r.condition === conditionLabel);
    if (!metricName && trials.length > 0 && trials[0].metrics) {
      metricName = Object.keys(trials[0].metrics).find(k => typeof trials[0].metrics[k] === 'number') || null;
    }
    if (!metricName) return [];
    return trials.map(t => t.metrics?.[metricName]).filter(v => typeof v === 'number');
  }

  toJSON() {
    return {
      id: this.id,
      hypothesis: this.hypothesis,
      domain: this.domain,
      type: this.type,
      variables: this.variables,
      controls: this.controls,
      sampleSize: this.sampleSize,
      minimumRigor: this.minimumRigor,
      conditions: this.conditions,
      results: this.results,
      setupLog: this.setupLog,
      observationLog: this.observationLog,
      conclusion: this.conclusion,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      falsificationCriterion: this.falsificationCriterion,
      reproducibilityContext: this.reproducibilityContext,
      failures: this.failures,
    };
  }
}
