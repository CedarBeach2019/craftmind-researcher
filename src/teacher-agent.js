import { createScript } from './behavior-script.js';

const API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const MODEL = 'glm-4.7-flash';

const SYSTEM_PROMPT = `You are the Teacher agent in CraftMind. Your role is to take discovered techniques and create clear, step-by-step behavior scripts that other Minecraft bots can follow.

You are patient, methodical, and precise. You break complex techniques into simple, executable actions. Every step should be something a bot can actually do in Minecraft.

Available actions: lookAt, place, break, moveTo, wait, observe, use, equip, attack, jump, sneak, drop, pickup, craft, smelt.
Action format: {action: string, target?: any, item?: string, ms?: number, what?: string, condition?: string, then?: Action[], else?: Action[]}

Always output a JSON array of actions.`;

async function callLLM(userMessage) {
  const apiKey = process.env.ZAI_API_KEY;
  if (!apiKey) return generateFallback();
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }], temperature: 0.4, max_tokens: 2000 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch { return generateFallback(); }
}

function generateFallback() {
  return JSON.stringify([
    { action: 'moveTo', target: 'farmland_area' },
    { action: 'equip', item: 'water_bucket' },
    { action: 'lookAt', target: 'farmland_edge' },
    { action: 'use', item: 'water_bucket' },
    { action: 'wait', ms: 1000 },
    { action: 'observe', what: 'water_placement' },
    { action: 'moveTo', target: 'crop_plot' },
    { action: 'equip', item: 'wheat_seeds' },
    { action: 'lookAt', target: 'farmland' },
    { action: 'use', item: 'wheat_seeds' },
    { action: 'wait', ms: 30000 },
    { action: 'observe', what: 'crop_growth' },
  ]);
}

/**
 * Teacher Agent: creates behavior scripts from discovered techniques.
 */
export class TeacherAgent {
  /**
   * Create a demonstration script for a technique.
   * @param {object} technique - { statement, domain, details, conclusion }
   * @returns {Promise<object>} A behavior script object.
   */
  async createScript(technique) {
    const prompt = `Technique: "${technique.statement}"
Domain: ${technique.domain}
Details: ${JSON.stringify(technique.details || {})}

Create a step-by-step behavior script a bot can follow to apply this technique. Output ONLY a JSON array of actions.`;

    const response = await callLLM(prompt);
    let actions;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      actions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
    } catch {
      actions = JSON.parse(generateFallback());
    }

    return createScript(actions, {
      name: technique.statement.slice(0, 50),
      domain: technique.domain,
      techniqueId: technique.id,
    });
  }

  /**
   * Annotate a script with explanations for each step.
   * @param {object} script - A behavior script.
   * @returns {Promise<object[]>} Array of {action, explanation}.
   */
  async annotateScript(script) {
    const prompt = `Explain each action in this script for educational purposes:
${JSON.stringify(script.actions, null, 2)}

Return a JSON array of {action, explanation} objects.`;
    const response = await callLLM(prompt);
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : script.actions.map(a => ({ action: a, explanation: 'Performs ' + a.action }));
    } catch {
      return script.actions.map(a => ({ action: a, explanation: 'Performs ' + a.action }));
    }
  }
}
