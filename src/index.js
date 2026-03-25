/**
 * CraftMind Researcher — Main entry point and cycle orchestrator.
 *
 * Implements the full scientific discovery cycle:
 * Literature Review → Hypothesis → Design → Validate → Execute → Analyze → Critic → Script → Distill → Paper → Export
 */

import { KnowledgeBase } from './knowledge-base.js';
import { DiscoveryAgent } from './discovery-agent.js';
import { Experiment } from './experiment.js';
import { CriticAgent } from './critic-agent.js';
import { TeacherAgent } from './teacher-agent.js';
import { DistillerAgent } from './distiller-agent.js';
import { MetaLearner } from './meta-learner.js';
import { CitationNetwork } from './citation-network.js';
import { KnowledgeExport } from './knowledge-export.js';
import { generatePaper, paperToMarkdown } from './research-paper.js';
import { validateExperimentDesign } from './experiment-validator.js';

export { KnowledgeBase } from './knowledge-base.js';
export { Experiment } from './experiment.js';
export { DiscoveryAgent } from './discovery-agent.js';
export { CriticAgent } from './critic-agent.js';
export { TeacherAgent } from './teacher-agent.js';
export { DistillerAgent } from './distiller-agent.js';
export { MetaLearner } from './meta-learner.js';
export { CitationNetwork } from './citation-network.js';
export { KnowledgeExport } from './knowledge-export.js';
export { generatePaper, paperToMarkdown } from './research-paper.js';
export * from './statistics.js';
export { validateExperimentDesign, estimateRequiredSampleSize } from './experiment-validator.js';
export { reviewLiterature, identifyKnowledgeGaps, generateAnalogies } from './literature-review.js';

// runCycle defined inline below

/**
 * Register researcher features with CraftMind Core.
 * @param {object} core - Core instance with registerPlugin()
 */
export function registerWithCore(core) {
  core.registerPlugin('researcher', {
    name: 'CraftMind Researcher',
    version: '1.0.0',
    modules: { runCycle, KnowledgeBase, DiscoveryAgent, Experiment, CriticAgent, TeacherAgent, DistillerAgent, MetaLearner },
  });
}

/**
 * Run a full discovery cycle.
 *
 * 1. Literature review — check knowledge base for related facts and gaps
 * 2. Hypothesis proposal — DiscoveryAgent proposes a novel hypothesis
 * 3. Experiment design — DiscoveryAgent designs the experiment
 * 4. Design validation — check falsifiability, sample size, controls
 * 5. Experiment execution — record simulated/real results
 * 6. Statistical analysis — t-tests, confidence intervals, effect sizes
 * 7. Falsification check — does the evidence support or refute the hypothesis?
 * 8. Critic evaluation — score the technique on 4 dimensions
 * 9. Paper generation — produce a mini research paper
 * 10. Script creation — TeacherAgent creates a behavior script
 * 11. Script distillation — DistillerAgent optimizes the script
 * 12. Knowledge base export — save everything with citations
 * 13. Meta-learner update — record outcome for future domain selection
 *
 * @param {object} opts
 * @param {string} [opts.focusDomain] - Optional domain to focus on
 * @param {object} [opts.mineflayerBot] - Optional mineflayer bot for real experiments
 * @param {string} [opts.minimumRigor] - 'quick', 'moderate', 'high'
 * @param {object} [opts.simulatedResults] - Provide simulated results for testing
 * @returns {Promise<object>} Full cycle result
 */
export async function runCycle({ focusDomain, mineflayerBot, minimumRigor = 'moderate', simulatedResults = null } = {}) {
  const kb = new KnowledgeBase();
  const discovery = new DiscoveryAgent(kb);
  const critic = new CriticAgent();
  const teacher = new TeacherAgent();
  const distiller = new DistillerAgent();
  const metaLearner = new MetaLearner();
  const citations = new CitationNetwork();

  console.log('🔬 CraftMind Researcher — Discovery Cycle');
  console.log('─'.repeat(50));

  // ─── Step 1: Propose Hypothesis with Literature Review ───
  console.log('\n📖 Step 1: Literature Review & Hypothesis Proposal...');
  const hypothesis = await discovery.proposeHypothesis(focusDomain);

  console.log(`   Domain: ${hypothesis.domain}`);
  console.log(`   Hypothesis: ${hypothesis.hypothesis}`);

  if (hypothesis.literatureReview) {
    const lr = hypothesis.literatureReview;
    console.log(`   Novel: ${lr.novel ? '✅' : '⚠️ (overlaps with existing knowledge)'}`);
    if (lr.relatedFacts.length > 0) {
      console.log(`   Related facts: ${lr.relatedFacts.map(f => f.id).join(', ')}`);
    }
    if (lr.gaps.length > 0) {
      console.log(`   Knowledge gaps explored: ${lr.gaps.slice(0, 3).join(', ')}`);
    }
  }

  if (!hypothesis.literatureReview?.novel) {
    console.log('   ⚠️  Hypothesis may overlap with known facts. Proceeding with caution.');
  }

  // ─── Step 2: Design Experiment ────────────────────────────
  console.log('\n📐 Step 2: Experiment Design...');
  const design = await discovery.designExperiment(hypothesis);

  console.log(`   Type: ${hypothesis.type}`);
  console.log(`   Sample size: ${design.sampleSize} per condition`);

  if (design.validation) {
    const v = design.validation;
    console.log(`   Validation: ${v.valid ? '✅' : '❌'} ${v.recommendation}`);
    for (const w of v.warnings) console.log(`     ⚠️  ${w}`);
    for (const e of v.errors) console.log(`     ❌ ${e}`);
  }

  // ─── Step 3: Create & Run Experiment ──────────────────────
  console.log('\n🧪 Step 3: Running Experiment...');
  const experiment = new Experiment({
    hypothesis: hypothesis.hypothesis,
    domain: hypothesis.domain,
    type: hypothesis.type,
    variables: hypothesis.variables,
    controls: design.controls || {},
    sampleSize: design.sampleSize || 10,
    falsificationCriterion: design.failureCriteria,
    minimumRigor,
    reproducibilityContext: design.reproducibilityContext || {},
  });

  experiment.start();

  // If we have simulated results (for testing/demo), use them
  if (simulatedResults) {
    for (const result of simulatedResults) {
      experiment.recordResult(result.condition, result);
    }
  } else if (mineflayerBot) {
    // Real experiment execution would go here
    // For now, log that a real bot was provided
    console.log('   🤖 Real mineflayer bot provided — experiment would execute in-world.');
    console.log('   (In-world execution not yet implemented — using demo data)');
    _runDemoExperiment(experiment);
  } else {
    // Generate simulated results based on hypothesis
    _runDemoExperiment(experiment);
  }

  // ─── Step 4: Statistical Analysis ─────────────────────────
  console.log('\n📊 Step 4: Statistical Analysis...');
  const analysis = experiment.analyze();
  const summary = experiment.getSummary();

  for (const [cond, data] of Object.entries(summary)) {
    console.log(`   ${cond}: ${data.count} trials, success rate ${(data.successRate * 100).toFixed(0)}%`);
    if (data.metrics) {
      for (const [metric, stats] of Object.entries(data.metrics)) {
        console.log(`     ${metric}: avg=${stats.avg.toFixed(1)}, std=${stats.stdDev.toFixed(1)}, CI95=[${stats.confidenceInterval95.lower.toFixed(1)}, ${stats.confidenceInterval95.upper.toFixed(1)}]`);
      }
    }
  }

  if (analysis.tTest) {
    const t = analysis.tTest;
    console.log(`   t-test: t(${t.df.toFixed(1)})=${t.tStatistic.toFixed(3)}, p=${t.pValue.toFixed(4)} ${t.significant ? '(significant ✅)' : '(not significant ❌)'}`);
  }
  if (analysis.effectSize !== null && analysis.effectSize !== undefined) {
    const d = Math.abs(analysis.effectSize);
    console.log(`   Effect size: Cohen's d=${analysis.effectSize.toFixed(3)} (${d > 0.8 ? 'large' : d > 0.5 ? 'medium' : d > 0.2 ? 'small' : 'negligible'})`);
  }

  // ─── Step 5: Falsification Check ──────────────────────────
  console.log('\n⚖️ Step 5: Falsification Check...');
  const falsification = experiment.checkFalsification();
  console.log(`   Hypothesis: ${falsification.supported ? '✅ SUPPORTED' : '❌ REFUTED'}`);
  console.log(`   Reason: ${falsification.reason}`);

  experiment.conclude(falsification.reason, falsification.supported);

  // ─── Step 6: Critic Evaluation ────────────────────────────
  console.log('\n🔍 Step 6: Critic Evaluation...');
  const evaluation = await critic.evaluate(
    { statement: hypothesis.hypothesis, domain: hypothesis.domain, details: summary },
    summary,
  );
  console.log(`   Overall: ${(evaluation.overall * 100).toFixed(1)}%`);
  console.log(`   Verdict: ${evaluation.verdict}`);
  if (evaluation.edgeCases?.length > 0) console.log(`   Edge cases: ${evaluation.edgeCases.join('; ')}`);
  if (evaluation.improvements?.length > 0) console.log(`   Improvements: ${evaluation.improvements.join('; ')}`);

  // ─── Step 7: Research Paper ───────────────────────────────
  console.log('\n📄 Step 7: Research Paper Generation...');
  const paper = generatePaper({
    experimentId: experiment.id,
    hypothesis: hypothesis.hypothesis,
    domain: hypothesis.domain,
    experimentDesign: { variables: hypothesis.variables, controls: design.controls, sampleSize: design.sampleSize, type: hypothesis.type },
    results: summary,
    statisticalAnalysis: { tTest: analysis.tTest, effectSize: analysis.effectSize, confidence: null },
    hypothesisSupported: falsification.supported,
    evaluation,
    relatedWork: hypothesis.relatedFacts || [],
    reproducibilityContext: experiment.reproducibilityContext,
    failureAnalysis: experiment.failures.length > 0 ? { failed: true, reason: experiment.failures[0].reason, lessons: experiment.failures.flatMap(f => f.lessons) } : null,
  });

  console.log(`   Paper: "${paper.title}"`);
  console.log(`   Falsification criterion: ${paper.falsificationCriterion}`);

  // ─── Step 8: Create Behavior Script ───────────────────────
  console.log('\n👩‍🏫 Step 8: Behavior Script Creation...');
  let behaviorScript = null;
  if (falsification.supported) {
    behaviorScript = await teacher.createScript({
      id: experiment.id,
      statement: hypothesis.hypothesis,
      domain: hypothesis.domain,
      details: summary,
    });
    console.log(`   Script: ${behaviorScript.actions.length} actions`);

    // ─── Step 9: Distill Script ─────────────────────────────
    console.log('\n🧊 Step 9: Script Distillation...');
    const distilled = await distiller.distill(behaviorScript, {
      domain: hypothesis.domain,
      conclusion: { text: paper.conclusion.verdict },
    });
    behaviorScript = distilled;
    console.log(`   Distilled: ${distilled.actions.length} actions`);
  } else {
    console.log('   Skipped (hypothesis not supported)');
  }

  // ─── Step 10: Save to Knowledge Base ──────────────────────
  console.log('\n💾 Step 10: Saving to Knowledge Base...');
  const score = evaluation.overall;
  const technique = kb.save({
    id: experiment.id,
    domain: hypothesis.domain,
    statement: hypothesis.hypothesis,
    score,
    verified: falsification.supported && score > 0.6,
    behaviorScript,
    paper,
    experimentData: { summary, analysis, falsification },
    literatureReview: hypothesis.literatureReview,
    falsificationCriterion: hypothesis.falsificationCriterion,
  });
  console.log(`   Saved: ${technique.id} (score: ${(score * 100).toFixed(1)}%)`);

  // ─── Step 11: Update Citation Network ─────────────────────
  console.log('\n🔗 Step 11: Updating Citation Network...');
  if (hypothesis.relatedFacts?.length > 0) {
    for (const refId of hypothesis.relatedFacts) {
      citations.addCitation(experiment.id, refId, 'builds_on', `Hypothesis built on prior discovery ${refId}`);
    }
    console.log(`   Added ${hypothesis.relatedFacts.length} citation(s)`);
  }
  if (!falsification.supported) {
    // If we contradicted something, record that
    if (hypothesis.literatureReview?.contradictions?.length > 0) {
      for (const contradicted of hypothesis.literatureReview.contradictions) {
        citations.addCitation(experiment.id, contradicted.id, 'contradicts', `Results contradict ${contradicted.id}`);
      }
    }
  }
  const citStats = citations.stats();
  console.log(`   Network: ${citStats.nodeCount} nodes, ${citStats.edgeCount} edges`);

  // ─── Step 12: Meta-Learner Update ─────────────────────────
  console.log('\n🧠 Step 12: Meta-Learner Update...');
  metaLearner.recordOutcome(hypothesis.domain, hypothesis.hypothesis, score);
  const rec = metaLearner.recommendDomain();
  console.log(`   Total experiments: ${metaLearner.getStats().totalExperiments}`);
  console.log(`   Recommended next domain: ${rec.domain} (${rec.reason})`);

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Cycle complete — ${experiment.id}`);

  return { experiment, hypothesis, evaluation, technique, paper, behaviorScript, analysis };
}

/**
 * Generate demo experiment results for testing.
 * @private
 */
function _runDemoExperiment(experiment) {
  const n = experiment.sampleSize;
  const conditions = experiment.conditions;

  if (conditions.length === 1) {
    // Simple experiment
    for (let i = 0; i < n; i++) {
      experiment.recordResult(conditions[0].label, {
        success: Math.random() > 0.2,
        duration: 500 + Math.random() * 2000,
        metrics: { output: Math.floor(3 + Math.random() * 5) },
      });
    }
  } else {
    // A/B test — generate data with a real difference
    for (let ci = 0; ci < conditions.length; ci++) {
      const cond = conditions[ci];
      // Create a measurable difference (condition 0 is baseline, others vary)
      const effect = ci * 15 + (Math.random() * 10 - 5); // systematic difference
      for (let i = 0; i < n; i++) {
        experiment.recordResult(cond.label, {
          success: Math.random() > (0.3 - ci * 0.05),
          duration: Math.max(100, 1000 - effect + (Math.random() * 300 - 150)),
          metrics: { time: Math.max(50, 500 - effect + (Math.random() * 200 - 100)), output: Math.floor(2 + ci * 1.5 + Math.random() * 3) },
        });
      }
    }
  }
}

// CLI entry point — only run when executed directly
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.includes('--single-run') || args.length === 0) {
    const domain = args.includes('--demo') ? 'farming' : undefined;
    runCycle({ focusDomain: domain }).catch(err => {
      console.error('❌ Cycle failed:', err);
      process.exit(1);
    });
  }
}
