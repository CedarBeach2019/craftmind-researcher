import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge');
const DISCOVERED_DIR = join(KNOWLEDGE_DIR, 'discovered');

const DOMAINS = ['mining', 'building', 'farming', 'combat', 'redstone', 'exploration', 'general'];

/**
 * Persistent knowledge store for discovered techniques.
 * Saves/loads JSON files, tags by domain, rates by score, tracks revision history.
 */
export class KnowledgeBase {
  constructor() {
    if (!existsSync(DISCOVERED_DIR)) mkdirSync(DISCOVERED_DIR, { recursive: true });
    this._cache = new Map();
    this._loadInitialFacts();
  }

  /** @type {Map<string, object>} */
  get cache() { return this._cache; }

  /** Load pre-seeded facts from all JSON files in the knowledge directory. */
  _loadInitialFacts() {
    const factFiles = ['initial-facts.json', 'building-techniques.json'];
    for (const fileName of factFiles) {
      const filePath = join(KNOWLEDGE_DIR, fileName);
      if (!existsSync(filePath)) continue;
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        for (const fact of data.facts) {
          this._cache.set(fact.id, { ...fact, revisions: fact.revisions || [] });
        }
      } catch (err) {
        console.warn(`[KnowledgeBase] Failed to load ${fileName}: ${err.message}`);
      }
    }
  }

  /**
   * Save a discovered technique to persistent storage.
   * @param {object} technique - { id, domain, statement, score, details, behaviorScript }
   * @returns {object} The saved technique with metadata.
   */
  save(technique) {
    const existing = this._cache.get(technique.id);
    const entry = {
      ...technique,
      domain: technique.domain || 'general',
      score: technique.score ?? 0.5,
      verified: technique.verified ?? false,
      createdAt: technique.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisions: existing?.revisions || [],
    };
    if (existing) {
      entry.revisions.push({ timestamp: existing.updatedAt, score: existing.score, statement: existing.statement });
    }
    this._cache.set(technique.id, entry);
    writeFileSync(join(DISCOVERED_DIR, `${technique.id}.json`), JSON.stringify(entry, null, 2));
    return entry;
  }

  /**
   * Get a technique by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  get(id) {
    return this._cache.get(id);
  }

  /**
   * Query techniques by domain and/or minimum score.
   * @param {object} [opts]
   * @param {string} [opts.domain] - Filter by domain.
   * @param {number} [opts.minScore] - Minimum score threshold.
   * @param {boolean} [opts.verifiedOnly] - Only verified techniques.
   * @returns {object[]}
   */
  query({ domain, minScore, verifiedOnly } = {}) {
    let results = [...this._cache.values()];
    if (domain) results = results.filter(t => t.domain === domain);
    if (minScore !== undefined) results = results.filter(t => t.score >= minScore);
    if (verifiedOnly) results = results.filter(t => t.verified);
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Get all domains that have known techniques.
   * @returns {string[]}
   */
  getDomains() {
    const domains = new Set([...this._cache.values()].map(t => t.domain));
    return [...domains];
  }

  /**
   * Get statistics about the knowledge base.
   * @returns {{ total: number, byDomain: object, avgScore: number, verified: number }}
   */
  stats() {
    const all = [...this._cache.values()];
    const byDomain = {};
    for (const t of all) byDomain[t.domain] = (byDomain[t.domain] || 0) + 1;
    return {
      total: all.length,
      byDomain,
      avgScore: all.length ? all.reduce((s, t) => s + t.score, 0) / all.length : 0,
      verified: all.filter(t => t.verified).length,
    };
  }
}
