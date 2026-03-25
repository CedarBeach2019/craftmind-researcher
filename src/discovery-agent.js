const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = 'glm-4.7-flash';

const SYSTEM_PROMPT = `You are the Researcher agent in CraftMind, an AI self-improvement system for Minecraft bots. Your role is to propose and design experiments.

You are curious, systematic, and creative. Given existing knowledge, you:
1. Propose hypotheses about Minecraft mechanics — things like "water placed diagonally hydrates farmland further" or "mining at Y=11 yields more diamonds than Y=5 after the cave update"
2. Design experiments to test those hypotheses — define variables, controls, sample size, measurement criteria
3. Predict outcomes before running the experiment

You respond in JSON format when possible. Keep hypotheses specific and testable within a Minecraft world.

Domains to explore: mining, building, farming, combat, redstone, exploration.`;

/**
 * Send a prompt to the LLM.
 * @param {string} userMessage
 * @param {object} [systemPrompt] - Override system prompt.
 * @returns {Promise<string>} The LLM response text.
 */
async function callLLM(userMessage, systemPrompt = SYSTEM_PROMPT) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) {
    console.warn('[DiscoveryAgent] No ZAI_API_KEY set — using fallback mode.');
    return generateFallback(userMessage);
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.error('[DiscoveryAgent] LLM call failed:', err.message);
    return generateFallback(userMessage);
  }
}

/** Fallback hypothesis generator when no API key. */
function generateFallback(prompt) {
  const fallbackHypotheses = [
    { hypothesis: 'Placing water on top of farmland via a waterlogged block doubles crop growth rate', domain: 'farming', type: 'ab_test', variables: [{ name: 'irrigation_method', values: ['side_water', 'top_waterlogged'] }] },
    { hypothesis: 'Sprinting while mining with an efficiency V diamond pickaxe is faster than walking', domain: 'mining', type: 'ab_test', variables: [{ name: 'movement', values: ['sprinting', 'walking'] }] },
    { hypothesis: 'A 3-wide tunnel at Y=-59 finds more ancient debris than a 1-wide tunnel', domain: 'mining', type: 'ab_test', variables: [{ name: 'tunnel_width', values: [1, 3, 5] }] },
    { hypothesis: 'Skeletons drop more loot when killed with a Looting III sword vs a bow', domain: 'combat', type: 'ab_test', variables: [{ name: 'weapon', values: ['looting_sword', 'bow'] }] },
    { hypothesis: 'Cobblestone generators with a 4-tick delay produce more consistent output than instant designs', domain: 'redstone', type: 'ab_test', variables: [{ name: 'delay_ticks', values: [0, 2, 4, 8] }] },
  ];
  const idx = Math.floor(Math.random() * fallbackHypotheses.length);
  return JSON.stringify(fallbackHypotheses[idx], null, 2);
}

/**
 * Parse LLM response into a structured hypothesis.
 * @param {string} text - LLM output.
 * @returns {object} { hypothesis, domain, type, variables, predictedOutcome }
 */
function parseHypothesis(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hypothesis: parsed.hypothesis || 'Unknown hypothesis',
        domain: parsed.domain || 'general',
        type: parsed.type || 'simple',
        variables: parsed.variables || [],
        predictedOutcome: parsed.predictedOutcome || null,
      };
    }
  } catch { /* fall through */ }
  // Fallback: use the text as-is
  return {
    hypothesis: text.slice(0, 200),
    domain: 'general',
    type: 'simple',
    variables: [],
    predictedOutcome: null,
  };
}

/**
 * Discovery Agent: proposes hypotheses and designs experiments using LLM.
 */
export class DiscoveryAgent {
  /**
   * @param {import('./knowledge-base.js').KnowledgeBase} knowledgeBase
   */
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  /**
   * Propose a new experiment hypothesis based on current knowledge.
   * @param {string} [focusDomain] - Optional domain to focus on.
   * @returns {Promise<object>} Structured hypothesis.
   */
  async proposeHypothesis(focusDomain) {
    const stats = this.kb.stats();
    const domains = this.kb.getDomains();
    const domain = focusDomain || domains[Math.floor(Math.random() * domains.length)] || 'farming';

    const existing = this.kb.query({ domain, minScore: 0.3 }).slice(0, 5);
    const existingStr = existing.map(t => `- [${t.score}] ${t.statement}`).join('\n');

    const prompt = `Existing knowledge about ${domain}:
${existingStr || '(none yet)'}

Knowledge base stats: ${stats.total} total facts, avg score ${stats.avgScore.toFixed(2)}.

Propose ONE specific, testable hypothesis about Minecraft ${domain} that could be experimentally verified in-game. Include:
- hypothesis: the claim
- domain: "${domain}"
- type: "simple" or "ab_test"
- variables: array of {name, values} for A/B test conditions
- predictedOutcome: what you expect

Be creative but realistic. Focus on mechanics that can be measured (time, count, distance, etc.).`;

    const response = await callLLM(prompt);
    return parseHypothesis(response);
  }

  /**
   * Design an experiment plan for a given hypothesis.
   * @param {object} hypothesis - From proposeHypothesis.
   * @returns {Promise<object>} Experiment design.
   */
  async designExperiment(hypothesis) {
    const prompt = `Hypothesis: "${hypothesis.hypothesis}"
Domain: ${hypothesis.domain}
Type: ${hypothesis.type}

Design a detailed experiment to test this. Include:
- setup: step-by-step world setup instructions
- variables: what to measure (time, counts, etc.)
- controls: what to keep constant
- sampleSize: recommended number of trials
- successCriteria: what result would support the hypothesis
- failureCriteria: what result would refute it

Respond in JSON.`;

    const response = await callLLM(prompt);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch { /* fall through */ }
    return {
      setup: `Set up test area for: ${hypothesis.hypothesis}`,
      variables: ['time', 'count'],
      controls: { biome: 'plains', timeOfDay: 'noon' },
      sampleSize: 5,
      successCriteria: 'Statistically significant difference',
      failureCriteria: 'No significant difference',
    };
  }
}
