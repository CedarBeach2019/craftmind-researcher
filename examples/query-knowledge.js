#!/usr/bin/env node

/**
 * Example: Query the knowledge base for techniques.
 *
 * Usage:
 *   node examples/query-knowledge.js                # Show all stats
 *   node examples/query-knowledge.js farming         # Query farming domain
 *   node examples/query-knowledge.js farming 0.5     # Farming with min score 0.5
 *   node examples/query-knowledge.js --verified      # Only verified techniques
 */

import { KnowledgeBase } from '../src/index.js';

const kb = new KnowledgeBase();

const arg1 = process.argv[2];
const arg2 = process.argv[3];

// Show overall stats
const stats = kb.stats();
console.log('📚 Knowledge Base Stats');
console.log(`   Total techniques: ${stats.total}`);
console.log(`   Verified: ${stats.verified}`);
console.log(`   Avg score: ${stats.avgScore.toFixed(2)}`);
console.log(`   Domains: ${Object.entries(stats.byDomain).map(([d, c]) => `${d}(${c})`).join(', ') || 'none'}`);
console.log();

if (!arg1 || arg1 === '--stats') {
  console.log('(Pass a domain name or --verified to filter results)\n');

  // Show all techniques
  const all = kb.query();
  console.log(`All techniques (${all.length}):`);
  for (const t of all) {
    console.log(`  [${(t.score * 100).toFixed(0)}%] [${t.domain}] ${t.statement.slice(0, 80)}${t.statement.length > 80 ? '...' : ''}`);
  }
  process.exit(0);
}

if (arg1 === '--verified') {
  const results = kb.query({ verifiedOnly: true });
  console.log(`Verified techniques (${results.length}):`);
  for (const t of results) {
    console.log(`  [${(t.score * 100).toFixed(0)}%] [${t.domain}] ${t.statement}`);
  }
  process.exit(0);
}

// Domain query
const minScore = arg2 ? parseFloat(arg2) : undefined;
const results = kb.query({ domain: arg1, minScore });
console.log(`Results for "${arg1}"${minScore != null ? ` (score >= ${minScore})` : ''} — ${results.length} found:`);
for (const t of results) {
  console.log(`  [${(t.score * 100).toFixed(0)}%] ${t.verified ? '✅' : '⬜'} ${t.statement}`);
}
