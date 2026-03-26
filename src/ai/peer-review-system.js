/**
 * @module craftmind-researcher/ai/peer-review-system
 * @description Peer review and scientific debate system. Multiple agents review papers,
 * debate findings, and collaborate or compete. Enables emergent research dynamics.
 */

import { randomUUID } from 'node:crypto';

/**
 * @typedef {object} Paper
 * @property {string} id
 * @property {string} title
 * @property {string} hypothesis
 * @property {string} domain
 * @property {string} author - agent who wrote it
 * @property {object} findings - summary statistics
 * @property {string} conclusion
 * @property {number} rigorScore - overall experimental rigor 0-1
 * @property {string[]} references - cited paper IDs
 * @property {string} submittedAt
 * @property {string} status - 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'revised' | 'challenged'
 */

/**
 * @typedef {object} Review
 * @property {string} id
 * @property {string} paperId
 * @property {string} reviewer - agent ID who reviewed
 * @property {string} recommendation - 'accept' | 'reject' | 'revise' | 'major_revisions'
 * @property {number} overallScore - 0-1
 * @property {object} scores - { methodology, analysis, significance, clarity, originality }
 * @property {string[]} strengths
 * @property {string[]} weaknesses
 * @property {string[]} questions
 * @property {string} reviewedAt
 */

/**
 * @typedef {object} DebateTurn
 * @property {string} agent - agent ID
 * @property {string} position - their stance
 * @property {string} argument
 * @property {string} evidence
 * @property {string} timestamp
 */

export class PeerReviewSystem {
  constructor() {
    this.papers = new Map();
    this.reviews = new Map(); // paperId -> Review[]
    this.debates = new Map(); // debateId -> DebateTurn[]
    this.challenges = new Map(); // paperId -> challenge records
  }

  /**
   * Submit a paper for peer review.
   * @param {object} paperData
   * @returns {Paper}
   */
  submitPaper(paperData) {
    const paper = {
      id: paperData.id || `paper-${randomUUID().slice(0, 8)}`,
      title: paperData.title || 'Untitled',
      hypothesis: paperData.hypothesis,
      domain: paperData.domain || 'general',
      author: paperData.author || 'unknown',
      findings: paperData.findings || {},
      conclusion: paperData.conclusion || '',
      rigorScore: paperData.rigorScore ?? 0.5,
      references: paperData.references || [],
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    };
    this.papers.set(paper.id, paper);
    this.reviews.set(paper.id, []);
    return paper;
  }

  /**
   * Submit a peer review for a paper.
   * Generates review based on reviewer agent's personality.
   * @param {string} paperId
   * @param {string} reviewerAgentId - agent config key (sarah, waves, skeptic, pat)
   * @param {object} [overrideScores]
   * @returns {Review}
   */
  submitReview(paperId, reviewerAgentId, overrideScores = null) {
    const paper = this.papers.get(paperId);
    if (!paper) throw new Error(`Paper not found: ${paperId}`);

    const scores = overrideScores || this._generateReviewScores(paper, reviewerAgentId);
    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

    const recommendation = this._determineRecommendation(overallScore, reviewerAgentId);
    const feedback = this._generateFeedback(paper, reviewerAgentId, scores);

    const review = {
      id: `review-${randomUUID().slice(0, 8)}`,
      paperId,
      reviewer: reviewerAgentId,
      recommendation,
      overallScore,
      scores,
      strengths: feedback.strengths,
      weaknesses: feedback.weaknesses,
      questions: feedback.questions,
      reviewedAt: new Date().toISOString(),
    };

    this.reviews.get(paperId).push(review);

    // Update paper status based on reviews
    this._updatePaperStatus(paperId);

    return review;
  }

  /**
   * Generate review scores based on paper quality and reviewer personality.
   */
  _generateReviewScores(paper, reviewerId) {
    const base = paper.rigorScore;

    // Personality modifiers
    const modifiers = {
      sarah: { methodology: 1.0, analysis: 1.1, significance: 0.9, clarity: 0.8, originality: 0.9 },
      waves: { methodology: 0.8, analysis: 1.1, significance: 1.2, clarity: 0.9, originality: 1.1 },
      skeptic: { methodology: 1.1, analysis: 1.2, significance: 0.7, clarity: 0.8, originality: 0.6 },
      pat: { methodology: 0.9, analysis: 0.8, significance: 1.0, clarity: 1.1, originality: 1.0 },
    };

    const mod = modifiers[reviewerId] || modifiers.sarah;
    const noise = () => (Math.random() - 0.5) * 0.1;

    return {
      methodology: Math.min(1, Math.max(0, base * mod.methodology + noise())),
      analysis: Math.min(1, Math.max(0, base * mod.analysis + noise())),
      significance: Math.min(1, Math.max(0, base * mod.significance + noise())),
      clarity: Math.min(1, Math.max(0, base * mod.clarity + noise())),
      originality: Math.min(1, Math.max(0, base * mod.originality + noise())),
    };
  }

  _determineRecommendation(overallScore, reviewerId) {
    if (reviewerId === 'skeptic') {
      // Skeptic is harsher
      if (overallScore >= 0.85) return 'accept';
      if (overallScore >= 0.65) return 'revise';
      return 'major_revisions';
    }
    if (reviewerId === 'waves') {
      // Waves is more encouraging
      if (overallScore >= 0.6) return 'accept';
      if (overallScore >= 0.4) return 'revise';
      return 'major_revisions';
    }
    if (overallScore >= 0.75) return 'accept';
    if (overallScore >= 0.5) return 'revise';
    return 'major_revisions';
  }

  _generateFeedback(paper, reviewerId, scores) {
    const agentFeedback = {
      sarah: {
        strengths: ['Clear hypothesis statement', 'Appropriate experimental design'],
        weaknesses: ['Sample size could be larger', 'Control variables need more documentation'],
        questions: ['What was the power analysis for this sample size?', 'Were there any outlier trials?'],
      },
      waves: {
        strengths: ['Fascinating findings!', 'Beautiful data presentation', 'Creative approach'],
        weaknesses: ['Could explore more follow-up questions', 'Domain could be broader'],
        questions: ['What would happen under different conditions?', 'How does this connect to ocean currents?'],
      },
      skeptic: {
        strengths: ['At least they tried'],
        weaknesses: ['Confounding variables not adequately controlled', 'Results could be due to chance', 'Need replication'],
        questions: ['What about alternative hypothesis X?', 'How do you rule out noise?', 'Where is the replication?'],
      },
      pat: {
        strengths: ['I think I understand what they did', 'Results look reasonable'],
        weaknesses: ['I\'m not sure I follow the analysis', 'Maybe I\'m missing something'],
        questions: ['How did you handle the data cleaning?', 'Is this the right statistical test?'],
      },
    };

    return agentFeedback[reviewerId] || agentFeedback.sarah;
  }

  _updatePaperStatus(paperId) {
    const reviews = this.reviews.get(paperId) || [];
    if (reviews.length < 2) {
      this.papers.get(paperId).status = 'under_review';
      return;
    }

    const avgScore = reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length;
    const accepts = reviews.filter(r => r.recommendation === 'accept').length;

    if (avgScore >= 0.7 && accepts >= Math.ceil(reviews.length / 2)) {
      this.papers.get(paperId).status = 'accepted';
    } else if (avgScore < 0.4) {
      this.papers.get(paperId).status = 'rejected';
    } else {
      this.papers.get(paperId).status = 'revise';
    }
  }

  /**
   * Start a scientific debate between two agents about a topic.
   * @param {string} topic
   * @param {string} agentA - agent ID
   * @param {string} agentB - agent ID
   * @param {string} paperId - the paper being debated (optional)
   * @returns {string} debate ID
   */
  startDebate(topic, agentA, agentB, paperId = null) {
    const debateId = `debate-${randomUUID().slice(0, 8)}`;
    this.debates.set(debateId, []);

    // Opening positions
    const posA = this._generatePosition(agentA, topic, 'for');
    const posB = this._generatePosition(agentB, topic, 'against');

    this._addDebateTurn(debateId, agentA, posA.position, posA.argument);
    this._addDebateTurn(debateId, agentB, posB.position, posB.argument);

    return debateId;
  }

  _addDebateTurn(debateId, agent, position, argument) {
    if (!this.debates.has(debateId)) this.debates.set(debateId, []);
    this.debates.get(debateId).push({
      agent,
      position,
      argument,
      evidence: '',
      timestamp: new Date().toISOString(),
    });
  }

  _generatePosition(agentId, topic, stance) {
    const positions = {
      sarah: {
        for: { position: 'cautious_support', argument: 'The methodology is reasonable, but I\'d want to see replication before drawing strong conclusions.' },
        against: { position: 'methodological_concern', argument: 'I have concerns about the experimental design that make me question these findings.' },
      },
      waves: {
        for: { position: 'enthusiastic_support', argument: 'This is EXACTLY the kind of thing we should be looking at! The data is really promising!' },
        against: { position: 'surprised_skepticism', argument: 'That doesn\'t match what I\'ve seen in the ocean data. Are you sure about this?' },
      },
      skeptic: {
        for: { position: 'reluctant_acknowledgment', argument: 'I suppose there might be something here... but I remain unconvinced without further evidence.' },
        against: { position: 'firm_opposition', argument: 'This is premature. The evidence simply doesn\'t support this conclusion.' },
      },
      pat: {
        for: { position: 'tentative_support', argument: 'I think this is interesting? I mean, the results kind of make sense to me...' },
        against: { position: 'confused_questioning', argument: 'Wait, I thought we established something different? Maybe I misunderstood?' },
      },
    };

    return (positions[agentId] || positions.sarah)[stance] || { position: stance, argument: `I have thoughts on ${topic}.` };
  }

  /**
   * Get all reviews for a paper.
   */
  getReviews(paperId) {
    return this.reviews.get(paperId) || [];
  }

  /**
   * Get a paper's current status and aggregate review scores.
   */
  getPaperSummary(paperId) {
    const paper = this.papers.get(paperId);
    const reviews = this.reviews.get(paperId) || [];
    if (!paper) return null;

    const avgScores = { methodology: 0, analysis: 0, significance: 0, clarity: 0, originality: 0 };
    for (const r of reviews) {
      for (const key of Object.keys(avgScores)) {
        avgScores[key] += (r.scores[key] || 0) / reviews.length;
      }
    }

    return {
      ...paper,
      reviewCount: reviews.length,
      averageScore: reviews.length > 0 ? reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length : null,
      averageScores: avgScores,
      recommendations: reviews.map(r => ({ reviewer: r.reviewer, recommendation: r.recommendation })),
    };
  }

  /**
   * Challenge a published paper — the drama of scientific discourse!
   * @param {string} paperId
   * @param {string} challengerAgentId
   * @param {string} challengeReason
   * @returns {object} challenge record
   */
  challengePaper(paperId, challengerAgentId, challengeReason) {
    const paper = this.papers.get(paperId);
    if (!paper) throw new Error(`Paper not found: ${paperId}`);

    paper.status = 'challenged';

    const challenge = {
      paperId,
      challenger: challengerAgentId,
      reason: challengeReason,
      challengedAt: new Date().toISOString(),
      status: 'open', // 'open' | 'resolved' | 'upheld' | 'overturned'
    };

    if (!this.challenges.has(paperId)) this.challenges.set(paperId, []);
    this.challenges.get(paperId).push(challenge);

    return challenge;
  }

  /**
   * Get debate turns.
   */
  getDebate(debateId) {
    return this.debates.get(debateId) || [];
  }
}

export default PeerReviewSystem;
