/**
 * Technique Discovery Engine — runtime pattern detection and hypothesis testing.
 *
 * Observes bot behavior via log files or event streams, identifies patterns,
 * generates hypotheses, tests them by modifying behavior, and promotes
 * confirmed hypotheses to 'techniques'.
 *
 * @module craftmind-researcher/discovery
 */

import { randomUUID } from 'node:crypto';
import { mean, stdDev, tTest } from './statistics.js';
import { Experiment } from './experiment.js';
import { KnowledgeBase } from './knowledge-base.js';

/**
 * Pattern detected from observations.
 * @typedef {object} Pattern
 * @property {string} id - Unique identifier
 * @property {string} context - When the pattern occurs (e.g., 'fishing near lily pads')
 * @property {string} outcome - What happens (e.g., 'higher catch rate')
 * @property {number} strength - Correlation strength (0-1)
 * @property {number} support - Number of observations supporting this pattern
 * @property {number} confidence - Statistical confidence (0-1)
 * @property {Date} firstSeen - When pattern was first detected
 * @property {Date} lastSeen - When pattern was last observed
 */

/**
 * Discovery Engine for runtime pattern detection and hypothesis testing.
 */
export class DiscoveryEngine {
  /**
   * @param {object} opts
   * @param {number} [opts.patternWindow=1000] - Time window for pattern detection (ms)
   * @param {number} [opts.minObservations=10] - Minimum observations before pattern detection
   * @param {number} [opts.confidenceThreshold=0.8] - Confidence threshold to promote to technique
   */
  constructor(opts = {}) {
    this.patternWindow = opts.patternWindow || 1000;
    this.minObservations = opts.minObservations || 10;
    this.confidenceThreshold = opts.confidenceThreshold || 0.8;

    // Observation buffers
    this.observations = [];
    this.contexts = new Map();
    this.outcomes = new Map();

    // Discovered patterns
    this.patterns = [];
    this.hypotheses = [];
    this.techniques = [];

    // Knowledge base integration
    this.kb = new KnowledgeBase();

    // Active experiments
    this.activeExperiments = [];

    this.startedAt = new Date();
  }

  /**
   * Observe bot behavior and record for pattern detection.
   * @param {object} observation
   * @param {string} observation.event - Event type (e.g., 'fish_caught', 'block_broken')
   * @param {object} observation.context - Environmental context (position, biome, time, etc.)
   * @param {object} observation.metrics - Measured outcomes (count, time, etc.)
   * @param {Date} [observation.timestamp] - When the observation occurred
   */
  observe(observation) {
    const obs = {
      id: randomUUID(),
      timestamp: observation.timestamp || new Date(),
      event: observation.event,
      context: observation.context || {},
      metrics: observation.metrics || {},
    };

    this.observations.push(obs);

    // Update context and outcome tracking
    const contextKey = this._contextKey(obs.context);
    const outcomeKey = this._outcomeKey(obs.event, obs.metrics);

    if (!this.contexts.has(contextKey)) {
      this.contexts.set(contextKey, { count: 0, outcomes: new Map() });
    }
    const ctx = this.contexts.get(contextKey);
    ctx.count++;

    if (!ctx.outcomes.has(outcomeKey)) {
      ctx.outcomes.set(outcomeKey, { count: 0, total: 0, samples: [] });
    }
    const outcome = ctx.outcomes.get(outcomeKey);
    outcome.count++;

    // Track metric values for statistical analysis
    for (const [key, value] of Object.entries(obs.metrics)) {
      if (typeof value === 'number') {
        if (!outcome.samples[key]) outcome.samples[key] = [];
        outcome.samples[key].push(value);
      }
    }

    // Trigger pattern detection if we have enough data
    if (this.observations.length % this.minObservations === 0) {
      this._detectPatterns();
    }

    return obs.id;
  }

  /**
   * Identify patterns from accumulated observations.
   * @returns {Pattern[]} Detected patterns
   */
  hypothesize() {
    const newPatterns = this._detectPatterns();
    const newHypotheses = [];

    for (const pattern of newPatterns) {
      // Skip if we already have a similar pattern
      const exists = this.patterns.some(p =>
        p.context === pattern.context && p.outcome === pattern.outcome
      );
      if (exists) continue;

      this.patterns.push(pattern);

      // Generate hypothesis from pattern
      const hypothesis = this._patternToHypothesis(pattern);
      if (hypothesis) {
        this.hypotheses.push(hypothesis);
        newHypotheses.push(hypothesis);
      }
    }

    return newHypotheses;
  }

  /**
   * Test a hypothesis by running a controlled experiment.
   * @param {object} hypothesis - Hypothesis to test
   * @param {object} opts - Test options
   * @param {number} [opts.sampleSize=20] - Sample size for experiment
   * @param {Function} [opts.executor] - Function to execute test (optional)
   * @returns {Promise<object>} Experiment results
   */
  async test(hypothesis, opts = {}) {
    const sampleSize = opts.sampleSize || 20;

    // Create experiment from hypothesis
    const experiment = new Experiment({
      hypothesis: hypothesis.statement,
      domain: hypothesis.domain || 'general',
      type: 'ab_test',
      variables: hypothesis.variables || [],
      controls: hypothesis.controls || {},
      sampleSize,
      falsificationCriterion: hypothesis.falsificationCriterion,
    });

    experiment.start();
    this.activeExperiments.push(experiment);

    // Execute experiment
    if (opts.executor) {
      // Use provided executor (e.g., real bot)
      await opts.executor(experiment);
    } else {
      // Simulate experiment based on pattern
      this._simulateExperiment(experiment, hypothesis);
    }

    // Analyze results
    const analysis = experiment.analyze();
    const falsification = experiment.checkFalsification();
    experiment.conclude(falsification.reason, falsification.supported);

    return {
      experiment,
      hypothesis,
      analysis,
      falsification,
      pattern: hypothesis.pattern,
    };
  }

  /**
   * Promote a confirmed hypothesis to a technique.
   * @param {object} hypothesis - Hypothesis to promote
   * @param {object} validation - Validation results from test()
   * @returns {object} Saved technique
   */
  learn(hypothesis, validation) {
    if (!validation.falsification.supported) {
      throw new Error('Cannot promote refuted hypothesis to technique');
    }

    const pattern = hypothesis.pattern;
    const technique = {
      id: `technique-${randomUUID().slice(0, 8)}`,
      name: this._generateTechniqueName(hypothesis),
      domain: hypothesis.domain || 'general',
      statement: hypothesis.statement,
      description: hypothesis.description || '',
      pattern: {
        context: pattern.context,
        outcome: pattern.outcome,
        strength: pattern.strength,
        confidence: pattern.confidence,
      },
      validation: {
        experimentId: validation.experiment.id,
        supported: validation.falsification.supported,
        pValue: validation.analysis.tTest?.pValue || null,
        effectSize: validation.analysis.effectSize || null,
      },
      actions: this._generateActions(hypothesis, pattern),
      discoveredAt: new Date().toISOString(),
      observations: pattern.support,
    };

    this.techniques.push(technique);

    // Also save to knowledge base
    this.kb.save({
      id: technique.id,
      domain: technique.domain,
      statement: technique.statement,
      score: pattern.confidence,
      verified: true,
      behaviorScript: {
        format: 'discovery',
        actions: technique.actions,
      },
      paper: null,
      experimentData: { validation },
      literatureReview: null,
      falsificationCriterion: hypothesis.falsificationCriterion,
    });

    return technique;
  }

  /**
   * Get current statistics about the discovery process.
   * @returns {object}
   */
  getStats() {
    return {
      observations: this.observations.length,
      uniqueContexts: this.contexts.size,
      patternsDetected: this.patterns.length,
      hypothesesGenerated: this.hypotheses.length,
      techniquesLearned: this.techniques.length,
      activeExperiments: this.activeExperiments.length,
      uptime: Date.now() - this.startedAt.getTime(),
    };
  }

  /**
   * Clear observation buffers (reset discovery state).
   */
  reset() {
    this.observations = [];
    this.contexts.clear();
    this.outcomes.clear();
    this.patterns = [];
    this.hypotheses = [];
    this.techniques = [];
    this.activeExperiments = [];
    this.startedAt = new Date();
  }

  // ─── Internal Methods ────────────────────────────────────────────

  /**
   * Generate a key for context grouping.
   * @private
   */
  _contextKey(context) {
    const parts = [];
    if (context.biome) parts.push(`biome:${context.biome}`);
    if (context.position) {
      const { x, y, z } = context.position;
      parts.push(`pos:${Math.floor(x/16)},${Math.floor(y/16)},${Math.floor(z/16)}`);
    }
    if (context.timeOfDay !== undefined) parts.push(`time:${context.timeOfDay}`);
    if (context.weather) parts.push(`weather:${context.weather}`);
    if (context.nearbyBlocks) parts.push(`nearby:${context.nearbyBlocks.sort().join(',')}`);
    return parts.join('|') || 'default';
  }

  /**
   * Generate a key for outcome grouping.
   * @private
   */
  _outcomeKey(event, metrics) {
    const parts = [event];
    for (const [key, value] of Object.entries(metrics)) {
      if (typeof value === 'boolean') {
        parts.push(`${key}:${value}`);
      } else if (typeof value === 'number') {
        // Bin numerical values
        const bin = Math.floor(value / 10) * 10;
        parts.push(`${key}:${bin}-${bin+10}`);
      }
    }
    return parts.join('|');
  }

  /**
   * Detect patterns from observation data.
   * @private
   * @returns {Pattern[]}
   */
  _detectPatterns() {
    const patterns = [];

    for (const [contextKey, ctx] of this.contexts) {
      if (ctx.count < this.minObservations) continue;

      for (const [outcomeKey, outcome] of ctx.outcomes) {
        if (outcome.count < 5) continue;

        // Calculate correlation strength
        const expectedRate = outcome.count / ctx.count;

        // Compare with global baseline
        let baselineRate = expectedRate;
        let totalContexts = 0;
        let totalOutcomes = 0;

        for (const [, otherCtx] of this.contexts) {
          totalContexts += otherCtx.count;
          const otherOutcome = otherCtx.outcomes.get(outcomeKey);
          if (otherOutcome) {
            totalOutcomes += otherOutcome.count;
          }
        }

        if (totalContexts > 0) {
          baselineRate = totalOutcomes / totalContexts;
        }

        // Calculate strength as deviation from baseline
        const strength = baselineRate > 0
          ? Math.min(1, Math.abs(expectedRate - baselineRate) / baselineRate)
          : 0;

        // Calculate confidence based on sample size
        const confidence = Math.min(1, outcome.count / (this.minObservations * 2));

        if (strength > 0.2 && confidence > 0.5) {
          const [event, ...metricParts] = outcomeKey.split('|');
          const metrics = {};
          for (const part of metricParts) {
            const [key, value] = part.split(':');
            metrics[key] = value;
          }

          patterns.push({
            id: randomUUID(),
            context: contextKey,
            outcome: outcomeKey,
            event,
            metrics,
            strength,
            support: outcome.count,
            confidence,
            firstSeen: new Date(Date.now() - this.patternWindow),
            lastSeen: new Date(),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Convert a pattern to a testable hypothesis.
   * @private
   */
  _patternToHypothesis(pattern) {
    const context = this._parseContext(pattern.context);
    const outcome = this._parseOutcome(pattern.outcome);

    if (!context || !outcome) return null;

    return {
      id: randomUUID(),
      statement: this._generateHypothesisStatement(context, outcome),
      description: `Pattern: ${pattern.context} → ${pattern.outcome}`,
      domain: this._inferDomain(context),
      pattern,
      variables: [
        {
          name: context.variable || 'condition',
          values: [context.value, 'control'],
        },
      ],
      controls: this._extractControls(context),
      falsificationCriterion: `Hypothesis refuted if no significant difference (p >= 0.05).`,
      context,
      outcome,
    };
  }

  /**
   * Generate human-readable hypothesis statement.
   * @private
   */
  _generateHypothesisStatement(context, outcome) {
    const contextDesc = context.description || context.key;
    const outcomeDesc = outcome.description || outcome.key;
    return `${outcomeDesc} when ${contextDesc}`;
  }

  /**
   * Infer domain from context.
   * @private
   */
  _inferDomain(context) {
    const c = context.raw || context.key;
    if (c.includes('fish') || c.includes('water')) return 'farming';
    if (c.includes('mine') || c.includes('ore') || c.includes('block')) return 'mining';
    if (c.includes('mob') || c.includes('combat')) return 'combat';
    if (c.includes('build') || c.includes('place')) return 'building';
    return 'general';
  }

  /**
   * Extract control variables from context.
   * @private
   */
  _extractControls(context) {
    const controls = {};
    const c = context.raw || context.key;

    if (c.includes('biome:')) {
      const match = c.match(/biome:(\w+)/);
      if (match) controls.biome = match[1];
    }
    if (c.includes('time:')) {
      const match = c.match(/time:(\d+)/);
      if (match) controls.timeOfDay = parseInt(match[1]);
    }

    return controls;
  }

  /**
   * Parse context key into structured object.
   * @private
   */
  _parseContext(contextKey) {
    const parts = contextKey.split('|');
    const parsed = { raw: contextKey, key: parts[0] || 'default' };

    for (const part of parts) {
      if (part.startsWith('nearby:')) {
        parsed.description = `near ${part.slice(7).replace(',', ' and ')}`;
        parsed.variable = part.slice(7).split(',')[0];
        parsed.value = part.slice(7);
      }
    }

    return parsed;
  }

  /**
   * Parse outcome key into structured object.
   * @private
   */
  _parseOutcome(outcomeKey) {
    const parts = outcomeKey.split('|');
    const parsed = { raw: outcomeKey, key: parts[0] || 'outcome' };

    for (const part of parts) {
      const [key, value] = part.split(':');
      if (key === 'success') {
        parsed.description = value === 'true' ? 'higher success rate' : 'lower success rate';
      }
    }

    return parsed;
  }

  /**
   * Simulate an experiment based on pattern strength.
   * @private
   */
  _simulateExperiment(experiment, hypothesis) {
    const pattern = hypothesis.pattern;
    const conditions = experiment.conditions;
    const n = experiment.sampleSize;

    for (const cond of conditions) {
      const isTreatment = cond.label.includes('0') || Object.values(cond.variables || {}).some(v => v !== 'control');

      // Generate outcomes based on pattern strength
      const baseRate = 0.5;
      const effect = isTreatment ? pattern.strength * 0.3 : 0;
      const successRate = Math.min(1, Math.max(0, baseRate + effect));

      for (let i = 0; i < n; i++) {
        experiment.recordResult(cond.label, {
          success: Math.random() < successRate,
          duration: 500 + Math.random() * 2000,
          metrics: {
            value: successRate + (Math.random() * 0.2 - 0.1),
            attempts: 1,
          },
        });
      }
    }
  }

  /**
   * Generate a readable technique name.
   * @private
   */
  _generateTechniqueName(hypothesis) {
    const words = hypothesis.statement
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 4);

    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  /**
   * Generate executable actions from hypothesis.
   * @private
   */
  _generateActions(hypothesis, pattern) {
    const actions = [];
    const context = hypothesis.context || {};
    const outcome = hypothesis.outcome || {};

    // Context setup actions
    if (context.description) {
      actions.push({
        type: 'observe',
        description: `Check for ${context.description}`,
        condition: context.key,
      });
    }

    // Action to take
    actions.push({
      type: 'execute',
      description: hypothesis.statement,
      expectedOutcome: outcome.description || 'improved results',
    });

    // Verification action
    actions.push({
      type: 'verify',
      description: 'Verify outcome matches expected',
      metric: pattern.outcome,
    });

    return actions;
  }

  /**
   * Export discovery state as JSON.
   */
  toJSON() {
    return {
      stats: this.getStats(),
      patterns: this.patterns,
      hypotheses: this.hypotheses.map(h => ({
        id: h.id,
        statement: h.statement,
        domain: h.domain,
        confidence: h.pattern?.confidence,
      })),
      techniques: this.techniques,
    };
  }
}

export default DiscoveryEngine;
