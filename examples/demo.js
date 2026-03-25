// ═══════════════════════════════════════════════════════════════
// CraftMind Researcher — Demo
// ═══════════════════════════════════════════════════════════════

import { KnowledgeBase } from '../src/knowledge-base.js';
import { Experiment } from '../src/experiment.js';
import { CriticAgent } from '../src/critic-agent.js';
import { MetaLearner } from '../src/meta-learner.js';
import { CitationNetwork } from '../src/citation-network.js';
import { runCycle } from '../src/index.js';

console.log(`
🧪 CraftMind Researcher — AI Discovery Demo
════════════════════════════════════════════
`);

// Knowledge base overview
const kb = new KnowledgeBase();
const stats = kb.stats();
console.log(`📊 Knowledge Base: ${stats.totalFacts} facts`);
console.log(`   Domains: ${Object.keys(stats.byDomain ?? {}).join(', ') || 'various'}`);

// Experiment
console.log('\n🧪 Creating experiment...');
const experiment = new Experiment({
  hypothesis: 'Building with cobblestone is 30% faster than stone bricks',
  domain: 'building',
  type: 'a_b',
  variables: { independent: 'block_type', dependent: 'build_time' },
  sampleSize: 10,
});
experiment.start();

for (let i = 0; i < 10; i++) {
  experiment.recordResult('cobblestone', { success: Math.random() > 0.2, duration: 500 + Math.random() * 1000 });
  experiment.recordResult('stone_bricks', { success: Math.random() > 0.4, duration: 700 + Math.random() * 1000 });
}

const analysis = experiment.analyze();
console.log(`   Trials: ${experiment.sampleSize} per condition`);
if (analysis.tTest) {
  console.log(`   t-test p-value: ${analysis.tTest.pValue.toFixed(4)}`);
}

// Meta-learner
const meta = new MetaLearner();
meta.recordOutcome('building', 'cobblestone faster', 0.85);
const rec = meta.recommendDomain();
console.log(`\n🧠 Meta-Learner: recommends "${rec.domain}" — ${rec.reason}`);

// Citation network
const citations = new CitationNetwork();
citations.addCitation('exp-001', 'fact-001', 'builds_on');
const citStats = citations.stats();
console.log(`\n🔗 Citations: ${citStats.nodeCount} nodes, ${citStats.edgeCount} edges`);

console.log('\n✨ Demo complete! Run "npm run demo" for a full discovery cycle.');
