import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeBase } from '../src/knowledge-base.js';
import { Experiment } from '../src/experiment.js';
import { CriticAgent } from '../src/critic-agent.js';
import { TeacherAgent } from '../src/teacher-agent.js';
import { DistillerAgent } from '../src/distiller-agent.js';
import { MetaLearner } from '../src/meta-learner.js';
import { CitationNetwork } from '../src/citation-network.js';
import { validateExperimentDesign, estimateRequiredSampleSize } from '../src/experiment-validator.js';
import { tTest, confidenceInterval, cohensD } from '../src/statistics.js';
import { generatePaper, paperToMarkdown } from '../src/research-paper.js';

describe('KnowledgeBase', () => {
  it('saves and retrieves techniques', () => {
    const kb = new KnowledgeBase();
    const technique = kb.save({
      id: 't1', domain: 'farming', statement: 'Wheat grows faster near water',
      score: 0.85, verified: true,
    });
    assert.equal(technique.id, 't1');
    assert.ok(kb.get('t1'));
  });

  it('queries by domain', () => {
    const kb = new KnowledgeBase();
    kb.save({ id: 't1', domain: 'farming', statement: 'test', score: 0.8 });
    const results = kb.query('farming');
    assert.ok(results.length >= 1);
  });

  it('reports stats', () => {
    const kb = new KnowledgeBase();
    kb.save({ id: 't1', domain: 'farming', statement: 'test', score: 0.8 });
    const stats = kb.stats();
    assert.ok(stats.total >= 1);
  });
});

describe('Experiment', () => {
  it('creates experiment and records results', () => {
    const exp = new Experiment({
      hypothesis: 'Water increases crop growth',
      domain: 'farming',
      type: 'ab_test',
      variables: [{ name: 'water_proximity', values: ['near', 'far'] }],
      sampleSize: 10,
    });
    assert.equal(exp.status, 'draft');
    exp.start();
    assert.equal(exp.status, 'running');
    for (let i = 0; i < 10; i++) {
      exp.recordResult('condition_0', { success: Math.random() > 0.2, duration: 500, metrics: { growth: 5 + Math.random() * 3 } });
      exp.recordResult('condition_1', { success: Math.random() > 0.5, duration: 800, metrics: { growth: 2 + Math.random() * 2 } });
    }
    const summary = exp.getSummary();
    assert.ok(summary.condition_0);
    assert.ok(summary.condition_1);
  });

  it('analyzes results statistically', () => {
    const exp = new Experiment({
      hypothesis: 'test', domain: 'test', sampleSize: 10,
      type: 'ab_test', variables: [{ name: 'x', values: ['a', 'b'] }],
    });
    exp.start();
    for (let i = 0; i < 10; i++) {
      exp.recordResult('condition_0', { success: true, duration: 100, metrics: { val: 1 + Math.random() } });
      exp.recordResult('condition_1', { success: true, duration: 200, metrics: { val: 3 + Math.random() } });
    }
    const analysis = exp.analyze();
    assert.ok(analysis);
  });
});

describe('CriticAgent', () => {
  it('evaluates a technique', async () => {
    const critic = new CriticAgent();
    const result = await critic.evaluate(
      { statement: 'Water helps crops grow', domain: 'farming' },
      { control: { count: 10, successRate: 0.5 }, treatment: { count: 10, successRate: 0.8 } },
    );
    assert.ok(typeof result.overall === 'number');
    assert.ok(result.verdict);
  });
});

describe('TeacherAgent', () => {
  it('creates a behavior script', async () => {
    const teacher = new TeacherAgent();
    const script = await teacher.createScript({
      id: 's1', statement: 'Place water near crops', domain: 'farming',
      details: { control: { successRate: 0.5 }, treatment: { successRate: 0.8 } },
    });
    assert.ok(script.actions.length >= 1);
  });
});

describe('DistillerAgent', () => {
  it('distills a behavior script', async () => {
    const distiller = new DistillerAgent();
    const script = { id: 's1', actions: [{ type: 'place_block', target: 'water' }, { type: 'wait', duration: 100 }] };
    const distilled = await distiller.distill(script, { domain: 'farming', conclusion: { text: 'Water works' } });
    assert.ok(distilled.actions.length >= 1);
  });
});

describe('MetaLearner', () => {
  it('records outcomes and recommends domains', () => {
    const ml = new MetaLearner();
    ml.recordOutcome('farming', 'water helps', 0.85);
    ml.recordOutcome('mining', 'depth matters', 0.6);
    const stats = ml.getStats();
    assert.ok(stats.totalExperiments >= 2, 'should track experiments');
    const rec = ml.recommendDomain();
    assert.ok(rec.domain, 'should recommend a domain');
  });
});

describe('CitationNetwork', () => {
  it('adds and tracks citations', () => {
    const cn = new CitationNetwork();
    cn.addCitation('paper1', 'paper0', 'builds_on', 'Built on prior work');
    const stats = cn.stats();
    assert.ok(stats.nodeCount >= 2);
    assert.ok(stats.edgeCount >= 1);
  });
});

describe('Experiment Validator', () => {
  it('validates experiment design', () => {
    const result = validateExperimentDesign(
      { hypothesis: 'test', domain: 'farming' },
      { successCriteria: 'higher yield', failureCriteria: 'no difference', sampleSize: 30 },
    );
    assert.ok(typeof result.valid === 'boolean');
  });

  it('estimates required sample size', () => {
    const n = estimateRequiredSampleSize(0.5, 0.3, 0.05, 0.8);
    assert.ok(n > 0);
  });
});

describe('Statistics', () => {
  it('runs t-test on two samples', () => {
    const result = tTest([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
    assert.ok(typeof result.tStatistic === 'number');
    assert.ok(typeof result.pValue === 'number');
  });

  it('calculates confidence interval', () => {
    const ci = confidenceInterval([1, 2, 3, 4, 5], 0.95);
    assert.ok(ci.lower < ci.upper);
  });

  it('calculates Cohen\'s d effect size', () => {
    const d = cohensD([1, 2, 3], [4, 5, 6]);
    assert.ok(typeof d === 'number');
  });
});

describe('Research Paper', () => {
  it('generates a paper from experiment data', () => {
    const paper = generatePaper({
      experimentId: 'e1', hypothesis: 'Water helps', domain: 'farming',
      experimentDesign: { variables: [], sampleSize: 10 },
      results: { control: { count: 10, successRate: 0.5 }, treatment: { count: 10, successRate: 0.8 } },
      statisticalAnalysis: {},
      hypothesisSupported: true,
      evaluation: { overall: 0.8, verdict: 'promising' },
    });
    assert.ok(paper.title);
    assert.ok(paper.abstract);
  });

  it('converts paper to markdown', () => {
    const paper = generatePaper({
      experimentId: 'e1', hypothesis: 'test', domain: 'test',
      experimentDesign: { variables: [], sampleSize: 5 },
      results: {}, statisticalAnalysis: {},
      hypothesisSupported: true, evaluation: { overall: 0.7, verdict: 'ok' },
    });
    const md = paperToMarkdown(paper);
    assert.ok(md.includes('# '));
  });
});
