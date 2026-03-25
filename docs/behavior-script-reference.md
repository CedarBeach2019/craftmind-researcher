# Behavior Script Reference

Behavior scripts are JSON documents that describe sequences of actions a Minecraft bot can execute **without any LLM calls**. They are the output of the Researcher's discovery cycle — distilled, tested, production-ready instruction sets.

## Format

```json
{
  "version": "1.0",
  "createdAt": "2026-03-25T00:00:00.000Z",
  "metadata": {
    "name": "Waterfall Farm Irrigation",
    "domain": "farming",
    "techniqueId": "exp-a1b2c3d4"
  },
  "actions": [ ... ]
}
```

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Human-readable technique name |
| `domain` | string | One of: mining, building, farming, combat, redstone, exploration |
| `techniqueId` | string\|null | Experiment ID that discovered this technique |
| `distilled` | boolean | Whether this script has been optimized by the Distiller agent |

## Actions

Each action in the `actions` array is an object with at minimum an `action` field.

### Core Actions

| Action | Fields | Description |
|--------|--------|-------------|
| `moveTo` | `target` | Move to a position, entity, or named location |
| `lookAt` | `target` | Face a position, entity, or direction |
| `place` | `item`, `target` | Place a block or item at target location |
| `break` | `target` | Break a block at target location |
| `use` | `item`, `target` | Use an item (right-click): bucket, food, etc. |
| `equip` | `item` | Switch to an item in hotbar |
| `attack` | `target` | Attack an entity |
| `jump` | — | Perform a jump |
| `sneak` | — | Toggle sneaking |

### Timing & Observation

| Action | Fields | Description |
|--------|--------|-------------|
| `wait` | `ms` | Wait for specified milliseconds |
| `observe` | `what` | Record an observation (for experiment scripts) |

### Inventory

| Action | Fields | Description |
|--------|--------|-------------|
| `drop` | `item`, `count` | Drop items from inventory |
| `pickup` | `target` | Pick up items from ground |
| `craft` | `item`, `count` | Craft items from available materials |
| `smelt` | `item`, `count` | Smelt items in a furnace |

## Conditional Logic

Actions support conditional branching with `condition`, `then`, and `else`:

```json
{
  "action": "observe",
  "what": "crop_growth",
  "condition": "crop.stage >= 7",
  "then": [
    { "action": "break", "target": "wheat_crop" },
    { "action": "equip", "item": "wheat_seeds" },
    { "action": "use", "item": "wheat_seeds" }
  ],
  "else": [
    { "action": "wait", "ms": 5000 }
  ]
}
```

### Condition Syntax

Conditions are string expressions evaluated against the bot's current state:

- `inventory.count('wheat') > 10` — check inventory
- `blockAt(x, y, z) == 'water'` — check world state
- `health < 10` — check bot status
- `crop.stage >= 7` — check crop growth stage

## Variables

Scripts can reference variables with `$variable` syntax. Variables are resolved at execution time:

```json
{
  "action": "place",
  "item": "$crop_type",
  "target": "$target_block"
}
```

Variables can be set via `blockUntil` conditions or passed as parameters when executing the script.

## Repeated Actions

Use the `times` field to repeat an action:

```json
{
  "action": "place",
  "item": "dirt",
  "target": "forward",
  "times": 10
}
```

## Blocking / Waiting

Use `blockUntil` to wait for a condition before proceeding:

```json
{
  "action": "moveTo",
  "target": "furnace",
  "blockUntil": "inventory.has('iron_ingot')"
}
```

## Validation

Use `validateScript()` from `behavior-script.js` to check a script:

```javascript
import { validateScript } from './src/behavior-script.js';
const result = validateScript(script);
console.log(result.valid, result.errors);
```

## Serialization

```javascript
import { serializeScript, parseScript } from './src/behavior-script.js';

const json = serializeScript(script);  // → string
const obj = parseScript(json);          // → object
```
