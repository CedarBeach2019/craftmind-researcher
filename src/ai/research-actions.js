/**
 * @module craftmind-researcher/ai/research-actions
 * @description Experiment-specific action schema for science research agents.
 * Maps natural language to structured research actions.
 */

export const RESEARCH_ACTION_TYPES = {
  HYPOTHESIZE: {
    description: 'Propose a testable hypothesis',
    params: ['claim', 'domain', 'predictedOutcome', 'falsificationCriterion'],
  },
  DESIGN_EXPERIMENT: {
    description: 'Design an experimental setup to test a hypothesis',
    params: ['hypothesisId', 'variables', 'controls', 'sampleSize', 'method'],
  },
  COLLECT_DATA: {
    description: 'Record observations and measurements',
    params: ['experimentId', 'variable', 'value', 'condition', 'notes'],
  },
  ANALYZE: {
    description: 'Run statistical analysis on collected data',
    params: ['experimentId', 'analysisType', 'variables'],
  },
  PUBLISH: {
    description: 'Write up findings as a research paper',
    params: ['experimentId', 'findings', 'significance', 'implications'],
  },
  PEER_REVIEW: {
    description: 'Review and critique another researcher\'s paper',
    params: ['paperId', 'rigor', 'methodology', 'findings', 'recommendation'],
  },
  REPLICATE: {
    description: 'Attempt to reproduce published results',
    params: ['paperId', 'experimentSetup', 'expectedResults', 'actualResults'],
  },
  EQUIP: {
    description: 'Build or acquire equipment for experiments',
    params: ['equipment', 'purpose', 'cost', 'quality'],
  },
  LITERATURE_REVIEW: {
    description: 'Search and review existing research',
    params: ['query', 'domain', 'dateRange'],
  },
  DEBATE: {
    description: 'Engage in scientific debate about findings',
    params: ['topic', 'position', 'evidence', 'counterArgument'],
  },
  COLLABORATE: {
    description: 'Propose or accept collaboration with another researcher',
    params: ['researcherId', 'experimentId', 'role', 'contribution'],
  },
  CORRECT: {
    description: 'Acknowledge and correct an error in published work',
    params: ['paperId', 'error', 'correction', 'impact'],
  },
};

/**
 * Parse natural language input into structured research actions.
 */
export class ResearchActionPlanner {
  constructor(llmClient = null) {
    this.llm = llmClient;
  }

  /**
   * Plan research actions from input.
   * @param {string} input
   * @param {object} context - { currentExperiment, phase, domain, recentFindings }
   * @returns {Promise<{actions: Array, response: string, fallback: boolean}>}
   */
  async plan(input, context = {}) {
    if (this.llm) {
      try {
        const plan = await this._planWithLLM(input, context);
        if (plan) return { ...plan, fallback: false };
      } catch { /* fall through */ }
    }
    return { ...this._fallbackPlan(input, context), fallback: true };
  }

  async _planWithLLM(input, context) {
    const prompt = `You are a research scientist. Input: "${input}"
Context: phase=${context.phase || 'exploration'}, domain=${context.domain || 'general'}

Actions: ${Object.keys(RESEARCH_ACTION_TYPES).join(', ')}

Respond with JSON: { "thinking": "", "actions": [{ "type": "ACTION", "params": {}, "reasoning": "" }], "response": "" }`;
    const response = await this.llm.chat(prompt);
    return this._parseResponse(response);
  }

  _parseResponse(text) {
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) return { actions: [], response: text?.slice(0, 200) || 'Interesting.' };
    try {
      const p = JSON.parse(match[0]);
      return {
        actions: (p.actions || []).map(a => ({ type: (a.type || '').toUpperCase(), params: a.params || {}, reasoning: a.reasoning || '' })),
        response: p.response || p.dialogue || '*scribbles notes*',
        thinking: p.thinking || '',
      };
    } catch {
      return { actions: [], response: text.slice(0, 200) };
    }
  }

  _fallbackPlan(input, context) {
    const lower = input.toLowerCase();

    if (/i think|i believe|my hypothesis|what if/i.test(lower)) {
      return { actions: [{ type: 'HYPOTHESIZE', params: { claim: input }, reasoning: 'Hypothesis proposal' }], response: "That's a testable hypothesis. Let's explore it." };
    }
    if (/design|set up|plan.*experiment/i.test(lower)) {
      return { actions: [{ type: 'DESIGN_EXPERIMENT', params: {}, reasoning: 'Experiment design request' }], response: "Let's design a rigorous experiment for that." };
    }
    // Check reproduce/replicate BEFORE analyze (since "results" contains "result")
    if (/reproduce|replicate|verify/i.test(lower)) {
      return { actions: [{ type: 'REPLICATE', params: {}, reasoning: 'Replication attempt' }], response: "Replication is the heart of science. Let's try." };
    }
    if (/analyze|stat|pattern|what does.*mean/i.test(lower)) {
      return { actions: [{ type: 'ANALYZE', params: {}, reasoning: 'Analysis request' }], response: "Let's crunch the numbers." };
    }
    // Check peer review BEFORE publish (since "paper" is in both)
    if (/review|critique|peer/i.test(lower)) {
      return { actions: [{ type: 'PEER_REVIEW', params: {}, reasoning: 'Peer review' }], response: "I'll review that paper carefully." };
    }
    if (/publish|write up|findings/i.test(lower)) {
      return { actions: [{ type: 'PUBLISH', params: {}, reasoning: 'Publication request' }], response: "Time to share our findings with the world." };
    }
    if (/build|equipment|tool|gear|instrument/i.test(lower)) {
      return { actions: [{ type: 'EQUIP', params: {}, reasoning: 'Equipment request' }], response: "We'll need the right tools for this." };
    }
    if (/data|record|collect|measure|observe/i.test(lower)) {
      return { actions: [{ type: 'COLLECT_DATA', params: {}, reasoning: 'Data collection' }], response: "Recording that observation." };
    }
    if (/debate|disagree|wrong|but what about/i.test(lower)) {
      return { actions: [{ type: 'DEBATE', params: { topic: input }, reasoning: 'Scientific debate' }], response: "Let's examine the evidence more carefully." };
    }
    if (/together|collab|partner|join/i.test(lower)) {
      return { actions: [{ type: 'COLLABORATE', params: {}, reasoning: 'Collaboration proposal' }], response: "Collaboration strengthens science." };
    }
    if (/mistake|error|wrong|oops|correction/i.test(lower)) {
      return { actions: [{ type: 'CORRECT', params: {}, reasoning: 'Error correction' }], response: "Acknowledging errors is how science progresses." };
    }

    return { actions: [], response: "Hmm, interesting observation. Tell me more." };
  }
}

export default ResearchActionPlanner;
