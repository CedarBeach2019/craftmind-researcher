/**
 * Knowledge Export API — clean interface for sharing discoveries with CraftMind Core.
 * @module craftmind-researcher/knowledge-export
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Knowledge Export API.
 * Provides methods for CraftMind Core bots to query and use researcher discoveries.
 *
 * Usage from CraftMind Core:
 *   import { KnowledgeExport } from 'craftmind-researcher/knowledge-export.js';
 *   const exportAPI = new KnowledgeExport(knowledgeBaseInstance);
 *
 *   // Get actionable scripts for a domain
 *   const farming = exportAPI.getScripts('farming');
 *   farming.forEach(s => bot.executeScript(s));
 */
export class KnowledgeExport {
  /**
   * @param {import('./knowledge-base.js').KnowledgeBase} knowledgeBase
   */
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  /**
   * Get all distilled behavior scripts for a domain, sorted by score.
   * These are ready to execute — no LLM needed.
   * @param {string} domain
   * @param {number} [minScore=0.5] - Minimum confidence threshold
   * @returns {Array<{id: string, script: object, score: number, statement: string}>}
   */
  getScripts(domain, minScore = 0.5) {
    const techniques = this.kb.query({ domain, minScore, verifiedOnly: true });
    return techniques
      .filter(t => t.behaviorScript)
      .map(t => ({
        id: t.id,
        script: t.behaviorScript,
        score: t.score,
        statement: t.statement,
      }));
  }

  /**
   * Get a specific technique by ID.
   * @param {string} id
   * @returns {object|null}
   */
  getTechnique(id) {
    const technique = this.kb.get(id);
    if (!technique) return null;
    return {
      id: technique.id,
      statement: technique.statement,
      domain: technique.domain,
      score: technique.score,
      verified: technique.verified,
      script: technique.behaviorScript || null,
      paper: technique.paper || null,
    };
  }

  /**
   * Check whether a specific question has been answered by research.
   * @param {string} question - Natural language question
   * @returns {{ answered: boolean, techniqueId: string|null, answer: string|null, confidence: number }}
   */
  checkKnowledge(question) {
    const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const all = this.kb.query({ verifiedOnly: true });

    let bestMatch = null;
    let bestScore = 0;

    for (const technique of all) {
      const factWords = technique.statement.toLowerCase().split(/\s+/);
      const overlap = keywords.filter(w => factWords.some(fw => fw.includes(w) || w.includes(fw)));
      const score = overlap.length / keywords.length;
      if (score > bestScore && score > 0.3) {
        bestScore = score;
        bestMatch = technique;
      }
    }

    if (!bestMatch) return { answered: false, techniqueId: null, answer: null, confidence: 0 };

    return {
      answered: true,
      techniqueId: bestMatch.id,
      answer: bestMatch.statement,
      confidence: bestMatch.score * bestScore,
    };
  }

  /**
   * Get a summary of all knowledge for a domain.
   * Useful for bot planning — "what do we know about farming?"
   * @param {string} domain
   * @returns {{ factCount: number, avgScore: number, facts: string[], topTechniques: object[] }}
   */
  getDomainSummary(domain) {
    const techniques = this.kb.query({ domain });
    return {
      factCount: techniques.length,
      avgScore: techniques.length ? techniques.reduce((s, t) => s + t.score, 0) / techniques.length : 0,
      facts: techniques.map(t => t.statement),
      topTechniques: techniques.slice(0, 5).map(t => ({ id: t.id, score: t.score, statement: t.statement })),
    };
  }

  /**
   * Export all knowledge as a JSON-serializable object.
   * Can be sent over network or written to a shared file.
   * @returns {object}
   */
  exportAll() {
    const all = this.kb.query();
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: this.kb.stats(),
      techniques: all.map(t => ({
        id: t.id,
        domain: t.domain,
        statement: t.statement,
        score: t.score,
        verified: t.verified,
        script: t.behaviorScript || null,
      })),
    };
  }

  /**
   * Receive an observation from a bot and add it to the knowledge base.
   * This enables bots running scripts to feed back results.
   * @param {object} observation
   * @param {string} observation.techniqueId - The technique being tested
   * @param {boolean} observation.worked - Did the technique work?
   * @param {string} [observation.notes] - Additional notes
   * @returns {object} Updated technique
   */
  receiveObservation({ techniqueId, worked, notes = '' }) {
    const existing = this.kb.get(techniqueId);
    if (!existing) return null;

    // Adjust score based on observation
    const adjustment = worked ? 0.02 : -0.05;
    const newScore = Math.max(0, Math.min(1, existing.score + adjustment));

    return this.kb.save({
      ...existing,
      score: newScore,
      verified: newScore > 0.6 ? true : existing.verified,
      observationLog: [...(existing.observationLog || []), { worked, notes, timestamp: new Date().toISOString() }],
    });
  }
}
