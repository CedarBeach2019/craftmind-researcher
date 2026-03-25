# CraftMind Researcher 🧪

> AI self-improvement system where Minecraft bots discover, learn, and teach new techniques autonomously.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch) — an AI agent that runs experiments, learns, and improves itself. Applied to Minecraft: bots that discover optimal building techniques, combat strategies, farming automation, and more.

## Quick Start

```bash
npm install
cp .env.example .env   # Optional: add your ZAI_API_KEY
npm start              # Run a single discovery cycle
npm run demo           # Run with farming focus
npm test               # Run test suite (27 tests)
```

Without `ZAI_API_KEY`, the system operates in **offline fallback mode** — it still runs the full cycle with built-in hypotheses and scripts.

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

## The 4-Agent Discovery Cycle

Each cycle runs 8 steps through 4 specialized agents plus a meta-learner:

### 1. 🔬 Discovery Agent (Researcher)

**Role:** Proposes hypotheses and designs experiments.

- Reads the knowledge base to understand what's already known
- Proposes specific, testable hypotheses (e.g., "water placed diagonally hydrates farmland 40% further")
- Designs experiments with proper variables, controls, sample sizes, and success/failure criteria
- Supports both **simple experiments** (binary claims) and **A/B tests** (multi-condition comparisons)
- Uses LLM for creative hypothesis generation; falls back to built-in templates offline

### 2. 👩🏫 Teacher Agent

**Role:** Creates executable behavior scripts from validated techniques.

- Takes a confirmed hypothesis and its experiment data
- Produces a step-by-step action sequence a bot can follow
- Annotates scripts with explanations for educational purposes
- Uses LLM for script generation; falls back to domain-specific templates offline

### 3. 🔍 Critic Agent

**Role:** Rigorously evaluates discovered techniques.

- Scores techniques on 4 dimensions (0–1 each):
  - **Efficiency** — Does this actually save time/resources?
  - **Reliability** — Does it work consistently? Edge cases?
  - **Creativity** — Is this a novel insight, or obvious?
  - **Generalizability** — Does it work across biomes/conditions?
- Provides overall score, verdict, edge cases, and improvement suggestions
- Validates that the behavior script correctly implements the technique

### 4. 🧊 Distiller Agent

**Role:** Compresses verbose scripts into minimal, production-ready action sequences.

- Strips experiment artifacts (observations, setup steps)
- Keeps only the essential actions needed to apply the technique
- Produces compact JSON that bots can execute without LLM calls
- Generates one-line summaries for knowledge base entries

### 5. 🧠 Meta-Learner (Orchestrator)

**Role:** Allocates research budget based on historical outcomes.

- Tracks which domains yield high-scoring discoveries
- Recommends the next domain to explore using a weighted strategy:
  - 60% weight on success rate (domains that produce verified techniques)
  - 40% weight on exploration bonus (under-explored domains get priority)
- Persists state across sessions to improve over time
- Records every experiment outcome for analysis

## Experiment Framework

Experiments follow the scientific method:

```
Hypothesis → Setup → Execution → Observation → Conclusion
```

### Features

- **A/B testing** with multiple conditions and variable combinations
- **Controls** — define what stays constant across trials
- **Sample sizes** — configurable number of trials per condition
- **Statistical summaries** — per-condition mean, min, max, success rate
- **Lifecycle tracking** — draft → running → completed → failed
- **Full serialization** — experiments can be saved and replayed

See [docs/experiment-guide.md](docs/experiment-guide.md) for detailed experiment design principles.

## Knowledge Base

The knowledge base is a persistent JSON store for discovered techniques.

### Structure

```
knowledge/
├── initial-facts.json          # Pre-seeded Minecraft facts (8 facts)
├── building-techniques.json    # Building-specific knowledge (6 facts)
├── meta-learner-state.json     # Auto-generated meta-learning state
└── discovered/                 # Auto-generated technique files
    ├── exp-a1b2c3d4.json
    └── ...
```

### Operations

```javascript
import { KnowledgeBase } from './src/index.js';

const kb = new KnowledgeBase();

// Save a technique
kb.save({ id: 'my-technique', domain: 'farming', statement: '...', score: 0.8, verified: true });

// Query
kb.query({ domain: 'farming', minScore: 0.5, verifiedOnly: true });

// Stats
kb.stats(); // { total: 14, avgScore: 0.87, verified: 8, byDomain: {...} }
```

### Knowledge Sharing with CraftMind Core

Discovered techniques are saved as behavior scripts in the knowledge base. CraftMind Core bots can:

1. **Query** the knowledge base for techniques by domain and minimum score
2. **Execute** distilled behavior scripts directly (no LLM needed) — scripts are compact JSON action sequences
3. **Learn** new techniques as the Researcher discovers them — the knowledge base is updated in real-time
4. **Contribute** observations back — bots that execute scripts can report results, feeding future experiments

The knowledge base is shared via JSON files in `knowledge/discovered/`, making it easy to sync across bot instances using any file sync method.

## Behavior Scripts

Behavior scripts are the executable output of the discovery cycle — distilled, tested instruction sets that bots can follow without LLM calls.

### Supported Actions

| Category | Actions |
|----------|---------|
| Movement | `moveTo`, `lookAt`, `jump`, `sneak` |
| Interaction | `place`, `break`, `use`, `equip`, `attack` |
| Timing | `wait`, `blockUntil` |
| Observation | `observe` |
| Inventory | `drop`, `pickup`, `craft`, `smelt` |

### Features

- **Conditional logic** — `condition`, `then`, `else` branches
- **Variables** — `$variable` syntax resolved at execution time
- **Repetition** — `times` field for looped actions
- **Validation** — built-in script validation via `validateScript()`

See [docs/behavior-script-reference.md](docs/behavior-script-reference.md) for the complete reference.

## Meta-Learning

The meta-learner is the system's self-improvement mechanism. It analyzes which research strategies yield the best results:

### How It Works

1. After each cycle, the meta-learner records: domain, hypothesis, critic score
2. It maintains per-domain statistics: experiment count, average score, success rate
3. It recommends the next domain using: `score = (success_rate × 0.6) + (exploration_bonus × 0.4)`
4. State persists across sessions in `knowledge/meta-learner-state.json`

### Why It Matters

Without meta-learning, the system would explore domains randomly. With it, the system **learns to learn** — it allocates more research budget to domains that consistently produce high-quality discoveries while still exploring new domains.

Over time, the knowledge base becomes increasingly dense with high-quality, verified techniques in the most productive domains.

## Knowledge Domains

- ⛏️ **Mining** — Ore discovery, tool efficiency, tunnel patterns
- 🏗️ **Building** — Water flow, lighting, block placement, scaffolding
- 🌾 **Farming** — Crop growth, hydration, automation
- ⚔️ **Combat** — Damage optimization, mob AI exploits
- 🔴 **Redstone** — Circuit design, timing, automation
- 🧭 **Exploration** — Navigation, biome patterns, structure finding

## Pre-Seeded Knowledge

The researcher starts with 14 Minecraft facts across two files:

- `knowledge/initial-facts.json` — 8 general facts (water flow, crop requirements, tool tiers, etc.)
- `knowledge/building-techniques.json` — 6 building-specific facts (scaffolding, concrete, slab techniques, etc.)

Each fact includes source attribution and reasoning chains.

## Examples

```bash
# Run a discovery cycle
node examples/run-discovery.js

# Run focused on a specific domain
node examples/run-discovery.js farming

# Query the knowledge base
node examples/query-knowledge.js
node examples/query-knowledge.js --verified
node examples/query-knowledge.js mining 0.5
```

## Project Structure

```
craftmind-researcher/
├── src/
│   ├── index.js              # Main entry point & cycle orchestrator
│   ├── discovery-agent.js    # Hypothesis generation & experiment design
│   ├── teacher-agent.js      # Behavior script creation
│   ├── critic-agent.js       # Technique evaluation & scoring
│   ├── distiller-agent.js    # Script optimization & summarization
│   ├── meta-learner.js       # Research budget allocation
│   ├── experiment.js         # Experiment framework
│   ├── behavior-script.js    # Script creation, validation, serialization
│   └── knowledge-base.js     # Persistent knowledge store
├── tests/
│   └── test-all.js           # 27 unit tests
├── docs/
│   ├── behavior-script-reference.md
│   └── experiment-guide.md
├── examples/
│   ├── run-discovery.js
│   └── query-knowledge.js
├── knowledge/
│   ├── initial-facts.json
│   ├── building-techniques.json
│   └── discovered/           # Auto-generated
├── .env.example
├── LICENSE
└── README.md
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No LLM responses | Set `ZAI_API_KEY` in `.env` — system falls back to templates without it |
| "Knowledge base empty" | Ensure `knowledge/initial-facts.json` exists; run from project root |
| Meta-learner state corrupted | Delete `knowledge/meta-learner-state.json` to reset |
| Tests failing | Run `node --test tests/test-all.js` and check output; meta-learner state may need reset |
| Scripts not being distilled | Check that experiment has a conclusion; distiller requires `experiment.conclusion.text` |
| Low critic scores | Review the experiment — small sample sizes or no controls reduce reliability scores |

## License

MIT
