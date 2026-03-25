/**
 * Literature Review — prevents re-testing known facts and finds knowledge gaps.
 * @module craftmind-researcher/literature-review
 */

/**
 * @typedef {object} Fact
 * @property {string} id
 * @property {string} domain
 * @property {string} statement
 * @property {number} [confidence]
 * @property {boolean} [verified]
 * @property {string[]} [tags]
 * @property {string[]} [cites] - IDs of facts this builds on
 * @property {string[]} [citedBy] - IDs of facts that cite this one
 */

/**
 * Check whether a hypothesis is novel or already covered by existing knowledge.
 * @param {string} hypothesis - The proposed hypothesis.
 * @param {Fact[]} knownFacts - All facts in the knowledge base.
 * @returns {{ novel: boolean, relatedFacts: Fact[], overlapScore: number, gaps: string[] }}
 */
export function reviewLiterature(hypothesis, knownFacts) {
  if (!hypothesis || knownFacts.length === 0) {
    return { novel: true, relatedFacts: [], overlapScore: 0, gaps: ['No existing knowledge to compare against'] };
  }

  const hypothesisLower = hypothesis.toLowerCase();
  const hypothesisWords = extractKeywords(hypothesis);

  // Find related facts by keyword overlap
  const related = knownFacts.map(fact => {
    const factWords = extractKeywords(fact.statement);
    const overlap = keywordOverlap(hypothesisWords, factWords);
    // Also check domain match
    const domainBonus = fact.domain ? 0.1 : 0;
    return { fact, overlap: overlap + domainBonus };
  })
  .filter(r => r.overlap > 0.15)
  .sort((a, b) => b.overlap - a.overlap)
  .slice(0, 5)
  .map(r => r.fact);

  const overlapScore = related.length > 0
    ? Math.max(...related.map(f => {
        const fw = extractKeywords(f.statement);
        return keywordOverlap(hypothesisWords, fw);
      }))
    : 0;

  // Check if hypothesis directly contradicts known facts
  const contradictions = related.filter(f => f.verified && overlapScore > 0.5);

  // Check if hypothesis is essentially the same as a known fact
  const duplicates = related.filter(f => {
    const fw = extractKeywords(f.statement);
    return keywordOverlap(hypothesisWords, fw) > 0.7 && f.verified;
  });

  const novel = duplicates.length === 0;
  const gaps = identifyKnowledgeGaps(hypothesisLower, knownFacts);

  return { novel, relatedFacts: related, overlapScore, contradictions: duplicates.length > 0 ? contradictions : [], gaps };
}

/**
 * Find knowledge gaps — areas related to a domain that haven't been tested.
 * @param {string} domainOrHypothesis
 * @param {Fact[]} knownFacts
 * @returns {string[]} Suggested research questions for unexplored areas.
 */
export function identifyKnowledgeGaps(domainOrHypothesis, knownFacts) {
  const words = extractKeywords(domainOrHypothesis);
  const knownTopics = new Set();

  for (const fact of knownFacts) {
    const factWords = extractKeywords(fact.statement);
    for (const w of factWords) knownTopics.add(w);
  }

  // Domains and their sub-topics that are research-worthy
  const domainTopics = {
    mining: ['ore_distribution', 'vein_size', 'tool_efficiency', 'fortune_enchant', 'y_level', 'biome_variation', 'deepslate_vs_stone', 'ancient_debris'],
    farming: ['growth_rate', 'hydration_distance', 'light_level', 'bone_meal_efficiency', 'crop_density', 'composter', 'bee_pollination', 'auto_harvest'],
    building: ['water_flow', 'lava_flow', 'scaffolding', 'block_hardness', 'blast_resistance', 'light_propagation', 'piston_mechanics', 'slab_tricks'],
    combat: ['damage_calculation', 'armor_reduction', 'enchant_effectiveness', 'mob_ai', 'knockback', 'critical_hit', 'totem', 'shield'],
    redstone: ['signal_strength', 'tick_timing', 'comparator', 'observer', 'piston_timing', 'hopper_speed', 'rail_mechanics'],
    exploration: ['structure_generation', 'biome_transition', 'village_trading', 'shipwreck_loot', 'end_city', 'bastion', 'stronghold'],
    enchanting: ['enchant_levels', 'bookshelf_count', 'anvil_combining', 'mending_repair', 'rarity_weight'],
    mob_behavior: ['spawn_conditions', 'pathfinding', 'aggro_range', 'loot_table', 'breeding', 'dropped_items'],
    trading: ['trade_refresh', 'emerald_value', 'librarian_optimization', 'wandering_trader', 'hero_of_the_village'],
    nether: ['portal_mechanics', 'piglin_bartering', 'strider_movement', 'lava_ocean', 'fortress_loot', 'basalt_delta'],
  };

  const gaps = [];
  for (const [domain, topics] of Object.entries(domainTopics)) {
    const domainRelevance = words.some(w => domain.includes(w)) || words.some(w => topics.some(t => t.includes(w)));
    if (!domainRelevance && words.length > 0) continue;

    for (const topic of topics) {
      const topicKnown = knownTopics.has(topic) || knownFacts.some(f =>
        f.statement.toLowerCase().includes(topic.replace(/_/g, ' '))
      );
      if (!topicKnown) {
        gaps.push(`${domain}/${topic}`);
      }
    }
  }

  return gaps;
}

/**
 * Generate analogical hypotheses from known facts.
 * "Water flows 7 blocks. Lava flows 4. Hypothesis: liquid flow varies by viscosity."
 * @param {Fact[]} knownFacts
 * @returns {Array<{ hypothesis: string, domain: string, basedOn: string[], analogy: string }>}
 */
export function generateAnalogies(knownFacts) {
  if (knownFacts.length < 2) return [];

  const analogies = [];
  const facts = knownFacts.filter(f => f.verified !== false);

  // Find fact pairs with similar structure but different values
  for (let i = 0; i < facts.length; i++) {
    for (let j = i + 1; j < facts.length; j++) {
      const a = facts[i], b = facts[j];
      const aWords = extractKeywords(a.statement);
      const bWords = extractKeywords(b.statement);

      // Look for facts that share structure words but have different specific values
      const structuralOverlap = keywordOverlap(aWords, bWords);
      if (structuralOverlap > 0.2 && structuralOverlap < 0.8) {
        // Different domains or different specific mechanics
        if (a.domain !== b.domain || a.id !== b.id) {
          const hypothesis = `Based on "${a.statement}" and "${b.statement}", investigate whether the same pattern applies to related mechanics in ${a.domain}.`;
          analogies.push({
            hypothesis,
            domain: a.domain,
            basedOn: [a.id, b.id],
            analogy: `${a.domain}/${a.id} ↔ ${b.domain}/${b.id}`,
          });
        }
      }
    }
  }

  return analogies.slice(0, 3);
}

// ─── Helpers ─────────────────────────────────────────────────

const STOP_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'and', 'or', 'but', 'not', 'with', 'by', 'from', 'than', 'more', 'less', 'that', 'this',
  'each', 'per', 'up', 'down', 'into', 'out', 'can', 'be', 'has', 'have', 'its', 'their', 'it',
  'does', 'do', 'causes', 'will', 'while', 'when', 'how', 'what', 'which', 'about', 'between']);

function extractKeywords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordOverlap(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a), setB = new Set(b);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  return intersection / Math.min(setA.size, setB.size);
}
