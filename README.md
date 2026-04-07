# craftmind-researcher

An agent runtime for autonomous discovery and experimentation in Minecraft. It enables bots to propose hypotheses, run controlled tests, and learn from the results.

---

## Why it exists

Most Minecraft bots follow static scripts or execute predefined tasks. This project provides a different foundation: a runtime where an agent can identify what it doesn't know, design experiments to fill those gaps, and incorporate verified findings into its behavior. The goal is to move from programmed instructions to learned understanding.

> [!NOTE]
> **Current Limitation:** This runtime designs and analyzes experiments, but requires a separate, controllable Minecraft bot (like Baritone) to execute the in-game actions. It's the "mind," not the "body."

## Quick Start

1.  **Fork this repository.** This is your independent copy.
2.  **Deploy to Cloudflare Workers:** `wrangler deploy`
3.  **Add your LLM API key** as a Worker secret: `wrangler secret put ANTHROPIC_API_KEY`
4.  **Connect a Minecraft bot** to execute the experiments the runtime designs.

You can see live agents and discoveries from the community in the public fleet:
👉 [The Fleet](https://the-fleet.casey-digennaro.workers.dev)

---

## How it works

The runtime implements a cycle of observation, experimentation, and validation.
*   **Hypothesis Generation:** The agent reviews its knowledge graph to identify gaps and proposes specific, testable questions.
*   **Experimental Design:** It creates A/B test plans that isolate variables to reduce confounding factors.
*   **Statistical Analysis:** Results are evaluated using confidence intervals and checks for reproducibility.
*   **Knowledge Integration:** Verified discoveries are added to a cited graph and can be compiled into executable behavior scripts.
*   **Peer Review:** A separate critic agent evaluates experiment designs before they are run.

## What to expect

*   **No Hardcoded Game Knowledge:** The agent starts with no pre-programmed facts about Minecraft. Everything is learned.
*   **Stateless & Serverless:** Built for Cloudflare Workers with zero runtime dependencies.
*   **Fork-First Philosophy:** You own and modify your version. There is no central authority.
*   **Direct API Calls:** All LLM calls go directly from your Worker to your provider. No third-party servers.

---

## Architecture

This is a runtime built on the [Cocapn Fleet](https://the-fleet.casey-digennaro.workers.dev) protocol. It handles the reasoning, planning, and analysis layers for an autonomous research agent. Independent agents can share and validate findings across the fleet.

---

## Contributing

Fork the repository and adapt it for your use. Pull requests for core runtime improvements are welcome, but you are never obligated to contribute changes back.

## License

MIT License · Superinstance & Lucineer (DiGennaro et al.)

---

<div align="center">
  <a href="https://the-fleet.casey-digennaro.workers.dev">The Fleet</a> · <a href="https://cocapn.ai">Cocapn</a>
</div>