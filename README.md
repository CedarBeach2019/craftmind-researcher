# CraftMind Researcher 🧪

> AI self-improvement system where Minecraft bots discover, learn, and teach new techniques autonomously.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) — an AI agent that runs experiments, learns, and improves itself. Applied to Minecraft: bots that discover optimal building techniques, combat strategies, farming automation, and more.

## Architecture

```
                    ┌─────────────────────┐
                    │   Knowledge Base     │
                    │  (persistent JSON)   │
                    └─────────┬───────────┘
                              │ feeds context
                              ▼
┌──────────┐    ┌─────────────┴─────────────┐    ┌──────────┐
│ Researcher│───▶│      Experiment          │───▶│  Teacher  │
│  Agent    │    │    Framework             │    │  Agent    │
└──────────┘    └───────────────────────────┘    └─────┬────┘
      ▲                                               │
      │              ┌──────────┐                     │
      │              │  Critic   │◀────────────────────┤
      │              │  Agent    │                     ▼
      │              └─────┬────┘              ┌──────────┐
      │                    │                   │Distiller │
      │                    ▼                   │  Agent    │
      │              ┌──────────┐              └─────┬────┘
      └──────────────│  Meta-   │◀──────────────────┘
                     │ Learner  │  (saves distilled scripts)
                     └──────────┘
```

## The 4-Agent Cycle

1. **🔬 Researcher** — Connects to an LLM to propose hypotheses ("placing water diagonally hydrates more farmland"), designs experiments with proper variables and controls.

2. **👩‍🏫 Teacher** — Takes a validated technique and creates a step-by-step behavior script that other bots can follow. Annotates each action with explanations.

3. **🔍 Critic** — Rigorously evaluates: is the conclusion actually supported? Edge cases? Biome-specific? Scores on efficiency, reliability, creativity, and generalizability (0–1 each).

4. **🧊 Distiller** — Compresses verbose demonstration scripts into minimal, production-ready action sequences. Strips experiment artifacts, keeps only what's needed.

The **Meta-Learner** watches all outcomes and allocates research budget — domains that yield more useful discoveries get more experiments.

## Getting Started

```bash
npm install
npm start              # Run a single discovery cycle
npm run demo           # Run with farming focus
```

Set `ZAI_API_KEY` for real LLM-powered research. Without it, the system uses built-in fallback hypotheses and scripts.

## Integration with CraftMind Core

Discovered techniques are saved as behavior scripts in the knowledge base. CraftMind Core bots can:

1. **Query** the knowledge base for techniques by domain and minimum score
2. **Execute** distilled behavior scripts directly (no LLM needed)
3. **Learn** new techniques as the Researcher discovers them
4. **Contribute** observations back — bots that execute scripts can report results

The knowledge base is shared via JSON files in `knowledge/discovered/`, making it easy to sync across bot instances.

## Experiment Framework

Experiments follow the scientific method:

```
Hypothesis → Setup → Execution → Observation → Conclusion
```

Supports **A/B testing** with multiple conditions, variable tracking, controls, sample sizes, and statistical summaries.

## Knowledge Domains

- ⛏️ **Mining** — Ore discovery, tool efficiency, tunnel patterns
- 🏗️ **Building** — Water flow, lighting, block placement
- 🌾 **Farming** — Crop growth, hydration, automation
- ⚔️ **Combat** — Damage optimization, mob AI exploits
- 🔴 **Redstone** — Circuit design, timing, automation
- 🧭 **Exploration** — Navigation, biome patterns, structure finding

## Pre-Seeded Knowledge

The researcher starts with basic Minecraft facts (`knowledge/initial-facts.json`):
- Water flows 7 blocks
- Crops need light level 9+
- Farmland within 4 blocks of water is hydrated
- Tool tiers affect mining speed
- Torches prevent mob spawning in 7-block radius
- And more...

## License

MIT
