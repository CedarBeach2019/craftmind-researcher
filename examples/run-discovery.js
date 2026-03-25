#!/usr/bin/env node

/**
 * Example: Run a full discovery cycle.
 *
 * Usage:
 *   node examples/run-discovery.js              # Auto-select domain
 *   node examples/run-discovery.js farming       # Focus on farming
 *   node examples/run-discovery.js --demo        # Demo with fallback data
 */

import { runCycle } from '../src/index.js';

const domain = process.argv[2] === '--demo' ? 'farming' : (process.argv[2] || undefined);

console.log('🧪 CraftMind Researcher — Discovery Cycle Runner\n');

if (!process.env.ZAI_API_KEY) {
  console.log('⚠️  No ZAI_API_KEY set — running in offline fallback mode.\n');
}

try {
  const result = await runCycle({ focusDomain: domain });
  console.log('\n✅ Cycle completed successfully.');
  console.log(`   Final score: ${(result.evaluation.overall * 100).toFixed(1)}%`);
  console.log(`   Verified: ${result.technique.verified}`);
} catch (err) {
  console.error('❌ Cycle failed:', err);
  process.exit(1);
}
