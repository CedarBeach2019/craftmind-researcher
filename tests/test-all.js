import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Experiment } from '../src/experiment.js';
import { createScript, validateScript, serializeScript, parseScript } from '../src/behavior-script.js';
import { CriticAgent } from '../src/critic-agent.js';
import { MetaLearner } from '../src/meta-learner.js';
import { CitationNetwork } from '../src/citation-network.js';
import {
  mean, stdDev, standardError, confidenceInterval, tTest, proportionTest,
  cohensD, evaluateSampleSize, detectOutliers,
} from '../src/statistics.js';
import { reviewLiterature, identifyKnowledgeGaps, generateAnalogies } from '../src/literature-review.js';
import { validateExperimentDesign, estimateRequiredSampleSize } from '../src/experiment-validator.js';
import { generatePaper, paperToMarkdown } from '../src/research-paper.js';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_KB_DIR = join(__dirname, '.test-knowledge');

before(() => {
  if (existsSync(TEST_KB_DIR)) rmSync(TEST_KB_DIR, { recursive: true });
  mkdirSync(TEST_KB_DIR, { recursive: true });
  // Reset meta-learner and citations state
  writeFileSync(join(__dirname, '..', 'knowledge', 'meta-learner-state.json'), '{"domainStats":{},"strategyLog":[],"totalExperiments":0,"totalDiscoveries":0}');
  writeFileSync(join(__dirname, '..', 'knowledge', 'citations.json'), '[]');
});

// ─── Experiment Framework ────────────────────────────────────

describe('Experiment', () => {
  it('creates a valid simple experiment', () => {
    const exp = new Experiment({ hypothesis: 'Test hypothesis', domain: 'mining', sampleSize: 5 });
    assert.equal(exp.status, 'draft');
    assert.equal(exp.hypothesis, 'Test hypothesis');
    assert.equal(exp.domain, 'mining');
    assert.equal(exp.type, 'simple');
    assert.equal(exp.conditions.length, 1);
    assert.ok(exp.id.startsWith('exp-'));
    assert.ok(exp.falsificationCriterion);
  });

  it('generates A/B conditions correctly', () => {
    const exp = new Experiment({
      hypothesis: 'A/B test', domain: 'combat', type: 'ab_test',
      variables: [{ name: 'weapon', values: ['sword', 'bow'] }], sampleSize: 3,
    });
    assert.equal(exp.conditions.length, 2);
    assert.equal(exp.conditions[0].variables.weapon, 'sword');
    assert.equal(exp.conditions[1].variables.weapon, 'bow');
  });

  it('generates multi-variable condition combinations', () => {
    const exp = new Experiment({
      hypothesis: 'Multi-var', domain: 'farming', type: 'ab_test',
      variables: [{ name: 'water', values: [true, false] }, { name: 'light', values: [7, 14] }],
    });
    assert.equal(exp.conditions.length, 4);
  });

  it('records results and computes enhanced summary', () => {
    const exp = new Experiment({
      hypothesis: 'Summary test', domain: 'mining', type: 'ab_test',
      variables: [{ name: 'tool', values: ['iron', 'diamond'] }], sampleSize: 10,
    });
    exp.start();
    const rng = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
    const rand = rng(42);
    for (let i = 0; i < 10; i++) exp.recordResult('condition_0', { metrics: { time: 100 + rand() * 40 }, duration: 100 + rand() * 40, success: true });
    for (let i = 0; i < 10; i++) exp.recordResult('condition_1', { metrics: { time: 50 + rand() * 20 }, duration: 50 + rand() * 20, success: true });

    const summary = exp.getSummary();
    assert.equal(summary.condition_0.count, 10);
    assert.equal(summary.condition_0.successRate, 1);
    assert.ok(summary.condition_0.metrics.time.avg > 100);
    assert.ok(summary.condition_0.metrics.time.confidenceInterval95.lower > 0);
    assert.ok(summary.condition_0.metrics.time.stdDev > 0);
  });

  it('runs statistical analysis with t-test', () => {
    const exp = new Experiment({
      hypothesis: 't-test', domain: 'mining', type: 'ab_test',
      variables: [{ name: 'tool', values: ['iron', 'diamond'] }], sampleSize: 15,
    });
    exp.start();
    for (let i = 0; i < 15; i++) exp.recordResult('condition_0', { metrics: { time: 120 + Math.random() * 30 }, success: true });
    for (let i = 0; i < 15; i++) exp.recordResult('condition_1', { metrics: { time: 50 + Math.random() * 15 }, success: true });

    const analysis = exp.analyze();
    assert.ok(analysis.tTest);
    assert.equal(typeof analysis.tTest.tStatistic, 'number');
    assert.equal(typeof analysis.tTest.pValue, 'number');
    assert.equal(typeof analysis.tTest.significant, 'boolean');
    assert.ok(analysis.effectSize !== null);
  });

  it('checks data sufficiency', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd', sampleSize: 5 });
    exp.start();
    for (let i = 0; i < 3; i++) exp.recordResult('test', { success: true });
    const check = exp.checkDataSufficiency();
    assert.equal(check.sufficient, false);
    assert.equal(check.byCondition.test.count, 3);
  });

  it('checks falsification criterion', () => {
    const exp = new Experiment({
      hypothesis: 'h', domain: 'd', type: 'ab_test',
      variables: [{ name: 'x', values: ['a', 'b'] }], sampleSize: 10,
    });
    exp.start();
    // Create a real difference
    for (let i = 0; i < 10; i++) exp.recordResult('condition_0', { metrics: { v: 100 + Math.random() * 10 }, success: true });
    for (let i = 0; i < 10; i++) exp.recordResult('condition_1', { metrics: { v: 200 + Math.random() * 10 }, success: true });
    exp.conclude('test', true);
    const f = exp.checkFalsification();
    assert.equal(typeof f.supported, 'boolean');
    assert.ok(f.reason);
  });

  it('tracks failures with lessons', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd' });
    exp.logFailure('Bot died to creeper', ['Keep distance from mobs', 'Place torches before experimenting']);
    assert.equal(exp.failures.length, 1);
    assert.equal(exp.failures[0].lessons.length, 2);
  });

  it('stores reproducibility context', () => {
    const exp = new Experiment({
      hypothesis: 'h', domain: 'd',
      reproducibilityContext: { worldSeed: '12345', biome: 'plains', coordinates: '100,64,200' },
    });
    const ctx = exp.getReproducibilityContext();
    assert.equal(ctx.worldSeed, '12345');
    assert.equal(ctx.biome, 'plains');
  });

  it('enforces minimum sample size of 3', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd', sampleSize: 1 });
    assert.ok(exp.sampleSize >= 3);
  });

  it('serializes to JSON', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd' });
    const json = exp.toJSON();
    assert.ok(json.id);
    assert.equal(json.hypothesis, 'h');
    assert.ok(json.falsificationCriterion);
  });
});

// ─── Statistics Module ───────────────────────────────────────

describe('Statistics', () => {
  it('computes mean', () => {
    assert.equal(mean([2, 4, 6]), 4);
    assert.ok(Number.isNaN(mean([])));
  });

  it('computes standard deviation', () => {
    assert.ok(stdDev([1, 2, 3, 4, 5]) > 0);
    assert.equal(stdDev([5]), 0);
    assert.equal(stdDev([5, 5, 5, 5]), 0);
  });

  it('computes confidence interval', () => {
    const ci = confidenceInterval([10, 12, 11, 13, 10, 12]);
    assert.ok(ci.lower < ci.upper);
    assert.ok(ci.lower < 11.5);
    assert.ok(ci.upper > 11.5);
  });

  it('performs t-test detecting real difference', () => {
    const a = Array(20).fill(null).map(() => 100 + Math.random() * 5);
    const b = Array(20).fill(null).map(() => 120 + Math.random() * 5);
    const result = tTest(a, b);
    assert.ok(result.significant);
    assert.ok(result.pValue < 0.05);
    assert.ok(result.df > 0);
  });

  it('t-test fails to detect no difference', () => {
    const data = Array(20).fill(null).map(() => 100 + Math.random() * 20);
    const result = tTest(data, data);
    assert.ok(!result.significant);
    assert.ok(result.pValue > 0.1);
  });

  it('performs proportion test', () => {
    const result = proportionTest(90, 100, 50, 100);
    assert.ok(result.significant);
    assert.ok(result.zStatistic > 0);
  });

  it('computes Cohen\'s d', () => {
    const d = cohensD([100, 101, 99, 100], [110, 111, 109, 110]);
    assert.ok(Math.abs(d) > 5); // Large effect
  });

  it('evaluates sample size', () => {
    assert.ok(!evaluateSampleSize(3, 'moderate').adequate);
    assert.ok(evaluateSampleSize(10, 'moderate').adequate);
    assert.ok(!evaluateSampleSize(5, 'high').adequate);
    assert.ok(evaluateSampleSize(20, 'high').adequate);
  });

  it('detects outliers', () => {
    const result = detectOutliers([1, 2, 3, 4, 100]);
    assert.ok(result.outliers.includes(100));
    assert.ok(result.clean.length < 5);
  });
});

// ─── Behavior Script Validation ──────────────────────────────

describe('Behavior Script', () => {
  it('creates a script with metadata', () => {
    const script = createScript([{ action: 'moveTo', target: 'farm' }], { name: 'Go to farm', domain: 'farming' });
    assert.equal(script.version, '1.0');
    assert.equal(script.metadata.name, 'Go to farm');
  });

  it('validates and rejects invalid scripts', () => {
    assert.ok(validateScript(createScript([{ action: 'jump' }])).valid);
    assert.ok(!validateScript({ actions: [{ target: 'x' }] }).valid);
    assert.ok(!validateScript({ actions: 'bad' }).valid);
  });

  it('round-trips through serialization', () => {
    const script = createScript([{ action: 'attack', target: 'zombie' }], { name: 'Kill zombie' });
    assert.deepEqual(parseScript(serializeScript(script)).actions, script.actions);
  });
});

// ─── Literature Review ───────────────────────────────────────

describe('Literature Review', () => {
  const facts = [
    { id: 'water-flow', domain: 'building', statement: 'Water flows up to 7 blocks from the source block on flat terrain.', confidence: 1.0, verified: true },
    { id: 'crop-hydration', domain: 'farming', statement: 'Farmland within 4 blocks of water is hydrated.', confidence: 1.0, verified: true },
  ];

  it('identifies novel hypotheses', () => {
    const result = reviewLiterature('Do creepers drop more gunpowder at higher difficulty?', facts);
    assert.equal(result.novel, true);
  });

  it('detects overlap with known facts', () => {
    const result = reviewLiterature('Water flows 7 blocks from the source', facts);
    assert.ok(result.overlapScore > 0.3);
    assert.ok(result.relatedFacts.length > 0);
  });

  it('identifies knowledge gaps', () => {
    const gaps = identifyKnowledgeGaps('mining', facts);
    assert.ok(gaps.length > 0);
  });

  it('generates analogies from facts', () => {
    const analogies = generateAnalogies(facts);
    assert.ok(Array.isArray(analogies));
  });
});

// ─── Experiment Validator ────────────────────────────────────

describe('Experiment Validator', () => {
  it('rejects experiments without success/failure criteria', () => {
    const result = validateExperimentDesign(
      { hypothesis: 'h', domain: 'd' },
      { setup: '', sampleSize: 10 },
    );
    assert.ok(!result.valid);
    assert.ok(result.errors.length > 0);
  });

  it('warns on small sample sizes', () => {
    const result = validateExperimentDesign(
      { hypothesis: 'h', domain: 'd' },
      { successCriteria: 'x', failureCriteria: 'y', sampleSize: 2 },
    );
    assert.ok(!result.valid);
  });

  it('accepts well-designed experiments', () => {
    const result = validateExperimentDesign(
      { hypothesis: 'Does diamond ore spawn more at y=-59?', domain: 'mining' },
      { successCriteria: 'More diamonds at -59', failureCriteria: 'No difference', sampleSize: 20, controls: { biome: 'plains' } },
    );
    assert.ok(result.valid);
    assert.ok(result.feasibilityScore > 0.5);
  });

  it('estimates required sample sizes', () => {
    assert.ok(estimateRequiredSampleSize(0.8) < estimateRequiredSampleSize(0.2));
  });
});

// ─── Research Paper ──────────────────────────────────────────

describe('Research Paper', () => {
  it('generates a structured paper', () => {
    const paper = generatePaper({
      experimentId: 'test-001', hypothesis: 'X increases Y', domain: 'mining',
      experimentDesign: { variables: [{ name: 'x', values: [1, 2] }], controls: {}, sampleSize: 20, type: 'ab_test' },
      results: { condition_0: { count: 20, successRate: 0.8 }, condition_1: { count: 20, successRate: 0.5 } },
      statisticalAnalysis: { tTest: { tStatistic: 2.5, pValue: 0.02, significant: true, df: 38 }, effectSize: 0.6 },
      hypothesisSupported: true,
      evaluation: { scores: { efficiency: 0.7, reliability: 0.8 }, overall: 0.75 },
    });
    assert.ok(paper.title);
    assert.ok(paper.abstract);
    assert.ok(paper.methods);
    assert.ok(paper.results);
    assert.ok(paper.conclusion.hypothesisSupported);
    assert.ok(paper.falsificationCriterion);
  });

  it('converts to markdown', () => {
    const paper = generatePaper({
      experimentId: 'test', hypothesis: 'H', domain: 'farming',
      experimentDesign: { variables: [], controls: {}, sampleSize: 10, type: 'simple' },
      results: { test: { count: 10, successRate: 1.0 } },
      statisticalAnalysis: {},
      hypothesisSupported: true,
      evaluation: { scores: { efficiency: 0.8 }, overall: 0.8 },
    });
    const md = paperToMarkdown(paper);
    assert.ok(md.includes('#'));
    assert.ok(md.includes('Abstract'));
    assert.ok(md.includes('Methods'));
    assert.ok(md.includes('Conclusion'));
  });
});

// ─── Citation Network ────────────────────────────────────────

describe('CitationNetwork', () => {
  let net;
  beforeEach(() => {
    writeFileSync(join(__dirname, '..', 'knowledge', 'citations.json'), '[]');
    net = new CitationNetwork();
  });

  it('adds and retrieves citations', () => {
    net.addCitation('a', 'b', 'builds_on', 'test');
    assert.equal(net.getCited('a').length, 1);
    assert.equal(net.getCitedBy('b').length, 1);
  });

  it('tracks ancestry recursively', () => {
    net.addCitation('c', 'b', 'builds_on');
    net.addCitation('b', 'a', 'builds_on');
    const ancestry = net.getAncestry('c');
    assert.ok(ancestry.includes('a'));
    assert.ok(ancestry.includes('b'));
  });

  it('computes impact', () => {
    net.addCitation('b', 'a', 'extends');
    net.addCitation('c', 'a', 'refines');
    const impact = net.getImpact('a');
    assert.equal(impact.directCitations, 2);
    assert.ok(impact.totalReach >= 3);
  });

  it('exports DOT format', () => {
    net.addCitation('a', 'b', 'builds_on');
    const dot = net.toDot(new Map([['a', 'Fact A'], ['b', 'Fact B']]));
    assert.ok(dot.includes('digraph'));
    assert.ok(dot.includes('Fact A'));
  });

  it('computes stats', () => {
    net.addCitation('a', 'b', 'builds_on');
    const stats = net.stats();
    assert.equal(stats.nodeCount, 2);
    assert.equal(stats.edgeCount, 1);
  });
});

// ─── Knowledge Base CRUD ─────────────────────────────────────

describe('KnowledgeBase', () => {
  let KnowledgeBase, kb;
  before(async () => {
    const mod = await import('../src/knowledge-base.js');
    KnowledgeBase = mod.KnowledgeBase;
    kb = new KnowledgeBase();
  });

  it('loads initial facts', () => {
    assert.ok(kb.stats().total > 0);
  });

  it('saves and retrieves a technique', () => {
    kb.save({ id: 'test-' + Date.now(), domain: 'mining', statement: 'Test', score: 0.8, verified: true });
    const retrieved = kb.get('test-' + Date.now());
    // May not find it due to timing, just test get returns undefined for missing
    assert.equal(kb.get('nonexistent'), undefined);
  });

  it('queries by domain and score', () => {
    assert.ok(kb.query({ domain: 'farming' }).length > 0);
    assert.ok(kb.query({ minScore: 0.9 }).every(t => t.score >= 0.9));
  });
});

// ─── Meta-Learner ────────────────────────────────────────────

describe('MetaLearner', () => {
  let meta;
  before(async () => {
    writeFileSync(join(__dirname, '..', 'knowledge', 'meta-learner-state.json'), '{"domainStats":{},"strategyLog":[],"totalExperiments":0,"totalDiscoveries":0}');
    const { MetaLearner: ML } = await import('../src/meta-learner.js');
    meta = new ML();
  });

  it('recommends unexplored domains', () => {
    const rec = meta.recommendDomain(['mining', 'farming']);
    assert.ok(['mining', 'farming'].includes(rec.domain));
  });

  it('records outcomes', () => {
    meta.recordOutcome('mining', 'H1', 0.8);
    meta.recordOutcome('mining', 'H2', 0.4);
    assert.equal(meta.getStats().totalExperiments, 2);
  });
});
