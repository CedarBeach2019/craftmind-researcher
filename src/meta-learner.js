import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const META_LEARNER_FILE = join(__dirname, '..', 'knowledge', 'meta-learner-state.json');

/**
 * Meta-Learner: analyzes which discovery strategies work best over time
 * and allocates research budget accordingly.
 */
export class MetaLearner {
  constructor() {
    this.state = this._load();
  }

  /** Load persisted meta-learning state. */
  _load() {
    if (existsSync(META_LEARNER_FILE)) {
      try { return JSON.parse(readFileSync(META_LEARNER_FILE, 'utf8')); } catch { /* fall through */ }
    }
    return {
      domainStats: {},       // { farming: {experiments: 5, avgScore: 0.7, successes: 3}, ... }
      strategyLog: [],       // [{ timestamp, domain, hypothesis, score }]
      totalExperiments: 0,
      totalDiscoveries: 0,   // Techniques that scored > 0.6
    };
  }

  /** Persist state to disk. */
  _save() {
    writeFileSync(META_LEARNER_FILE, JSON.stringify(this.state, null, 2));
  }

  /**
   * Record the outcome of a completed experiment cycle.
   * @param {string} domain
   * @param {string} hypothesis
   * @param {number} score - Critic's overall score (0-1).
   */
  recordOutcome(domain, hypothesis, score) {
    if (!this.state.domainStats[domain]) {
      this.state.domainStats[domain] = { experiments: 0, totalScore: 0, successes: 0 };
    }
    const stats = this.state.domainStats[domain];
    stats.experiments++;
    stats.totalScore += score;
    stats.avgScore = stats.totalScore / stats.experiments;
    if (score > 0.6) stats.successes++;

    this.state.strategyLog.push({ timestamp: Date.now(), domain, hypothesis, score });
    this.state.totalExperiments++;
    if (score > 0.6) this.state.totalDiscoveries++;
    this._save();
  }

  /**
   * Get the recommended next domain to research.
   * Uses a weighted strategy: favors under-explored high-success domains.
   * @param {string[]} [availableDomains] - Domains to choose from.
   * @returns {{ domain: string, reason: string }}
   */
  recommendDomain(availableDomains = ['mining', 'building', 'farming', 'combat', 'redstone', 'exploration']) {
    const { domainStats, totalExperiments } = this.state;

    // Score each domain: (success_rate * 0.6) + (exploration_bonus * 0.4)
    const scored = availableDomains.map(domain => {
      const stats = domainStats[domain];
      if (!stats || stats.experiments === 0) {
        return { domain, score: 0.7, reason: 'Unexplored domain — high discovery potential' };
      }
      const successRate = stats.successes / stats.experiments;
      const explorationBonus = Math.max(0, 1 - stats.experiments / Math.max(totalExperiments, 1));
      const score = successRate * 0.6 + explorationBonus * 0.4;
      return { domain, score, reason: `${stats.experiments} experiments, ${(successRate * 100).toFixed(0)}% success rate, avg score ${stats.avgScore.toFixed(2)}` };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * Get meta-learning statistics.
   * @returns {object}
   */
  getStats() {
    return { ...this.state };
  }
}
