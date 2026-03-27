# CraftMind Researcher - Developer Guide

## Overview

**CraftMind Researcher** is an AI self-improvement system for Minecraft bots. It implements a full scientific discovery pipeline where autonomous agents propose hypotheses, design experiments, analyze results with statistical rigor, and publish research papers — all without human intervention.

The system enables **autonomous discovery** of new Minecraft techniques through:
- **Hypothesis generation** — LLM-powered DiscoveryAgent proposes novel, testable hypotheses
- **Literature review** — Checks knowledge base to avoid re-testing known facts, identifies gaps
- **Experiment design** — Creates controlled experiments with A/B testing and proper controls
- **Statistical analysis** — t-tests, confidence intervals, effect sizes, falsification checks
- **Peer review** — CriticAgent evaluates technique quality and validity
- **Behavior scripts** — TeacherAgent creates executable scripts from validated techniques
- **Knowledge accumulation** — CitationNetwork tracks how discoveries build on each other
- **Meta-learning** — Recommends research domains based on historical success rates

## Architecture

The system follows a **pipeline architecture** with specialized agents at each stage:

```
┌──────────────────────────────────────────────────┐
│              CraftMind Researcher                 │
├──────────────────────────────────────────────────┤
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Discovery  │  │Experi-   │  │  Statistical│ │
│  │ Agent      │→ │ment      │→ │  Analysis   │ │
│  │(hypotheses)│  │(trials)  │  │  (t-test)   │ │
│  └─────┬──────┘  └────┬─────┘  └──────┬──────┘ │
│        │              │               │        │
│        ▼              ▼               ▼        │
│  ┌──────────────────────────────────────────┐   │
│  │        Research Pipeline                 │   │
│  │  Review → Design → Run → Analyze → Paper │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                           │
│  ┌──────────┐ ┌─────┴──────┐ ┌────────────┐   │
│  │  Critic  │ │  Behavior  │ │    Meta    │   │
│  │  Agent   │ │  Scripts   │ │  Learner   │   │
│  └──────────┘ └────────────┘ └────────────┘   │
│                                                  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ Knowledge Base  │  │  Citation Network   │  │
│  └─────────────────┘  └──────────────────────┘  │
├──────────────────────────────────────────────────┤
│              registerWithCore(core)              │
└──────────────────────────────────────────────────┘
```

### Key Agents

**DiscoveryAgent** (`src/discovery-agent.js`)
- Proposes hypotheses using LLM (GLM-4.7-Flash)
- Performs literature review to ensure novelty
- Designs experiments with proper controls
- Identifies knowledge gaps and generates analogies

**CriticAgent** (`src/critic-agent.js`)
- Evaluates techniques on 4 dimensions: efficiency, reliability, creativity, generalizability
- Identifies edge cases and suggests improvements
- Returns structured scores (0-1) with verdict

**TeacherAgent** (`src/teacher-agent.js`)
- Creates behavior scripts from validated techniques
- Breaks complex techniques into executable actions
- Annotates scripts with explanations

**DistillerAgent** (`src/distiller-agent.js`)
- Compresses scripts to minimal essential actions
- Removes experiment artifacts (observations, measurements)
- Optimizes for production use

### Core Infrastructure

**CitationNetwork** (`src/citation-network.js`)
- Tracks how discoveries build on each other
- Supports relations: `builds_on`, `contradicts`, `extends`, `refines`, `replicates`
- Provides ancestry chains and impact metrics
- Exports to DOT format for visualization

**KnowledgeBase** (`src/knowledge-base.js`)
- Persistent JSON storage for discovered techniques
- Domain-based queries with score filtering
- Tracks revision history
- Pre-seeded with initial facts

**MetaLearner** (`src/meta-learner.js`)
- Records outcomes of experiments
- Recommends next research domain
- Balances success rate vs exploration bonus
- Persistent state tracking

**Experiment** (`src/experiment.js`)
- Full experiment lifecycle with A/B testing support
- Statistical analysis: t-tests, proportion tests, Cohen's d
- Falsification criteria and reproducibility context
- Failure tracking with lessons learned

## File Structure

```
src/
├── index.js                 # Main entry point, runCycle() orchestrator
├── discovery-agent.js       # Hypothesis generation & experiment design
├── critic-agent.js          # Technique evaluation & scoring
├── teacher-agent.js         # Behavior script creation
├── distiller-agent.js       # Script optimization
├── meta-learner.js          # Domain recommendation
├── citation-network.js      # Knowledge graph
├── knowledge-base.js        # Persistent fact storage
├── experiment.js            # Experiment framework with stats
├── research-paper.js        # Paper generation & markdown export
├── behavior-script.js       # Script format & validation
├── literature-review.js     # Knowledge gap detection
├── experiment-validator.js  # Design validation
├── statistics.js            # t-test, effect size, CI
├── knowledge-export.js      # Export utilities
├── ai/
│   ├── research-agents.js   # NPC researcher personalities
│   ├── experiment-evaluator.js
│   ├── peer-review-system.js
│   └── hypothesis-tracker.js
examples/
├── demo.js                  # Standalone demo
├── run-discovery.js         # Run discovery cycle
└── query-knowledge.js       # Query KB
tests/
├── test-all.js              # Test runner
├── integration.test.js      # Integration tests
└── test-ai.js               # AI agent tests
knowledge/
├── initial-facts.json       # Pre-seeded facts
├── building-techniques.json # Building domain facts
├── citations.json           # Citation graph
├── meta-learner-state.json  # Meta-learning state
└── discovered/              # Discovered techniques (JSON)
```

## State

The system persists several types of state:

**Knowledge Base** (`knowledge/discovered/*.json`)
- Individual JSON files per discovered technique
- Fields: `id`, `domain`, `statement`, `score`, `verified`, `behaviorScript`, `paper`, `experimentData`, `literatureReview`, `falsificationCriterion`

**Citation Network** (`knowledge/citations.json`)
- Array of citation edges: `{from, to, relation, note, timestamp}`

**Meta-Learner State** (`knowledge/meta-learner-state.json`)
- `domainStats`: per-domain experiment counts and success rates
- `strategyLog`: history of all experiments
- `totalExperiments`, `totalDiscoveries`

**Initial Facts** (`knowledge/initial-facts.json`, `knowledge/building-techniques.json`)
- Pre-seeded knowledge about Minecraft mechanics
- Used for literature review and hypothesis generation

## 5 Potential Improvements

1. **Real Minecraft Integration** — Currently uses demo/simulated results. Integrate with actual mineflayer bot execution for in-world experiments.

2. **Multi-Agent Debate** — Leverage the NPC research agent personalities (`src/ai/research-agents.js`) for peer review. Currently defined but not integrated into the main cycle.

3. **Hypothesis Tracker** (`src/ai/hypothesis-tracker.js`) — Track hypotheses over time to identify patterns in what types of hypotheses tend to be supported.

4. **Experiment Evaluator** (`src/ai/experiment-evaluator.js`) — More sophisticated experiment design evaluation, detecting confounds and suggesting controls.

5. **Web Dashboard** — Visual exploration of citation network, experiment history, and domain performance. Currently CLI-only.

## Core Integration

The researcher integrates with CraftMind Core via `registerWithCore()`:

```javascript
import { registerWithCore } from 'craftmind-researcher';

registerWithCore(core); // Registers as 'researcher' plugin
```

This exposes:
- `runCycle(opts)` — Main discovery cycle orchestrator
- `KnowledgeBase` — Fact storage and queries
- `DiscoveryAgent` — Hypothesis proposal
- `Experiment` — Trial runner
- `CriticAgent` — Quality evaluation
- `TeacherAgent` / `DistillerAgent` — Script creation
- `MetaLearner` — Domain recommendations
- `CitationNetwork` — Knowledge graph

### Run Cycle Options

```javascript
await runCycle({
  focusDomain: 'farming',      // Optional: focus on specific domain
  mineflayerBot: bot,          // Optional: real bot for in-world experiments
  minimumRigor: 'moderate',    // 'quick', 'moderate', 'high'
  simulatedResults: null       // Optional: provide pre-generated results
});
```

The cycle returns: `{ experiment, hypothesis, evaluation, technique, paper, behaviorScript, analysis }`

## Testing

```bash
npm test          # Run all tests (43 tests)
node examples/demo.js    # Standalone demo
node scripts/playtest.js # Plugin integration test
```

## Environment Variables

- `ZAI_API_KEY` — Optional. If not provided, system uses fallback hypothesis generators and deterministic responses.
