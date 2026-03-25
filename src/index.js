#!/usr/bin/env node

/**
 * CraftMind Researcher — Main Entry Point
 *
 * Orchestrates the full self-improvement cycle:
 *   Researcher proposes → Teacher demonstrates → Critic evaluates → Distiller scripts → Knowledge base updates → Meta-learner adjusts
 *
 * @module craftmind-researcher
 */

import { KnowledgeBase } from './knowledge-base.js';
import { DiscoveryAgent } from './discovery-agent.js';
import { TeacherAgent } from './teacher-agent.js';
import { CriticAgent } from './critic-agent.js';
import { DistillerAgent } from './distiller-agent.js';
import { MetaLearner } from './meta-learner.js';
import { Experiment } from './experiment.js';
import { serializeScript } from './behavior-script.js';

/**
 * Execute one full research discovery cycle.
 *
 * The cycle flows through 8 steps:
 *   1. Meta-learner recommends a research domain (or uses the provided focus)
 *   2. Discovery Agent proposes a testable hypothesis
 *   3. Discovery Agent designs the experiment (variables, controls, sample size)
 *   4. Experiment executes trials (simulated or via mineflayer bot)
 *   5. Teacher Agent creates a behavior script for the technique
 *   6. Critic Agent evaluates the technique and script
 *   7. Distiller Agent compresses the script to its essential actions
 *   8. Results are saved to the knowledge base and meta-learner records the outcome
 *
 * @param {object} [opts] - Cycle options.
 * @param {string} [opts.focusDomain] - Override domain recommendation (mining, building, farming, combat, redstone, exploration).
 * @param {object} [opts.mineflayerBot] - A connected mineflayer bot instance for live trials. If omitted, trials are simulated.
 * @returns {Promise<{hypothesis: object, experiment: object, evaluation: object, technique: object, distilledScript: object}>}
 *   The complete cycle output including the hypothesis, experiment data, critic evaluation, saved technique, and distilled script.
 *
 * @example
 * // Run a cycle focused on farming
 * const result = await runCycle({ focusDomain: 'farming' });
 * console.log(result.technique.verified); // true if technique passed all checks
 */
export async function runCycle({ focusDomain, mineflayerBot } = {}) {