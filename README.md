# 🧪 CraftMind Researcher

> AI science lab for Minecraft — form hypotheses, run experiments, publish papers.

## Features

- **Discovery Cycle** — Full pipeline: hypothesis → experiment → analysis → paper
- **Literature Review** — Knowledge gap detection and analogy generation
- **Experiment Engine** — A/B tests, controlled trials with statistical analysis
- **Critic Agent** — Evaluates research rigor, suggests improvements
- **Behavior Scripts** — Distills findings into reusable Minecraft behaviors
- **Citation Network** — Tracks knowledge relationships and dependencies
- **Meta-Learner** — Recommends research domains based on past success
- **Knowledge Base** — Persistent storage with export capabilities

## Quick Start

```bash
npm install
node examples/demo.js    # Run standalone demo
node scripts/playtest.js # Simulated plugin test
npm test                 # Run test suite (43 tests)
```

## API Documentation

### Discovery Cycle (`src/index.js`)
| Function | Description |
|---|---|
| `runCycle(opts)` | Run full research cycle {focusDomain, mineflayerBot, minimumRigor} |
| `registerWithCore(core)` | Register as CraftMind plugin |

### Core Classes
| Class | Module | Description |
|---|---|---|
| `KnowledgeBase` | `knowledge-base.js` | Persistent fact storage |
| `DiscoveryAgent` | `discovery-agent.js` | Hypothesis generation |
| `Experiment` | `experiment.js` | Trial runner with conditions |
| `CriticAgent` | `critic-agent.js` | Research quality evaluator |
| `TeacherAgent` | `teacher-agent.js` | Behavior script creator |
| `DistillerAgent` | `distiller-agent.js` | Finding summarizer |
| `MetaLearner` | `meta-learner.js` | Domain recommendation |
| `CitationNetwork` | `citation-network.js` | Knowledge graph |

### Statistics (`src/statistics.js`)
| Function | Description |
|---|---|
| `tTest(a, b)` | Student's t-test |
| `effectSize(a, b)` | Cohen's d |
| `confidenceInterval(data, conf)` | CI calculation |

## Plugin Integration

```js
import { registerWithCore } from 'craftmind-researcher';
registerWithCore(core); // Registers as 'researcher' plugin
```

## Architecture

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

## Testing

```bash
npm test          # 43 tests, 9 suites
node examples/demo.js
node scripts/playtest.js
```

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed plans.

## CraftMind Ecosystem

| Repo | Description |
|------|-------------|
| [craftmind](https://github.com/CedarBeach2019/craftmind) | 🤖 Core bot framework |
| [craftmind-fishing](https://github.com/CedarBeach2019/craftmind-fishing) | 🎣 Sitka Sound fishing RPG |
| [craftmind-studio](https://github.com/CedarBeach2019/craftmind-studio) | 🎬 AI filmmaking engine |
| [craftmind-courses](https://github.com/CedarBeach2019/craftmind-courses) | 📚 In-game learning system |
| [**craftmind-researcher**](https://github.com/CedarBeach2019/craftmind-researcher) | 🔬 AI research assistant |
| [craftmind-herding](https://github.com/CedarBeach2019/craftmind-herding) | 🐑 Livestock herding AI |
| [craftmind-circuits](https://github.com/CedarBeach2019/craftmind-circuits) | ⚡ Redstone circuit design |
| [craftmind-ranch](https://github.com/CedarBeach2019/craftmind-ranch) | 🌾 Genetic animal breeding |
| [craftmind-discgolf](https://github.com/CedarBeach2019/craftmind-discgolf) | 🥏 Disc golf simulation |

## License

MIT
