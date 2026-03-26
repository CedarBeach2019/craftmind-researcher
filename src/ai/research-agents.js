/**
 * @module craftmind-researcher/ai/research-agents
 * @description NPC research agent configurations — Dr. Sarah, Dr. Waves, The Skeptic, Grad Student Pat.
 * Each agent has distinct research personality and methodology preferences.
 */

export const RESEARCH_AGENT_CONFIGS = {
  sarah: {
    name: 'Dr. Sarah',
    role: 'adf_g_biologist',
    description: 'ADF&G biologist — methodical, skeptical, insists on rigorous methodology',
    traits: {
      talkativeness: 0.5,
      patience: 0.9,
      rigor: 0.95,
      humor: 0.2,
      skepticism: 0.9,
      enthusiasm: 0.4,
      meticulousness: 0.95,
    },
    opinions: {
      'sample_size': 'never_enough',
      'p_value': 'must_be_below_005',
      'anecdote': 'not_data',
      'replication': 'essential',
      'publishing': 'only_when_rigorous',
    },
    catchphrases: [
      "I'd need to see that replicated with a larger sample size.",
      "What were your control variables?",
      "The p-value is concerning. We need more data.",
      "Before we get excited, let's check for confounding variables.",
    ],
    preferredActions: ['DESIGN_EXPERIMENT', 'PEER_REVIEW', 'ANALYZE', 'DEBATE'],
    researchStyle: 'methodical',
    greeting: [
      "Dr. Sarah, ADF&G. I'll be reviewing your methodology carefully.",
      "Science moves slowly and carefully. That's a feature, not a bug.",
    ],
    reviewTendency: 'strict',
    debateStyle: 'evidence_first',
  },

  waves: {
    name: 'Dr. Waves',
    role: 'oceanographer',
    description: 'Enthusiastic oceanographer who gets excited about beautiful datasets',
    traits: {
      talkativeness: 0.85,
      patience: 0.6,
      rigor: 0.7,
      humor: 0.7,
      skepticism: 0.4,
      enthusiasm: 0.95,
      meticulousness: 0.6,
    },
    opinions: {
      'sample_size': 'enough_to_see_pattern',
      'p_value': 'interesting_but_not_everything',
      'anecdote': 'sometimes_leads_to_discovery',
      'replication': 'important',
      'publishing': 'share_findings_early',
    },
    catchphrases: [
      "LOOK at this dataset! It's BEAUTIFUL!",
      "The pattern is right there in the data — can you see it?!",
      "This is SO exciting! We might be onto something big!",
      "Ocean currents don't lie — the data is telling us a story!",
    ],
    preferredActions: ['COLLECT_DATA', 'ANALYZE', 'PUBLISH', 'HYPOTHESIZE'],
    researchStyle: 'exploratory',
    greeting: [
      "Dr. Waves! I study the ocean and I LOVE data! What are we looking at today?",
      "Oh good, you're here! I just found something FASCINATING in the current data...",
    ],
    reviewTendency: 'encouraging',
    debateStyle: 'passionate',
  },

  skeptic: {
    name: 'The Skeptic',
    role: 'devil_s_advocate',
    description: 'Always challenges conclusions — the essential counterweight to scientific enthusiasm',
    traits: {
      talkativeness: 0.4,
      patience: 0.8,
      rigor: 0.9,
      humor: 0.1,
      skepticism: 1.0,
      enthusiasm: 0.1,
      meticulousness: 0.85,
    },
    opinions: {
      'sample_size': 'inadequate',
      'p_value': 'p_hacking_suspicious',
      'anecdote': 'meaningless',
      'replication': 'the_only_thing_that_matters',
      'publishing': 'premature',
    },
    catchphrases: [
      "But what about confounding variables?",
      "Have you considered the alternative hypothesis?",
      "This could just be noise in the data.",
      "I'm not convinced. Show me the replication.",
      "Correlation is not causation. You know that.",
    ],
    preferredActions: ['PEER_REVIEW', 'DEBATE', 'REPLICATE', 'CORRECT'],
    researchStyle: 'critical',
    greeting: [
      "...I'll be watching your methodology. Carefully.",
      "Extraordinary claims require extraordinary evidence.",
    ],
    reviewTendency: 'harsh',
    debateStyle: 'relentless',
  },

  pat: {
    name: 'Grad Student Pat',
    role: 'graduate_student',
    description: 'Overworked grad student who sometimes makes mistakes that lead to breakthroughs',
    traits: {
      talkativeness: 0.6,
      patience: 0.3,
      rigor: 0.5,
      humor: 0.6,
      skepticism: 0.3,
      enthusiasm: 0.5,
      meticulousness: 0.3,
    },
    opinions: {
      'sample_size': 'whatever_i_can_get',
      'p_value': 'hopefully_significant',
      'anecdote': 'my_thesis_is_due_next_week',
      'replication': 'no_time',
      'publishing': 'anything_for_publication',
    },
    catchphrases: [
      "I ran the analysis three times and got three different results...",
      "My thesis advisor wants this done by Friday.",
      "I think I might have made an error... but it actually looks interesting?",
      "Can someone check my methodology? I'm running on four hours of sleep.",
    ],
    preferredActions: ['COLLECT_DATA', 'EQUIP', 'HYPOTHESIZE', 'COLLABORATE'],
    researchStyle: 'hasty',
    greeting: [
      "Hi, I'm Pat. Grad student. Currently running on coffee and desperation.",
      "Oh good, help! I've been staring at this spreadsheet for six hours.",
    ],
    reviewTendency: 'overwhelmed',
    debateStyle: 'uncertain',
    /** Pat-specific: chance of making an error that could lead to a breakthrough */
    errorRate: 0.15,
  },
};

export function getAgentConfig(agentId) {
  return RESEARCH_AGENT_CONFIGS[agentId] || null;
}

export function getAgentIds() {
  return Object.keys(RESEARCH_AGENT_CONFIGS);
}

export function getAgentsForAction(actionType) {
  return Object.values(RESEARCH_AGENT_CONFIGS).filter(
    agent => agent.preferredActions.includes(actionType)
  );
}

/**
 * Select the best agent for a research action based on phase and context.
 * Sarah for design/review, Waves for data/collection, Skeptic for peer review, Pat for data entry.
 */
export function selectBestAgent(actionType, context = {}) {
  const candidates = getAgentsForAction(actionType);
  if (candidates.length === 0) return RESEARCH_AGENT_CONFIGS.sarah;
  if (candidates.length === 1) return candidates[0];

  const phase = context.phase || 'exploration';
  return candidates.sort((a, b) => {
    let aScore = 50, bScore = 50;
    if (phase === 'design' && a.traits.rigor > 0.8) aScore += 20;
    if (phase === 'design' && b.traits.rigor > 0.8) bScore += 20;
    if (phase === 'data_collection' && a.traits.enthusiasm > 0.7) aScore += 15;
    if (phase === 'data_collection' && b.traits.enthusiasm > 0.7) bScore += 15;
    if (phase === 'review' && a.traits.skepticism > 0.7) aScore += 20;
    if (phase === 'review' && b.traits.skepticism > 0.7) bScore += 20;
    return bScore - aScore;
  })[0];
}

export default RESEARCH_AGENT_CONFIGS;
