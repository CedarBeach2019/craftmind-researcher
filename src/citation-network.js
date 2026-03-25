/**
 * Citation Network — tracks how discoveries build on each other.
 * Creates a knowledge graph showing how understanding evolved over time.
 * @module craftmind-researcher/citation-network
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITATIONS_FILE = join(__dirname, '..', 'knowledge', 'citations.json');

/**
 * @typedef {object} CitationEdge
 * @property {string} from - ID of the citing fact (newer)
 * @property {string} to - ID of the cited fact (older)
 * @property {string} relation - 'builds_on', 'contradicts', 'extends', 'refines', 'replicates'
 * @property {string} note - Human-readable description of the relationship
 */

/**
 * @typedef {object} CitationNetwork
 * @property {CitationEdge[]} edges
 * @property {object} stats - Network statistics
 */

export class CitationNetwork {
  constructor() {
    this.edges = this._load();
  }

  _load() {
    if (!existsSync(CITATIONS_FILE)) return [];
    try { return JSON.parse(readFileSync(CITATIONS_FILE, 'utf8')); }
    catch { return []; }
  }

  _save() {
    writeFileSync(CITATIONS_FILE, JSON.stringify(this.edges, null, 2));
  }

  /**
   * Add a citation edge.
   * @param {string} from - Citing fact ID
   * @param {string} to - Cited fact ID
   * @param {string} relation - 'builds_on', 'contradicts', 'extends', 'refines', 'replicates'
   * @param {string} note - Description
   */
  addCitation(from, to, relation, note = '') {
    // Don't add duplicates
    if (this.edges.some(e => e.from === from && e.to === to && e.relation === relation)) return;

    this.edges.push({
      from,
      to,
      relation,
      note,
      timestamp: new Date().toISOString(),
    });
    this._save();
  }

  /**
   * Add multiple citations at once.
   * @param {string} from - Citing fact ID
   * @param {Array<{id: string, relation: string, note: string}>} citations
   */
  addCitations(from, citations) {
    for (const c of citations) {
      this.addCitation(from, c.id, c.relation, c.note);
    }
  }

  /**
   * Get all facts that a given fact cites.
   * @param {string} factId
   * @returns {CitationEdge[]}
   */
  getCited(factId) {
    return this.edges.filter(e => e.from === factId);
  }

  /**
   * Get all facts that cite a given fact.
   * @param {string} factId
   * @returns {CitationEdge[]}
   */
  getCitedBy(factId) {
    return this.edges.filter(e => e.to === factId);
  }

  /**
   * Get the full citation chain for a fact (what it builds on, recursively).
   * @param {string} factId
   * @param {Set()} [visited] - Internal recursion guard
   * @returns {string[]} All ancestor fact IDs
   */
  getAncestry(factId, visited = new Set()) {
    if (visited.has(factId)) return [];
    visited.add(factId);
    const cited = this.getCited(factId).map(e => e.to);
    const ancestors = [];
    for (const id of cited) {
      ancestors.push(id);
      ancestors.push(...this.getAncestry(id, visited));
    }
    return [...new Set(ancestors)];
  }

  /**
   * Get the impact of a fact — how many other facts cite it (directly or indirectly).
   * @param {string} factId
   * @returns {{ directCitations: number, totalReach: number }}
   */
  getImpact(factId) {
    const direct = this.getCitedBy(factId).length;
    const descendants = this._getDescendants(factId, new Set());
    return { directCitations: direct, totalReach: descendants.size };
  }

  _getDescendants(factId, visited) {
    if (visited.has(factId)) return visited;
    visited.add(factId);
    for (const e of this.getCitedBy(factId)) {
      this._getDescendants(e.from, visited);
    }
    return visited;
  }

  /**
   * Get network statistics.
   */
  stats() {
    const nodes = new Set();
    for (const e of this.edges) {
      nodes.add(e.from);
      nodes.add(e.to);
    }
    const byRelation = {};
    for (const e of this.edges) {
      byRelation[e.relation] = (byRelation[e.relation] || 0) + 1;
    }
    return { nodeCount: nodes.size, edgeCount: this.edges.length, byRelation };
  }

  /**
   * Export as a simple adjacency list (useful for visualization or external tools).
   * @returns {Record<string, {cites: object[], citedBy: object[]}>}
   */
  toAdjacencyList() {
    const adj = {};
    const allIds = new Set();
    for (const e of this.edges) { allIds.add(e.from); allIds.add(e.to); }
    for (const id of allIds) {
      adj[id] = {
        cites: this.getCited(id).map(e => ({ id: e.to, relation: e.relation })),
        citedBy: this.getCitedBy(id).map(e => ({ id: e.from, relation: e.relation })),
      };
    }
    return adj;
  }

  /**
   * Export as DOT format for graphviz visualization.
   * @param {Map<string, string>} [labels] - Optional map of fact ID → label
   * @returns {string}
   */
  toDot(labels) {
    let dot = 'digraph citations {\n  rankdir=TB;\n  node [shape=box];\n';
    const nodes = new Set();
    for (const e of this.edges) { nodes.add(e.from); nodes.add(e.to); }
    for (const id of nodes) {
      const label = labels?.get(id) || id;
      dot += `  "${id}" [label="${label}"];\n`;
    }
    const colors = { builds_on: 'blue', contradicts: 'red', extends: 'green', refines: 'orange', replicates: 'gray' };
    for (const e of this.edges) {
      const color = colors[e.relation] || 'black';
      dot += `  "${e.from}" -> "${e.to}" [label="${e.relation}", color="${color}"];\n`;
    }
    dot += '}\n';
    return dot;
  }
}
