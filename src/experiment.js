import { randomUUID } from 'node:crypto';

/**
 * Experiment framework: hypothesis → setup → execution → observation → conclusion.
 * Supports A/B testing with variables, controls, and sample sizes.
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
   */
  constructor({ hypothesis, domain, variables = [], controls = {}, sampleSize = 5, type = 'simple' }) {
    this.id = `exp-${randomUUID().slice(0, 8)}`;
    this.hypothesis = hypothesis;
    this.domain = domain;
    this.variables = variables; // [{name, values: [v1, v2]}]
    this.controls = controls;
    this.sampleSize = sampleSize;
    this.type = type; // 'simple' | 'ab_test'
    this.conditions = type === 'ab_test' ? this._generateConditions() : [{ label: 'test', variables: {} }];
    this.results = [];
    this.setupLog = [];
    this.observationLog = [];
    this.conclusion = null;
    this.status = 'draft'; // draft | running | completed | failed
    this.startedAt = null;
    this.completedAt = null;
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

  /** Mark experiment as started. */
  start() {
    this.status = 'running';
    this.startedAt = new Date().toISOString();
  }

  /**
   * Log a setup step.
   * @param {string} step
   */
  logSetup(step) {
    this.setupLog.push({ timestamp: Date.now(), step });
  }

  /**
   * Record an observation for a condition.
   * @param {string} conditionLabel
   * @param {object} observation - { metric, value, notes }
   */
  recordObservation(conditionLabel, observation) {
    this.observationLog.push({
      timestamp: Date.now(),
      condition: conditionLabel,
      ...observation,
    });
  }

  /**
   * Record a trial result.
   * @param {string} conditionLabel
   * @param {object} result - { metrics: {name: value}, duration, success, notes }
   */
  recordResult(conditionLabel, result) {
    this.results.push({ condition: conditionLabel, ...result, timestamp: Date.now() });
  }

  /**
   * Compute summary statistics per condition.
   * @returns {object} { conditionLabel: { avg, min, max, count, successRate } }
   */
  getSummary() {
    const summary = {};
    for (const cond of this.conditions) {
      const trials = this.results.filter(r => r.condition === cond.label);
      if (trials.length === 0) { summary[cond.label] = { count: 0 }; continue; }
      // Assume first numeric metric
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
        computed[k] = { avg: vals.reduce((a, b) => a + b, 0) / vals.length, min: Math.min(...vals), max: Math.max(...vals), count: vals.length };
      }
      summary[cond.label] = {
        count: trials.length,
        successRate: trials.filter(t => t.success).length / trials.length,
        metrics: computed,
      };
    }
    return summary;
  }

  /**
   * Finalize the experiment with a conclusion.
   * @param {string} conclusion
   * @param {boolean} hypothesisSupported
   */
  conclude(conclusion, hypothesisSupported) {
    this.status = 'completed';
    this.completedAt = new Date().toISOString();
    this.conclusion = { text: conclusion, hypothesisSupported };
  }

  /** Mark as failed. */
  fail(reason) {
    this.status = 'failed';
    this.conclusion = { text: reason, hypothesisSupported: null };
    this.completedAt = new Date().toISOString();
  }

  /** Serialize to JSON-safe object. */
  toJSON() {
    return {
      id: this.id,
      hypothesis: this.hypothesis,
      domain: this.domain,
      type: this.type,
      variables: this.variables,
      controls: this.controls,
      sampleSize: this.sampleSize,
      conditions: this.conditions,
      results: this.results,
      setupLog: this.setupLog,
      observationLog: this.observationLog,
      conclusion: this.conclusion,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}
