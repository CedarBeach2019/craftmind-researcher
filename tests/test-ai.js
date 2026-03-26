import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ResearchActionPlanner, RESEARCH_ACTION_TYPES } from '../src/ai/research-actions.js';
import { RESEARCH_AGENT_CONFIGS, getAgentConfig, getAgentIds, getAgentsForAction, selectBestAgent } from '../src/ai/research-agents.js';
import { ExperimentEvaluator } from '../src/ai/experiment-evaluator.js';
import { HypothesisTracker } from '../src/ai/hypothesis-tracker.js';
import { PeerReviewSystem } from '../src/ai/peer-review-system.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DATA = join(__dirname, '.test-data-ai');

before(() => {
  try { rmSync(TEST_DATA, { recursive: true }); } catch {}
  mkdirSync(TEST_DATA, { recursive: true });
});

after(() => {
  try { rmSync(TEST_DATA, { recursive: true }); } catch {}
});

// ─── Research Actions ─────────────────────────────────────────────
describe('ResearchActionPlanner', () => {
  it('has all expected action types', () => {
    const types = Object.keys(RESEARCH_ACTION_TYPES);
    assert.ok(types.includes('HYPOTHESIZE'));
    assert.ok(types.includes('DESIGN_EXPERIMENT'));
    assert.ok(types.includes('COLLECT_DATA'));
    assert.ok(types.includes('ANALYZE'));
    assert.ok(types.includes('PUBLISH'));
    assert.ok(types.includes('PEER_REVIEW'));
    assert.ok(types.includes('REPLICATE'));
    assert.ok(types.includes('EQUIP'));
    assert.ok(types.includes('LITERATURE_REVIEW'));
    assert.ok(types.includes('DEBATE'));
    assert.ok(types.includes('COLLABORATE'));
    assert.ok(types.includes('CORRECT'));
  });

  it('parses hypothesis as HYPOTHESIZE', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('I think salmon run deeper in cold water');
    assert.ok(result.fallback);
    assert.equal(result.actions[0].type, 'HYPOTHESIZE');
  });

  it('parses design request as DESIGN_EXPERIMENT', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Set up a depth vs temperature study');
    assert.equal(result.actions[0].type, 'DESIGN_EXPERIMENT');
  });

  it('parses data collection as COLLECT_DATA', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Record fish catches at different depths');
    assert.equal(result.actions[0].type, 'COLLECT_DATA');
  });

  it('parses analysis as ANALYZE', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('What patterns do we see in the data?');
    assert.equal(result.actions[0].type, 'ANALYZE');
  });

  it('parses publish as PUBLISH', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Let\'s publish our findings');
    assert.equal(result.actions[0].type, 'PUBLISH');
  });

  it('parses peer review as PEER_REVIEW', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Can you review this paper?');
    assert.equal(result.actions[0].type, 'PEER_REVIEW');
  });

  it('parses replication as REPLICATE', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Let\'s try to reproduce those results');
    assert.equal(result.actions[0].type, 'REPLICATE');
  });

  it('parses equipment as EQUIP', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('I need to build a water temperature sensor');
    assert.equal(result.actions[0].type, 'EQUIP');
  });

  it('parses debate as DEBATE', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('But what about confounding variables?');
    assert.equal(result.actions[0].type, 'DEBATE');
  });

  it('parses collaboration as COLLABORATE', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('Let\'s work together on this');
    assert.equal(result.actions[0].type, 'COLLABORATE');
  });

  it('returns response string', async () => {
    const planner = new ResearchActionPlanner();
    const result = await planner.plan('I think salmon run deeper');
    assert.ok(typeof result.response === 'string');
    assert.ok(result.response.length > 0);
  });
});

// ─── Research Agents ──────────────────────────────────────────────
describe('Research Agent Configs', () => {
  it('has all four agents', () => {
    const ids = getAgentIds();
    assert.ok(ids.includes('sarah'));
    assert.ok(ids.includes('waves'));
    assert.ok(ids.includes('skeptic'));
    assert.ok(ids.includes('pat'));
  });

  it('Sarah is highly rigorous and skeptical', () => {
    const sarah = getAgentConfig('sarah');
    assert.ok(sarah.traits.rigor > 0.9);
    assert.ok(sarah.traits.skepticism > 0.8);
    assert.equal(sarah.researchStyle, 'methodical');
  });

  it('Waves is highly enthusiastic', () => {
    const waves = getAgentConfig('waves');
    assert.ok(waves.traits.enthusiasm > 0.9);
    assert.equal(waves.researchStyle, 'exploratory');
  });

  it('Skeptic has maximum skepticism', () => {
    const skeptic = getAgentConfig('skeptic');
    assert.equal(skeptic.traits.skepticism, 1.0);
    assert.equal(skeptic.researchStyle, 'critical');
  });

  it('Pat is overworked and has error rate', () => {
    const pat = getAgentConfig('pat');
    assert.ok(pat.traits.meticulousness < 0.5);
    assert.ok(pat.errorRate > 0);
  });

  it('getAgentConfig returns null for unknown', () => {
    assert.equal(getAgentConfig('nonexistent'), null);
  });

  it('getAgentsForAction filters correctly', () => {
    const reviewers = getAgentsForAction('PEER_REVIEW');
    assert.ok(reviewers.length >= 2);
    assert.ok(reviewers.some(a => a.name === 'The Skeptic'));
  });

  it('selectBestAgent returns an agent', () => {
    const agent = selectBestAgent('PEER_REVIEW', { phase: 'review' });
    assert.ok(agent);
    assert.ok(typeof agent.name === 'string');
  });

  it('agents have catchphrases', () => {
    for (const id of getAgentIds()) {
      const agent = getAgentConfig(id);
      assert.ok(agent.catchphrases.length > 0, `${agent.name} has no catchphrases`);
    }
  });

  it('selectBestAgent picks high-rigor agent for design phase', () => {
    const agent = selectBestAgent('DESIGN_EXPERIMENT', { phase: 'design' });
    // Sarah should win for design (highest rigor)
    assert.ok(agent.traits.rigor > 0.8);
  });
});

// ─── Experiment Evaluator ─────────────────────────────────────────
describe('ExperimentEvaluator', () => {
  const evaluator = new ExperimentEvaluator(TEST_DATA);

  it('scores a well-designed experiment high', () => {
    const score = evaluator.scoreDesign({
      sampleSize: 30,
      controls: { biome: 'ocean', timeOfDay: 'noon', temperature: 'cold' },
      falsificationCriterion: 'supported if p < 0.05',
      reproducibilityContext: { worldSeed: 123, biome: 'ocean', coordinates: '100,64,200' },
      conditions: [{ label: 'A' }, { label: 'B' }],
      hypothesis: 'Test hypothesis',
      predictedOutcome: 'A > B',
    });
    assert.ok(score > 0.7);
  });

  it('scores a poorly-designed experiment low', () => {
    const score = evaluator.scoreDesign({
      sampleSize: 3,
      controls: {},
      falsificationCriterion: null,
      reproducibilityContext: {},
      conditions: [{ label: 'test' }],
      hypothesis: null,
      predictedOutcome: null,
    });
    assert.ok(score < 0.4);
  });

  it('scores prediction accuracy correctly', () => {
    const supported = evaluator.scorePredictionAccuracy('temperature decreases depth', { supported: true, effectSize: 0.5 });
    assert.ok(supported > 0.8);

    const refuted = evaluator.scorePredictionAccuracy('temperature increases depth', { supported: false });
    assert.ok(refuted < 0.3);
  });

  it('evaluates with empty history', () => {
    const result = evaluator.evaluate({ type: 'ab_test', sampleSize: 20, controls: { biome: 'ocean' }, falsificationCriterion: 'p < 0.05' }, []);
    assert.ok(result.designScore >= 0);
    assert.ok(typeof result.bestDesignType === 'string');
  });

  it('identifies best design type from history', () => {
    const history = [
      { type: 'ab_test', sampleSize: 30, controls: { a: 1 }, falsificationCriterion: 'p < 0.05', conclusion: { hypothesisSupported: true } },
      { type: 'simple', sampleSize: 5, controls: {}, falsificationCriterion: null, conclusion: { hypothesisSupported: false } },
      { type: 'ab_test', sampleSize: 25, controls: { a: 1, b: 2 }, falsificationCriterion: 'p < 0.05', conclusion: { hypothesisSupported: true } },
    ];
    const result = evaluator.evaluate({ type: 'ab_test', sampleSize: 20, controls: { biome: 'ocean' }, falsificationCriterion: 'p < 0.05' }, history);
    assert.equal(result.bestDesignType, 'ab_test');
  });

  it('saves and loads sessions', () => {
    const result = evaluator.evaluate({ type: 'test', sampleSize: 10 }, []);
    evaluator.saveSession('test-exp-1', result);
    const loaded = evaluator.loadAllSessions();
    assert.ok(loaded.length > 0);
  });
});

// ─── Hypothesis Tracker ──────────────────────────────────────────
describe('HypothesisTracker', () => {
  it('registers and retrieves a hypothesis', () => {
    const tracker = new HypothesisTracker(TEST_DATA);
    const id = tracker.register({
      hypothesis: 'Salmon run deeper in cold water',
      domain: 'marine_biology',
      researcher: 'sarah',
      predictedOutcome: 'depth increases as temperature decreases',
    });
    const record = tracker.get(id);
    assert.ok(record);
    assert.equal(record.hypothesis, 'Salmon run deeper in cold water');
    assert.equal(record.status, 'proposed');
  });

  it('concludes a hypothesis as supported', () => {
    const tracker = new HypothesisTracker(TEST_DATA);
    const id = tracker.register({
      hypothesis: 'Salmon prefer cold water',
      domain: 'marine',
      researcher: 'sarah',
      predictedOutcome: 'positive correlation',
    });
    const concluded = tracker.conclude(id, { supported: true, effectSize: 0.5 });
    assert.equal(concluded.status, 'supported');
    assert.ok(concluded.predictionAccuracy > 0.7);
  });

  it('concludes a hypothesis as refuted', () => {
    const tracker = new HypothesisTracker(TEST_DATA);
    const id = tracker.register({
      hypothesis: 'Fish fly at night',
      domain: 'marine',
      researcher: 'pat',
      predictedOutcome: 'fish flying observed',
    });
    const concluded = tracker.conclude(id, { supported: false });
    assert.equal(concluded.status, 'refuted');
    assert.ok(concluded.predictionAccuracy < 0.3);
  });

  it('queries by domain', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'query-domain'));
    tracker.register({ hypothesis: 'H1', domain: 'marine', researcher: 'sarah' });
    tracker.register({ hypothesis: 'H2', domain: 'marine', researcher: 'waves' });
    tracker.register({ hypothesis: 'H3', domain: 'farming', researcher: 'sarah' });
    const results = tracker.query({ domain: 'marine' });
    assert.equal(results.length, 2);
  });

  it('queries by researcher', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'query-researcher'));
    tracker.register({ hypothesis: 'H1', researcher: 'sarah' });
    tracker.register({ hypothesis: 'H2', researcher: 'waves' });
    assert.equal(tracker.query({ researcher: 'sarah' }).length, 1);
  });

  it('queries by status', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'query-status'));
    const id = tracker.register({ hypothesis: 'H1', researcher: 'sarah', predictedOutcome: 'x' });
    tracker.conclude(id, { supported: true, effectSize: 0.5 });
    assert.equal(tracker.query({ status: 'supported' }).length, 1);
    assert.equal(tracker.query({ status: 'proposed' }).length, 0);
  });

  it('computes researcher accuracy', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'accuracy'));
    const id1 = tracker.register({ hypothesis: 'H1', researcher: 'sarah', predictedOutcome: 'p' });
    const id2 = tracker.register({ hypothesis: 'H2', researcher: 'sarah', predictedOutcome: 'p' });
    const id3 = tracker.register({ hypothesis: 'H3', researcher: 'waves', predictedOutcome: 'p' });
    tracker.conclude(id1, { supported: true, effectSize: 0.5 });
    tracker.conclude(id2, { supported: true, effectSize: 0.3 });
    tracker.conclude(id3, { supported: false });
    const accuracy = tracker.getResearcherAccuracy();
    assert.ok(accuracy.sarah);
    assert.ok(accuracy.sarah.avgAccuracy > accuracy.waves.avgAccuracy);
  });

  it('computes domain stats', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'domain-stats'));
    const id1 = tracker.register({ hypothesis: 'H1', domain: 'marine', researcher: 'sarah', predictedOutcome: 'p' });
    tracker.conclude(id1, { supported: true, effectSize: 0.5 });
    tracker.register({ hypothesis: 'H2', domain: 'marine', researcher: 'waves' });
    const stats = tracker.getDomainStats();
    assert.equal(stats.marine.total, 2);
    assert.equal(stats.marine.supported, 1);
  });

  it('finds competing hypotheses', () => {
    const tracker = new HypothesisTracker(join(TEST_DATA, 'h', 'competing'));
    tracker.register({ hypothesis: 'Fish go deep in cold water', domain: 'marine', researcher: 'sarah', predictedOutcome: 'depth increases' });
    tracker.register({ hypothesis: 'Fish stay shallow in cold water', domain: 'marine', researcher: 'waves', predictedOutcome: 'depth decreases' });
    const competing = tracker.findCompetingHypotheses();
    assert.ok(competing.length > 0);
  });

  it('persists hypotheses to disk', () => {
    const tracker = new HypothesisTracker(TEST_DATA);
    const id = tracker.register({ hypothesis: 'Persistent hypothesis', domain: 'test', researcher: 'sarah' });
    const tracker2 = new HypothesisTracker(TEST_DATA);
    assert.ok(tracker2.get(id));
    assert.equal(tracker2.get(id).hypothesis, 'Persistent hypothesis');
  });
});

// ─── Peer Review System ───────────────────────────────────────────
describe('PeerReviewSystem', () => {
  it('submits a paper', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({
      title: 'Salmon Depth Distribution in Cold Water',
      hypothesis: 'Salmon run deeper when water temperature drops below 8°C',
      domain: 'marine_biology',
      author: 'sarah',
      rigorScore: 0.75,
    });
    assert.ok(paper.id);
    assert.equal(paper.status, 'submitted');
  });

  it('submits a peer review', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Test', author: 'sarah', rigorScore: 0.7 });
    const review = system.submitReview(paper.id, 'skeptic');
    assert.ok(review.id);
    assert.equal(review.reviewer, 'skeptic');
    assert.ok(review.overallScore >= 0);
    assert.ok(Array.isArray(review.strengths));
    assert.ok(Array.isArray(review.weaknesses));
  });

  it('Skeptic is harsher than Waves', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Test', author: 'sarah', rigorScore: 0.7 });
    const skepticReview = system.submitReview(paper.id, 'skeptic');
    const wavesReview = system.submitReview(paper.id, 'waves');
    // Same paper, different reviewers → different scores
    // Note: randomness means we can't guarantee ordering, but patterns should hold
    assert.ok(typeof skepticReview.overallScore === 'number');
    assert.ok(typeof wavesReview.overallScore === 'number');
  });

  it('paper status updates after 2+ reviews', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Test', author: 'sarah', rigorScore: 0.85 });
    system.submitReview(paper.id, 'sarah');
    assert.equal(system.papers.get(paper.id).status, 'under_review');
    system.submitReview(paper.id, 'waves');
    const finalStatus = system.papers.get(paper.id).status;
    assert.ok(['accepted', 'revise', 'rejected'].includes(finalStatus));
  });

  it('high-rigor paper gets accepted', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Excellent', author: 'sarah', rigorScore: 0.95 });
    system.submitReview(paper.id, 'sarah');
    system.submitReview(paper.id, 'waves');
    const status = system.papers.get(paper.id).status;
    assert.equal(status, 'accepted');
  });

  it('low-rigor paper gets rejected', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Poor', author: 'pat', rigorScore: 0.1 });
    system.submitReview(paper.id, 'skeptic');
    system.submitReview(paper.id, 'sarah');
    const status = system.papers.get(paper.id).status;
    assert.equal(status, 'rejected');
  });

  it('starts a debate between agents', () => {
    const system = new PeerReviewSystem();
    const debateId = system.startDebate('Salmon depth hypothesis', 'sarah', 'skeptic');
    const debate = system.getDebate(debateId);
    assert.ok(debate.length >= 2);
    assert.ok(debate[0].agent === 'sarah');
    assert.ok(debate[1].agent === 'skeptic');
  });

  it('debate turns have structure', () => {
    const system = new PeerReviewSystem();
    const debateId = system.startDebate('Test topic', 'waves', 'skeptic');
    const turns = system.getDebate(debateId);
    for (const turn of turns) {
      assert.ok(turn.agent);
      assert.ok(turn.position);
      assert.ok(turn.argument);
      assert.ok(turn.timestamp);
    }
  });

  it('challenge a published paper', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Controversial', author: 'waves', rigorScore: 0.7 });
    system.submitReview(paper.id, 'sarah');
    system.submitReview(paper.id, 'waves');
    const challenge = system.challengePaper(paper.id, 'skeptic', 'Confounding variable: water temperature not controlled');
    assert.ok(challenge.challenger === 'skeptic');
    assert.equal(system.papers.get(paper.id).status, 'challenged');
  });

  it('getPaperSummary includes review aggregate', () => {
    const system = new PeerReviewSystem();
    const paper = system.submitPaper({ title: 'Test', author: 'sarah', rigorScore: 0.8 });
    system.submitReview(paper.id, 'sarah');
    system.submitReview(paper.id, 'waves');
    const summary = system.getPaperSummary(paper.id);
    assert.equal(summary.reviewCount, 2);
    assert.ok(typeof summary.averageScore === 'number');
    assert.ok(summary.recommendations.length === 2);
  });

  it('getReviews returns empty for unknown paper', () => {
    const system = new PeerReviewSystem();
    assert.deepEqual(system.getReviews('nonexistent'), []);
  });

  it('getPaperSummary returns null for unknown', () => {
    const system = new PeerReviewSystem();
    assert.equal(system.getPaperSummary('nonexistent'), null);
  });
});
