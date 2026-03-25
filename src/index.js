#!/usr/bin/env node

/**
 * CraftMind Researcher — Main Entry Point
 *
 * Orchestrates the full self-improvement cycle:
 *   Researcher proposes → Teacher demonstrates → Critic evaluates → Distiller scripts → Knowledge base updates → Meta-learner adjusts
 */

import { KnowledgeBase } from './knowledge-base.js';
import { DiscoveryAgent } from './discovery-agent.js';
import { TeacherAgent } from './teacher-agent.js';
import { CriticAgent } from './critic-agent.js';
import { DistillerAgent } from './distiller-agent.js';
import { MetaLearner } from './meta-learner.js';
import { Experiment } from './experiment.js';
import { serializeScript } from './behavior-script.js';

/** Run a single research cycle. */
export async function runCycle({ focusDomain, mineflayerBot } = {}) {
  console.log('🔬 CraftMind Researcher — Starting discovery cycle\n');

  // Initialize components
  const kb = new KnowledgeBase();
  const researcher = new DiscoveryAgent(kb);
  const teacher = new TeacherAgent();
  const critic = new CriticAgent();
  const distiller = new DistillerAgent();
  const meta = new MetaLearner();

  // Meta-learner recommends a domain
  if (!focusDomain) {
    const rec = meta.recommendDomain(kb.getDomains());
    focusDomain = rec.domain;
    console.log(`📊 Meta-learner recommends: ${rec.domain} — ${rec.reason}\n`);
  }

  // Step 1: Researcher proposes hypothesis
  console.log('🧪 Step 1: Researcher proposing hypothesis...');
  const hypothesis = await researcher.proposeHypothesis(focusDomain);
  console.log(`   Hypothesis: ${hypothesis.hypothesis}`);
  console.log(`   Domain: ${hypothesis.domain}, Type: ${hypothesis.type}\n`);

  // Step 2: Researcher designs experiment
  console.log('📐 Step 2: Designing experiment...');
  const design = await researcher.designExperiment(hypothesis);
  console.log(`   Sample size: ${design.sampleSize}, Variables: ${design.variables?.join(', ') || 'N/A'}\n`);

  // Step 3: Create and run experiment
  console.log('⚡ Step 3: Running experiment...');
  const experiment = new Experiment({
    hypothesis: hypothesis.hypothesis,
    domain: hypothesis.domain,
    variables: hypothesis.variables,
    controls: design.controls,
    sampleSize: design.sampleSize || 5,
    type: hypothesis.type,
  });

  experiment.start();
  experiment.logSetup('Experiment area prepared');

  // Run trials (simulated — in production, this would control a mineflayer bot)
  for (const condition of experiment.conditions) {
    for (let i = 0; i < experiment.sampleSize; i++) {
      // Simulated trial — replace with actual mineflayer bot execution
      const simulatedDuration = Math.random() * 10000 + 2000;
      const simulatedSuccess = Math.random() > 0.3;
      const simulatedValue = Math.random() * 10 + 1;

      experiment.recordResult(condition.label, {
        metrics: { primary: simulatedValue, duration_ms: simulatedDuration },
        duration: simulatedDuration,
        success: simulatedSuccess,
        notes: `Trial ${i + 1} for ${condition.label}`,
      });

      if (mineflayerBot) {
        // In production: await runBotTrial(mineflayerBot, experiment, condition, i);
        console.log(`   [Bot trial would execute here with mineflayer]`);
      }
    }
  }

  const summary = experiment.getSummary();
  const supported = summary[experiment.conditions[0]?.label]?.successRate > 0.5;
  experiment.conclude(
    `Hypothesis "${hypothesis.hypothesis}" is ${supported ? 'supported' : 'not supported'} by experimental data.`,
    supported
  );
  console.log(`   Result: ${experiment.conclusion.text}`);
  console.log(`   Summary: ${JSON.stringify(summary)}\n`);

  // Step 4: Teacher creates behavior script
  console.log('👩‍🏫 Step 4: Teacher creating demonstration script...');
  const teacherScript = await teacher.createScript({
    id: experiment.id,
    statement: hypothesis.hypothesis,
    domain: hypothesis.domain,
    details: { experiment: experiment.toJSON(), design },
    conclusion: experiment.conclusion,
  });
  console.log(`   Script: ${teacherScript.actions.length} actions\n`);

  // Step 5: Critic evaluates
  console.log('🔍 Step 5: Critic evaluating...');
  const evaluation = await critic.evaluate(
    { statement: hypothesis.hypothesis, domain: hypothesis.domain, details: summary },
    summary,
    teacherScript
  );
  console.log(`   Overall score: ${(evaluation.overall * 100).toFixed(1)}%`);
  console.log(`   Verdict: ${evaluation.verdict}\n`);

  // Step 6: Distiller optimizes
  console.log('🧊 Step 6: Distilling into minimal script...');
  const distilledScript = await distiller.distill(teacherScript, experiment);
  const summaryText = await distiller.summarize(experiment, evaluation);
  console.log(`   Distilled: ${distilledScript.actions.length} actions (was ${teacherScript.actions.length})\n`);

  // Step 7: Save to knowledge base
  console.log('💾 Step 7: Saving to knowledge base...');
  const technique = kb.save({
    id: experiment.id,
    domain: hypothesis.domain,
    statement: summaryText,
    score: evaluation.overall,
    verified: supported && evaluation.overall > 0.6,
    details: { experiment: experiment.toJSON(), evaluation, distilledScript: serializeScript(distilledScript) },
    behaviorScript: distilledScript,
  });
  console.log(`   Saved as: ${technique.id}`);

  // Step 8: Meta-learner records outcome
  meta.recordOutcome(hypothesis.domain, hypothesis.hypothesis, evaluation.overall);
  console.log(`   Meta-learner updated\n`);

  // Final report
  console.log('═══════════════════════════════════════');
  console.log('📋 Cycle Complete');
  console.log(`   Hypothesis: ${hypothesis.hypothesis}`);
  console.log(`   Score: ${(evaluation.overall * 100).toFixed(1)}%`);
  console.log(`   Verified: ${technique.verified}`);
  console.log(`   Knowledge base: ${kb.stats().total} techniques`);
  console.log('═══════════════════════════════════════\n');

  return { hypothesis, experiment: experiment.toJSON(), evaluation, technique, distilledScript };
}

// CLI entry
const isSingleRun = process.argv.includes('--single-run');
const isDemo = process.argv.includes('--demo');

if (isSingleRun || isDemo) {
  const domain = isDemo ? 'farming' : undefined;
  runCycle({ focusDomain: domain }).catch(err => {
    console.error('Cycle failed:', err);
    process.exit(1);
  });
}

export { KnowledgeBase, DiscoveryAgent, TeacherAgent, CriticAgent, DistillerAgent, MetaLearner, Experiment };
