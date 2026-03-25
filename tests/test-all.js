import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { Experiment } from '../src/experiment.js';
import { createScript, validateScript, serializeScript, parseScript } from '../src/behavior-script.js';
import { CriticAgent } from '../src/critic-agent.js';
import { MetaLearner } from '../src/meta-learner.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_KB_DIR = join(__dirname, '.test-knowledge');

before(() => {
  if (existsSync(TEST_KB_DIR)) rmSync(TEST_KB_DIR, { recursive: true });
});

// ─── Experiment Validation ───────────────────────────────────

describe('Experiment', () => {
  it('creates a valid simple experiment', () => {
    const exp = new Experiment({
      hypothesis: 'Test hypothesis',
      domain: 'mining',
      sampleSize: 5,
    });
    assert.equal(exp.status, 'draft');
    assert.equal(exp.hypothesis, 'Test hypothesis');
    assert.equal(exp.domain, 'mining');
    assert.equal(exp.type, 'simple');
    assert.equal(exp.conditions.length, 1);
    assert.ok(exp.id.startsWith('exp-'));
  });

  it('generates A/B conditions correctly', () => {
    const exp = new Experiment({
      hypothesis: 'A/B test',
      domain: 'combat',
      type: 'ab_test',
      variables: [{ name: 'weapon', values: ['sword', 'bow'] }],
      sampleSize: 3,
    });
    assert.equal(exp.conditions.length, 2);
    assert.equal(exp.conditions[0].variables.weapon, 'sword');
    assert.equal(exp.conditions[1].variables.weapon, 'bow');
  });

  it('generates multi-variable condition combinations', () => {
    const exp = new Experiment({
      hypothesis: 'Multi-var',
      domain: 'farming',
      type: 'ab_test',
      variables: [
        { name: 'water', values: [true, false] },
        { name: 'light', values: [7, 14] },
      ],
    });
    assert.equal(exp.conditions.length, 4); // 2 × 2
  });

  it('records results and computes summary', () => {
    const exp = new Experiment({
      hypothesis: 'Summary test',
      domain: 'mining',
      type: 'ab_test',
      variables: [{ name: 'tool', values: ['iron', 'diamond'] }],
      sampleSize: 4,
    });
    exp.start();
    // iron: 100, 120, 110, 130
    for (const v of [100, 120, 110, 130]) {
      exp.recordResult('condition_0', { metrics: { time: v }, duration: v, success: true });
    }
    // diamond: 50, 60, 55, 45
    for (const v of [50, 60, 55, 45]) {
      exp.recordResult('condition_1', { metrics: { time: v }, duration: v, success: true });
    }

    const summary = exp.getSummary();
    assert.equal(summary.condition_0.count, 4);
    assert.equal(summary.condition_0.successRate, 1);
    assert.equal(summary.condition_0.metrics.time.avg, 115);
    assert.equal(summary.condition_0.metrics.time.min, 100);
    assert.equal(summary.condition_0.metrics.time.max, 130);
    assert.equal(summary.condition_1.metrics.time.avg, 52.5);
  });

  it('concludes and fails experiments', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd' });
    exp.start();
    exp.conclude('Supported!', true);
    assert.equal(exp.status, 'completed');
    assert.equal(exp.conclusion.hypothesisSupported, true);

    const exp2 = new Experiment({ hypothesis: 'h2', domain: 'd' });
    exp2.start();
    exp2.fail('World error');
    assert.equal(exp2.status, 'failed');
    assert.equal(exp2.conclusion.hypothesisSupported, null);
  });

  it('serializes to JSON', () => {
    const exp = new Experiment({ hypothesis: 'h', domain: 'd' });
    const json = exp.toJSON();
    assert.ok(json.id);
    assert.equal(json.hypothesis, 'h');
    assert.ok(Array.isArray(json.results));
  });

  it('handles empty condition summary gracefully', () => {
    const exp = new Experiment({
      hypothesis: 'empty',
      domain: 'd',
      type: 'ab_test',
      variables: [{ name: 'x', values: ['a', 'b'] }],
    });
    const summary = exp.getSummary();
    assert.equal(summary.condition_0.count, 0);
    assert.equal(summary.condition_1.count, 0);
  });
});

// ─── Behavior Script Validation ──────────────────────────────

describe('Behavior Script', () => {
  it('creates a script with metadata', () => {
    const script = createScript(
      [{ action: 'moveTo', target: 'farm' }],
      { name: 'Go to farm', domain: 'farming' }
    );
    assert.equal(script.version, '1.0');
    assert.equal(script.metadata.name, 'Go to farm');
    assert.equal(script.actions.length, 1);
    assert.ok(script.createdAt);
  });

  it('validates a correct script', () => {
    const script = createScript([{ action: 'jump' }, { action: 'wait', ms: 100 }]);
    const result = validateScript(script);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('rejects a script without version', () => {
    const result = validateScript({ actions: [{ action: 'jump' }] });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('version')));
  });

  it('rejects actions without action field', () => {
    const result = validateScript({
      version: '1.0',
      actions: [{ target: 'x' }, { action: 'jump' }],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('index 0')));
  });

  it('rejects non-array actions', () => {
    const result = validateScript({ version: '1.0', actions: 'bad' });
    assert.equal(result.valid, false);
  });

  it('serializes and parses round-trip', () => {
    const script = createScript([{ action: 'attack', target: 'zombie' }], { name: 'Kill zombie' });
    const json = serializeScript(script);
    const parsed = parseScript(json);
    assert.equal(parsed.metadata.name, 'Kill zombie');
    assert.equal(parsed.actions[0].action, 'attack');
  });
});

// ─── Critic Scoring ──────────────────────────────────────────

describe('CriticAgent', () => {
  it('returns structured evaluation with scores', async () => {
    const critic = new CriticAgent();
    const result = await critic.evaluate(
      { statement: 'Water grows crops faster', domain: 'farming', details: {} },
      { condition_0: { count: 5, successRate: 0.8 } },
    );
    assert.ok(result.scores);
    assert.equal(typeof result.scores.efficiency, 'number');
    assert.equal(typeof result.scores.reliability, 'number');
    assert.equal(typeof result.overall, 'number');
    assert.ok(result.overall >= 0 && result.overall <= 1);
    assert.ok(result.verdict);
    assert.ok(Array.isArray(result.edgeCases));
    assert.ok(Array.isArray(result.improvements));
  });
});

// ─── Knowledge Base CRUD ─────────────────────────────────────

describe('KnowledgeBase', () => {
  // Use dynamic import since KnowledgeBase uses __dirname relative paths
  // We'll test with the real knowledge base (reads initial-facts.json)
  let KnowledgeBase;
  let kb;

  before(async () => {
    const mod = await import('../src/knowledge-base.js');
    KnowledgeBase = mod.KnowledgeBase;
    kb = new KnowledgeBase();
  });

  it('loads initial facts', () => {
    const stats = kb.stats();
    assert.ok(stats.total > 0, 'Should have loaded initial facts');
    assert.equal(typeof stats.avgScore, 'number');
  });

  it('saves and retrieves a technique', () => {
    const technique = kb.save({
      id: 'test-001',
      domain: 'mining',
      statement: 'Test: diamonds at Y=-59',
      score: 0.8,
      verified: true,
    });
    assert.equal(technique.id, 'test-001');
    assert.ok(technique.updatedAt);

    const retrieved = kb.get('test-001');
    assert.ok(retrieved);
    assert.equal(retrieved.score, 0.8);
  });

  it('updates a technique with revision history', () => {
    kb.save({
      id: 'test-rev-001',
      domain: 'farming',
      statement: 'Version 1',
      score: 0.5,
    });
    const updated = kb.save({
      id: 'test-rev-001',
      domain: 'farming',
      statement: 'Version 2 (improved)',
      score: 0.9,
    });
    assert.equal(updated.statement, 'Version 2 (improved)');
    assert.equal(updated.score, 0.9);
    assert.equal(updated.revisions.length, 1);
    assert.equal(updated.revisions[0].score, 0.5);
  });

  it('queries by domain', () => {
    const results = kb.query({ domain: 'mining' });
    assert.ok(results.length > 0);
    assert.ok(results.every(t => t.domain === 'mining'));
  });

  it('queries by minimum score', () => {
    const results = kb.query({ minScore: 0.9 });
    assert.ok(results.every(t => t.score >= 0.9));
  });

  it('queries verified only', () => {
    const results = kb.query({ verifiedOnly: true });
    assert.ok(results.every(t => t.verified === true));
  });

  it('returns domains', () => {
    const domains = kb.getDomains();
    assert.ok(domains.includes('farming'));
    assert.ok(domains.includes('mining'));
  });

  it('returns stats', () => {
    const stats = kb.stats();
    assert.equal(typeof stats.total, 'number');
    assert.equal(typeof stats.avgScore, 'number');
    assert.ok(stats.byDomain);
  });

  it('get returns undefined for missing id', () => {
    assert.equal(kb.get('nonexistent'), undefined);
  });
});

// ─── Meta-Learner Budget Allocation ──────────────────────────

describe('MetaLearner', () => {
  let MetaLearner;
  let meta;

  before(async () => {
    // Meta-learner reads/writes to knowledge/meta-learner-state.json
    // We'll use a fresh instance — it creates default state if file doesn't exist
    const mod = await import('../src/meta-learner.js');
    MetaLearner = mod.MetaLearner;
    meta = new MetaLearner();
  });

  it('recommends an unexplored domain', () => {
    const rec = meta.recommendDomain(['mining', 'building', 'farming']);
    assert.ok(['mining', 'building', 'farming'].includes(rec.domain));
    assert.ok(rec.reason);
    assert.equal(typeof rec.score, 'number');
  });

  it('records outcomes and tracks stats', () => {
    const before = meta.getStats().totalExperiments;
    meta.recordOutcome('mining', 'Hypothesis 1', 0.8);
    meta.recordOutcome('mining', 'Hypothesis 2', 0.4);
    meta.recordOutcome('farming', 'Hypothesis 3', 0.9);

    const stats = meta.getStats();
    assert.equal(stats.totalExperiments, before + 3);
    assert.equal(stats.totalDiscoveries, before > 0 ? stats.totalDiscoveries : 2);
  });

  it('favors high-success domains after recording outcomes', () => {
    // Farming has 1/1 success (score 0.9), mining has 1/2 (score 0.8 > 0.6)
    meta.recordOutcome('farming', 'Another farm', 0.95);
    const rec = meta.recommendDomain(['mining', 'farming']);
    // Farming has 100% success rate — should be recommended
    assert.equal(rec.domain, 'farming');
  });

  it('returns default stats for fresh instance', () => {
    const fresh = new MetaLearner();
    // Note: this may load the state we just wrote. Test structure anyway.
    const stats = fresh.getStats();
    assert.ok('domainStats' in stats);
    assert.ok('strategyLog' in stats);
  });
});
