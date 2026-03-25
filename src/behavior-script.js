/**
 * Behavior script format for Minecraft bots.
 * Sequential or conditional action sequences that bots can execute without LLM calls.
 *
 * @typedef {Object} BehaviorAction
 * @property {string} action - Action type (lookAt, place, break, moveTo, wait, observe, use, equip, attack, jump, sneak, etc.)
 * @property {*} [target] - Target block/entity/direction.
 * @property {string} [item] - Item to use/place/equip.
 * @property {number} [ms] - Duration in milliseconds (for wait).
 * @property {string} [what] - What to observe.
 * @property {BehaviorAction[]} [then] - Sub-actions on success.
 * @property {BehaviorAction[]} [else] - Sub-actions on failure.
 * @property {string} [condition] - Conditional expression.
 * @property {number} [times] - Repeat count.
 * @property {string} [blockUntil] - Wait until condition is true.
 */

/**
 * Create a behavior script from an action array.
 * @param {BehaviorAction[]} actions
 * @param {object} [metadata] - Script metadata.
 * @returns {object} The behavior script object.
 */
export function createScript(actions, metadata = {}) {
  return {
    version: '1.0',
    createdAt: new Date().toISOString(),
    metadata: {
      name: metadata.name || 'unnamed',
      domain: metadata.domain || 'general',
      techniqueId: metadata.techniqueId || null,
      ...metadata,
    },
    actions,
  };
}

/**
 * Validate a behavior script.
 * @param {object} script
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScript(script) {
  const errors = [];
  if (!script.version) errors.push('Missing version');
  if (!Array.isArray(script.actions)) errors.push('Missing or invalid actions array');
  if (Array.isArray(script.actions)) {
    for (let i = 0; i < script.actions.length; i++) {
      if (!script.actions[i].action) errors.push(`Action at index ${i} missing "action" field`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Serialize a script to JSON string.
 * @param {object} script
 * @returns {string}
 */
export function serializeScript(script) {
  return JSON.stringify(script, null, 2);
}

/**
 * Parse a script from JSON string.
 * @param {string} json
 * @returns {object}
 */
export function parseScript(json) {
  return JSON.parse(json);
}
