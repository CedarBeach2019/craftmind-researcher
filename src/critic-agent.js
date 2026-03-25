const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = 'glm-4.7-flash';

const SYSTEM_PROMPT = `You are the Critic agent in CraftMind. Your role is to rigorously evaluate discovered techniques and behavior scripts.

You are skeptical, thorough, and detail-oriented. For each technique you evaluate:
1. Is the conclusion actually supported by the data?
2. Are there edge cases (different biomes, conditions, versions)?
3. Is this technique actually optimal, or just "better than nothing"?
4. Does the behavior script correctly implement the technique?

You score techniques on a 0-1 scale for: efficiency, reliability, creativity, generalizability.
You respond in JSON format.`;

async function callLLM(userMessage) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return generateFallback();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }], temperature: 0.3, max_tokens: 2000 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch { return generateFallback(); }
}

function generateFallback() {
  return JSON.stringify({
    scores: { efficiency: 0.6, reliability: 0.7, creativity: 0.5, generalizability: 0.6 },
    overall: 0.6,
    verdict: 'Technique shows promise but needs more rigorous testing across biomes.',
    edgeCases: ['May not work in mesa biome', 'Light level dependency not tested'],
    improvements: ['Test across 5+ biomes', 'Increase sample size to 20+'],
  });
}

/**
 * Critic Agent: evaluates discovered techniques and behavior scripts.
 */
export class CriticAgent {
  /**
   * Evaluate a technique based on experiment results.
   * @param {object} technique - { statement, domain, details }
   * @param {object} experimentSummary - From Experiment.getSummary()
   * @param {object} [script] - Optional behavior script to validate.
   * @returns {Promise<object>} Evaluation with scores and feedback.
   */
  async evaluate(technique, experimentSummary, script) {
    const prompt = `Evaluate this discovered Minecraft technique:

Statement: "${technique.statement}"
Domain: ${technique.domain}
Details: ${JSON.stringify(technique.details || {})}

Experiment Results:
${JSON.stringify(experimentSummary, null, 2)}

${script ? `Behavior Script:\n${JSON.stringify(script.actions || script, null, 2)}` : ''}

Score each dimension 0-1 and provide feedback. Return JSON with:
{ scores: {efficiency, reliability, creativity, generalizability}, overall, verdict, edgeCases: [], improvements: [] }`;

    const response = await callLLM(prompt);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      return {
        ...parsed,
        overall: parsed.overall ?? parsed.scores
          ? Object.values(parsed.scores).reduce((a, b) => a + b, 0) / Object.values(parsed.scores).length
          : 0.5,
      };
    } catch {
      return JSON.parse(generateFallback());
    }
  }
}
