const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = 'glm-4.7-flash';

const SYSTEM_PROMPT = `You are the Distiller agent in CraftMind. Your role is to take raw experiment results and compress them into concise, reusable behavior scripts.

You are concise and practical. You take verbose experiment data and extract the essential technique — the minimal sequence of actions that achieves the result. Strip away experiment artifacts (controls, measurements) and keep only what a bot needs to execute the technique.

Output compact JSON action arrays. Every action must be necessary. Optimize for brevity and reliability.`;

async function callLLM(userMessage) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return null; // Distiller can work without LLM — just returns the teacher's script as-is
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }], temperature: 0.2, max_tokens: 1500 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch { return null; }
}

/**
 * Distiller Agent: compresses experiment results into minimal reusable behavior scripts.
 */
export class DistillerAgent {
  /**
   * Distill a teacher's demonstration script into a minimal, optimized version.
   * @param {object} teacherScript - The behavior script from TeacherAgent.
   * @param {object} experiment - The experiment that validated the technique.
   * @returns {Promise<object>} Optimized behavior script.
   */
  async distill(teacherScript, experiment) {
    const prompt = `Distill this behavior script to its essential actions. Remove any observation/experiment steps — keep only the actions needed to apply the technique in production.

Original Script:
${JSON.stringify(teacherScript.actions, null, 2)}

Experiment domain: ${experiment.domain}
Conclusion: ${experiment.conclusion?.text || 'N/A'}

Output ONLY a compact JSON array of essential actions.`;

    const response = await callLLM(prompt);
    if (!response) {
      // Fallback: strip observe actions from teacher script
      return {
        ...teacherScript,
        metadata: { ...teacherScript.metadata, distilled: true },
        actions: teacherScript.actions.filter(a => a.action !== 'observe'),
      };
    }

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const actions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      return {
        ...teacherScript,
        metadata: { ...teacherScript.metadata, distilled: true },
        actions,
      };
    } catch {
      return teacherScript; // Return teacher script as-is
    }
  }

  /**
   * Create a one-line summary of a technique for the knowledge base.
   * @param {object} experiment - Completed experiment.
   * @param {object} evaluation - Critic evaluation.
   * @returns {Promise<string>} Concise summary.
   */
  async summarize(experiment, evaluation) {
    if (!process.env.ZAI_API_KEY) {
      return `${experiment.conclusion?.hypothesisSupported ? 'CONFIRMED' : 'REFUTED'}: ${experiment.hypothesis} (score: ${(evaluation?.overall || 0).toFixed(2)})`;
    }
    const prompt = `Summarize in one sentence:
Hypothesis: ${experiment.hypothesis}
Result: ${experiment.conclusion?.text}
Score: ${evaluation?.overall}`;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.ZAI_API_KEY}` },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 100 }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || experiment.hypothesis;
    } catch {
      return experiment.hypothesis;
    }
  }
}
