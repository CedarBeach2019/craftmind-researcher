# Experiment Design Guide

This guide covers how to design rigorous experiments in CraftMind Researcher. Good experiments produce reliable, reproducible knowledge that makes bots smarter.

## The Scientific Method in Minecraft

```
Observe → Hypothesize → Design → Execute → Analyze → Conclude → Share
```

CraftMind automates this cycle, but the quality of the output depends on the quality of the inputs — especially hypothesis design and experiment parameters.

## Anatomy of a Good Hypothesis

A hypothesis should be:

1. **Specific** — Not "farming is better with water" but "farmland within 2 blocks of water produces wheat 30% faster than farmland 4 blocks away"
2. **Testable** — Measurable in-game with available mechanics (time, count, distance, block states)
3. **Falsifiable** — There must be a possible outcome that disproves it
4. **Novel** — Not already in the knowledge base (check before proposing)
5. **Practical** — The experiment can be set up and run within reasonable time/resources

### Examples

| ❌ Weak | ✅ Strong |
|---------|----------|
| "Redstone is useful" | "A 4-tick repeater clock drives a cobblestone generator 15% faster than a 2-tick clock" |
| "Mining is good" | "Branch mining at Y=-59 with 3-block spacing yields 4.3x more diamonds per block mined than Y=11" |
| "Building with concrete is cool" | "Dropping concrete powder through water hardens blocks 64x faster than placing water alongside each block" |

## Experiment Types

### Simple Experiment

Tests a single condition. Good for binary claims (works/doesn't work).

```javascript
new Experiment({
  hypothesis: "Skeletons drop more loot with Looting III",
  domain: "combat",
  type: "simple",
  sampleSize: 10,
  variables: [],
  controls: { weapon: "diamond_sword", difficulty: "hard" }
});
```

### A/B Test

Compares two or more conditions with variable values. Good for optimization questions.

```javascript
new Experiment({
  hypothesis: "3-wide tunnels find more ancient debris than 1-wide",
  domain: "mining",
  type: "ab_test",
  sampleSize: 5,
  variables: [{ name: "tunnel_width", values: [1, 3, 5] }],
  controls: { y_level: -59, biome: "nether_wastes" }
});
```

## Variables & Controls

### Independent Variables

The factors you change between conditions:
- Block type, placement pattern, timing, tool tier, biome, Y-level, etc.

### Dependent Variables (Metrics)

What you measure:
- **Time** — How long an action takes (ms)
- **Count** — Number of items produced, mobs killed, blocks mined
- **Efficiency** — Output per input (diamonds per block mined)
- **Success rate** — Percentage of trials that achieve the goal

### Controls

What stays constant across all conditions:
- Biome, time of day, difficulty, tool tier, starting conditions, etc.

## Sample Size

More trials = more reliable results. Guidelines:

| Confidence Level | Minimum Trials/Condition |
|-----------------|-------------------------|
| Quick screen | 3-5 |
| Moderate confidence | 10-15 |
| High confidence | 20+ |
| Publication quality | 30+ |

## Statistical Best Practices

### Success Rate Comparison

For A/B tests with binary outcomes (success/failure):

- Use the **proportion test**: is the success rate difference statistically significant?
- A difference is generally significant if the 95% confidence intervals don't overlap
- Rule of thumb: need ~100 total trials to detect a 10% difference reliably

### Continuous Metrics

For numeric measurements (time, count, efficiency):

- Report **mean, min, max, and standard deviation**
- Look for outliers — a single 60-second trial among 2-second trials skews results
- The `getSummary()` method computes per-condition statistics automatically

### Avoiding Bias

- **Selection bias**: Randomize trial order across conditions
- **Observer bias**: Automate measurements — don't manually time things
- **Confirmation bias**: Define success/failure criteria *before* running the experiment
- **Small sample fallacy**: Don't conclude from 2 trials that something "always" works

## Experiment Lifecycle

1. **Draft** — Created by DiscoveryAgent with hypothesis, variables, controls
2. **Running** — Trials execute (bot or simulated)
3. **Completed** — Conclusion reached (hypothesis supported or refuted)
4. **Failed** — Experiment couldn't complete (world error, setup issue)

## Integration with the Discovery Cycle

```
DiscoveryAgent.proposeHypothesis()
  → DiscoveryAgent.designExperiment()
    → Experiment (run trials)
      → CriticAgent.evaluate()
        → TeacherAgent.createScript()
          → DistillerAgent.distill()
            → KnowledgeBase.save()
```

The Critic evaluates whether the experiment was rigorous enough. Low scores indicate the experiment needs redesign with more trials, better controls, or different metrics.
