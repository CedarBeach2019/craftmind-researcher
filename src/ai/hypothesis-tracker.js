/**
 * @module craftmind-researcher/ai/hypothesis-tracker
 * @description Track predictions vs outcomes for all hypotheses, building a dataset
 * of which researchers have the best predictive accuracy and which domains are most predictable.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * @typedef {object} HypothesisRecord
 * @property {string} id
 * @property {string} hypothesis
 * @property {string} domain
 * @property {string} predictedOutcome
 * @property {string} researcher - which agent proposed it
 * @property {string} status - 'proposed' | 'testing' | 'supported' | 'refuted' | 'inconclusive'
 * @property {number} predictionAccuracy - 0-1 how close prediction was to result
 * @property {object} experimentResult - summary of experimental outcome
 * @property {string} proposedAt
 * @property {string} concludedAt
 * @property {string[]} relatedHypotheses - IDs of related hypotheses
 */

let _hypCounter = 0;

export class HypothesisTracker {
  constructor(dataDir = './data') {
    this.dataDir = dataDir;
    this.hypotheses = new Map();
    this.hypothesesDir = join(dataDir, 'hypotheses');
    this._ensureDir(this.hypothesesDir);
    this._load();
  }

  _ensureDir(dir) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  /**
   * Register a new hypothesis.
   * @param {object} opts
   * @returns {string} hypothesis ID
   */
  register(opts) {
    const id = `hyp-${Date.now().toString(36)}-${(++_hypCounter).toString(36)}`;
    const record = {
      id,
      hypothesis: opts.hypothesis,
      domain: opts.domain || 'general',
      predictedOutcome: opts.predictedOutcome || null,
      researcher: opts.researcher || 'unknown',
      falsificationCriterion: opts.falsificationCriterion || null,
      variables: opts.variables || [],
      status: 'proposed',
      predictionAccuracy: null,
      experimentResult: null,
      proposedAt: new Date().toISOString(),
      concludedAt: null,
      relatedHypotheses: opts.relatedHypotheses || [],
      buildOn: opts.buildOn || [],
    };
    this.hypotheses.set(id, record);
    this._save(id, record);
    return id;
  }

  /**
   * Update a hypothesis status after experiment.
   * @param {string} id
   * @param {object} result - { supported: boolean, effectSize, significance, notes }
   * @returns {HypothesisRecord}
   */
  conclude(id, result) {
    const record = this.hypotheses.get(id);
    if (!record) throw new Error(`Hypothesis not found: ${id}`);

    record.status = result.supported ? 'supported' : (result.inconclusive ? 'inconclusive' : 'refuted');
    record.concludedAt = new Date().toISOString();
    record.experimentResult = result;

    // Compute prediction accuracy
    if (record.predictedOutcome && result.supported !== undefined) {
      record.predictionAccuracy = result.supported ? 0.7 + Math.min(0.3, (result.effectSize || 0)) : 0.2;
    }

    this._save(id, record);
    return record;
  }

  /**
   * Get a hypothesis record.
   */
  get(id) {
    return this.hypotheses.get(id) || null;
  }

  /**
   * Get all hypotheses, optionally filtered.
   */
  query(filter = {}) {
    let results = [...this.hypotheses.values()];

    if (filter.domain) results = results.filter(h => h.domain === filter.domain);
    if (filter.researcher) results = results.filter(h => h.researcher === filter.researcher);
    if (filter.status) results = results.filter(h => h.status === filter.status);
    if (filter.since) results = results.filter(h => new Date(h.proposedAt) >= new Date(filter.since));

    return results;
  }

  /**
   * Get researcher accuracy stats — who's the best predictor?
   * @returns {object} { researcherName: { total, correct, accuracy, avgAccuracy } }
   */
  getResearcherAccuracy() {
    const stats = {};
    for (const record of this.hypotheses.values()) {
      if (record.predictionAccuracy === null) continue;
      if (!stats[record.researcher]) stats[record.researcher] = { total: 0, accuracySum: 0, correct: 0 };
      stats[record.researcher].total++;
      stats[record.researcher].accuracySum += record.predictionAccuracy;
      if (record.status === 'supported') stats[record.researcher].correct++;
    }

    for (const [name, s] of Object.entries(stats)) {
      s.avgAccuracy = s.total > 0 ? s.accuracySum / s.total : 0;
    }

    return stats;
  }

  /**
   * Get domain predictability — which domains have the most supported hypotheses?
   * @returns {object}
   */
  getDomainStats() {
    const stats = {};
    for (const record of this.hypotheses.values()) {
      if (!stats[record.domain]) stats[record.domain] = { total: 0, supported: 0, refuted: 0, inconclusive: 0 };
      stats[record.domain].total++;
      stats[record.domain][record.status]++;
    }
    return stats;
  }

  /**
   * Find competing hypotheses — same topic, different predictions.
   * This enables emergent rivalry dynamics between researchers.
   */
  findCompetingHypotheses() {
    const byDomain = {};
    for (const record of this.hypotheses.values()) {
      if (record.status !== 'proposed' && record.status !== 'testing') continue;
      if (!byDomain[record.domain]) byDomain[record.domain] = [];
      byDomain[record.domain].push(record);
    }

    return Object.values(byDomain)
      .filter(group => group.length >= 2 && new Set(group.map(h => h.predictedOutcome)).size >= 2)
      .map(group => ({
        topic: group[0].domain,
        hypotheses: group.map(h => ({ id: h.id, hypothesis: h.hypothesis, researcher: h.researcher, predictedOutcome: h.predictedOutcome })),
      }));
  }

  /**
   * Check if two researchers independently discovered the same thing.
   */
  findParallelDiscoveries() {
    const supported = [...this.hypotheses.values()].filter(h => h.status === 'supported');
    const discoveries = [];

    for (let i = 0; i < supported.length; i++) {
      for (let j = i + 1; j < supported.length; j++) {
        const a = supported[i], b = supported[j];
        if (a.researcher === b.researcher) continue;
        if (a.domain !== b.domain) continue;

        const similarity = _textSimilarity(a.hypothesis, b.hypothesis);
        if (similarity > 0.5) {
          discoveries.push({ hypothesisA: a, hypothesisB: b, similarity });
        }
      }
    }

    return discoveries;
  }

  _save(id, record) {
    const filePath = join(this.hypothesesDir, `${id}.json`);
    writeFileSync(filePath, JSON.stringify(record, null, 2));
  }

  _load() {
    if (!existsSync(this.hypothesesDir)) return;
    for (const f of readdirSync(this.hypothesesDir).filter(f => f.endsWith('.json'))) {
      try {
        const record = JSON.parse(readFileSync(join(this.hypothesesDir, f), 'utf-8'));
        this.hypotheses.set(record.id, record);
      } catch { /* skip */ }
    }
  }
}

function _textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return common / Math.max(wordsA.size, wordsB.size, 1);
}

export default HypothesisTracker;
