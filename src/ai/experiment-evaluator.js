/**
 * @module craftmind-researcher/ai/experiment-evaluator
 * @description Comparative evaluation for experimental designs — which designs work best.
 * Inspired by fishing comparative-evaluator.js but adapted for research methodology.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * @typedef {object} ExperimentEvaluationResult
 * @property {number} designScore - 0-1 experimental design quality
 * @property {number} outcomeAccuracy - how well predictions matched results
 * @property {string} bestDesignType - most effective design historically
 * @property {object} designRanking - { designType: { avgScore, uses, successRate } }
 * @property {string[]} insights - extracted research rules
 */

export class ExperimentEvaluator {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.sessionsDir = join(dataDir, 'experiment-sessions');
    this._ensureDir(this.sessionsDir);
  }

  _ensureDir(dir) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /**
   * Score an experiment's design quality on 0-1 scale.
   */
  scoreDesign(experiment) {
    let score = 0;

    // Sample size adequacy (0.25)
    const n = experiment.sampleSize || 0;
    score += Math.min(0.25, n / 40 * 0.25);

    // Control variables specified (0.15)
    const controls = experiment.controls || {};
    const controlCount = Object.keys(controls).length;
    score += Math.min(0.15, controlCount * 0.05);

    // Has falsification criterion (0.15)
    if (experiment.falsificationCriterion) score += 0.15;

    // Reproducibility context (0.15)
    const repro = experiment.reproducibilityContext || {};
    const reproFields = Object.keys(repro).length;
    score += Math.min(0.15, reproFields * 0.03);

    // Multiple conditions (A/B test bonus) (0.1)
    if ((experiment.conditions?.length || 0) >= 2) score += 0.1;

    // Pre-registered hypothesis (0.1)
    if (experiment.hypothesis) score += 0.1;

    // Has predicted outcome (0.1)
    if (experiment.predictedOutcome) score += 0.1;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Score how accurate the predictions were vs actual results.
   * @param {string} predictedOutcome
   * @param {object} results - { supported: boolean, effectSize: number }
   * @returns {number} 0-1
   */
  scorePredictionAccuracy(predictedOutcome, results) {
    if (!predictedOutcome) return 0.3; // no prediction = low score
    if (results.supported) return 0.8 + (results.effectSize || 0) * 0.2;
    return 0.2; // predicted wrong direction
  }

  /**
   * Evaluate an experiment against historical designs.
   */
  evaluate(experiment, history = []) {
    const designScore = this.scoreDesign(experiment);
    const predictionAccuracy = experiment.predictedOutcome && experiment.results
      ? this.scorePredictionAccuracy(experiment.predictedOutcome, experiment.results)
      : 0.5;

    const combinedScore = designScore * 0.6 + predictionAccuracy * 0.4;

    // Rank design types
    const designStats = {};
    const allExperiments = [...history, experiment];

    for (const exp of allExperiments) {
      const type = exp.type || exp.designType || 'simple';
      if (!designStats[type]) designStats[type] = { scores: [], uses: 0, successes: 0 };
      const score = this.scoreDesign(exp);
      designStats[type].scores.push(score);
      designStats[type].uses++;
      if (exp.conclusion?.hypothesisSupported) designStats[type].successes++;
    }

    const designRanking = {};
    let bestDesignType = experiment.type || 'simple';
    let bestAvg = 0;

    for (const [type, stats] of Object.entries(designStats)) {
      const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      const successRate = stats.successes / stats.uses;
      designRanking[type] = { avgScore: avg, uses: stats.uses, successRate };
      if (avg > bestAvg) { bestAvg = avg; bestDesignType = type; }
    }

    const insights = this._generateInsights(allExperiments, designStats);

    return {
      designScore,
      outcomeAccuracy: predictionAccuracy,
      combinedScore,
      bestDesignType,
      designRanking,
      insights,
    };
  }

  _generateInsights(experiments, designStats) {
    const insights = [];
    if (experiments.length < 3) return insights;

    // Compare design types
    const sorted = Object.entries(designStats)
      .filter(([, s]) => s.uses >= 2)
      .sort((a, b) => b[1].avgScore - a[1].avgScore);

    if (sorted.length >= 2) {
      const [best, worst] = [sorted[0], sorted[sorted.length - 1]];
      insights.push(`Best design type: ${best[0]} (avg ${(best[1].avgScore * 100).toFixed(0)}% quality)`);
    }

    // Sample size correlation
    const withSamples = experiments.filter(e => e.sampleSize);
    if (withSamples.length >= 5) {
      const highN = withSamples.filter(e => e.sampleSize >= 20);
      const lowN = withSamples.filter(e => e.sampleSize < 20);
      if (highN.length > 0 && lowN.length > 0) {
        const highAvg = highN.reduce((sum, e) => sum + this.scoreDesign(e), 0) / highN.length;
        const lowAvg = lowN.reduce((sum, e) => sum + this.scoreDesign(e), 0) / lowN.length;
        if (highAvg > lowAvg * 1.2) {
          insights.push(`Experiments with n≥20 score ${(highAvg / lowAvg * 100).toFixed(0)}% higher than n<20`);
        }
      }
    }

    // Domain patterns
    const byDomain = {};
    for (const exp of experiments) {
      const d = exp.domain || 'unknown';
      if (!byDomain[d]) byDomain[d] = [];
      byDomain[d].push(this.scoreDesign(exp));
    }
    for (const [domain, scores] of Object.entries(byDomain)) {
      if (scores.length >= 3) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg > 0.7) insights.push(`${domain} experiments tend to be well-designed (avg ${(avg * 100).toFixed(0)}%)`);
      }
    }

    return insights.slice(0, 8);
  }

  saveSession(experimentId, evaluation) {
    const filePath = join(this.sessionsDir, `${experimentId}.json`);
    writeFileSync(filePath, JSON.stringify({ experimentId, ...evaluation, evaluatedAt: new Date().toISOString() }, null, 2));
  }

  loadAllSessions() {
    if (!existsSync(this.sessionsDir)) return [];
    return readdirSync(this.sessionsDir)
      .filter(f => f.endsWith('.json'))
      .flatMap(f => {
        try { return [JSON.parse(readFileSync(join(this.sessionsDir, f), 'utf-8'))]; }
        catch { return []; }
      });
  }
}

export default ExperimentEvaluator;
