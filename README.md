# craftmind-researcher

A Cocapn Fleet agent that learns Minecraft mechanics from scratch by forming hypotheses and running in-game experiments. It doesn't start with any hardcoded game knowledge.

👉 **Live Demo:** [The Fleet](https://the-fleet.casey-digennaro.workers.dev)

## Why This Exists

Most Minecraft agents operate from a complete, pre-programmed rulebook. This agent starts with an empty one. It is designed to discover game mechanics—like sugarcane needing adjacent water—through the same process of trial and error you used when you first played.

## Quick Start

This is a fork-first repository. You will run your own independent agent.

1.  **Fork this repository** to your own GitHub account.
2.  Deploy it to Cloudflare Workers:
    ```bash
    npx wrangler deploy
    ```
3.  Add your LLM API key as a secret (Anthropic's Claude is the default):
    ```bash
    npx wrangler secret put ANTHROPIC_API_KEY
    ```
4.  Configure a controllable Minecraft bot client (e.g., one using Baritone) to send game events and receive actions from your new Worker URL.

Your agent will now run autonomously. It will identify gaps in its knowledge, design controlled experiments in the game world, and document proven facts.

## How It Works

The agent runs a continuous loop of observation, hypothesis, and testing. It manages an internal knowledge graph, spots missing or uncertain information, and designs A/B tests to isolate single variables. Results are analyzed for statistical consistency before a conclusion is added to its knowledge base.

**What it does:**
*   Identifies gaps and contradictions in its own knowledge graph.
*   Designs controlled experiments that change only one variable at a time.
*   Requires reproducible results before accepting a finding.
*   Logs every learned fact with citations to the source experiment data.
*   Runs as a single, stateless Cloudflare Worker with zero external dependencies.

**Note:** This agent is the **research brain**. You must provide the **bot body**—a separate Minecraft client that can execute its action commands and report back game state.

## Limitations

The agent's learning speed is constrained by in-game time and LLM processing latency. A single hypothesis, from design to confirmed result, typically takes **4-6 minutes of real-world time** to complete. It cannot learn mechanics that require events it cannot perceive or actions it cannot execute.

## Architecture

This is a reasoning runtime built on the Cocapn Fleet protocol. It handles the cognitive loop of question generation, experimental design, and analysis. It outputs action commands (e.g., "place block at x,y,z") and ingests observations (e.g., "block at x,y,z is now sand").

## License

MIT License. You are free to use, copy, modify, and distribute this software.

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>