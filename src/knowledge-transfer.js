/**
 * Cross-Game Knowledge Transfer — adapt techniques from one game to another.
 *
 * Takes a technique from a source game and adapts it for a target game
 * using analogy mapping between game mechanics.
 *
 * Example: 'patient fishing technique' → 'patient herding strategy'
 *
 * @module craftmind-researcher/knowledge-transfer
 */

import { randomUUID } from 'node:crypto';

/**
 * Game mechanic mappings for common patterns.
 * These define analogies between similar mechanics across games.
 */
const MECHANIC_MAPPINGS = {
  minecraft: {
    // Resource gathering
    'fishing': {
      terraria: ['fishing', 'critter_catching'],
      stardew_valley: ['fishing', 'foraging'],
    },
    'mining': {
      terraria: ['mining', 'excavation'],
      factorio: ['mining', 'resource_extraction'],
    },
    'farming': {
      stardew_valley: ['farming', 'crop_cultivation'],
      terraria: ['farming', 'npc_housing'],
    },
    'combat': {
      terraria: ['combat', 'boss_fights'],
      factorio: ['combat', 'turret_defense'],
    },
    'building': {
    terraria: ['building', 'npc_housing'],
    factorio: ['building', 'construction'],
    },
    // Behavior patterns
    'patient_approach': {
      stardew_valley: ['timing', 'patience'],
      terraria: ['waiting', 'timing'],
    },
    'pattern_recognition': {
      stardew_valley: ['observation', 'pattern_learning'],
      terraria: ['pattern_recognition', 'mechanic_understanding'],
    },
    'resource_optimization': {
      factorio: ['optimization', 'efficiency'],
      stardew_valley: ['resource_management', 'planning'],
    },
  },

  terraria: {
    'fishing': {
      minecraft: ['fishing'],
      stardew_valley: ['fishing'],
    },
    'boss_fights': {
      minecraft: ['combat', 'boss_battles'],
      factorio: ['defense', 'wave_survival'],
    },
    'npc_happiness': {
      stardew_valley: ['villager_relationships'],
      minecraft: ['villager_trading'],
    },
  },

  stardew_valley: {
    'farming': {
      minecraft: ['farming'],
      terraria: ['farming'],
    },
    'social_relationships': {
      minecraft: ['villager_trading'],
      terraria: ['npc_happiness'],
    },
    'mining': {
      minecraft: ['mining'],
      terraria: ['mining'],
    },
  },

  factorio: {
    'automation': {
      minecraft: ['redstone', 'farm_automation'],
      terraria: ['trap_wiring', 'statue_farming'],
    },
    'logistics': {
      minecraft: ['item_transport', 'hopper_systems'],
      terraria: ['item_teleportation', 'inventory_management'],
    },
  },
};

/**
 * Behavior pattern templates for transfer.
 */
const BEHAVIOR_TEMPLATES = {
  timing_based: {
    description: 'Wait for specific timing or pattern before action',
    adapter: (source, target) => ({
      approach: 'Observe and wait for the optimal moment',
      source_pattern: source.pattern,
      target_adaptation: `Apply ${source.pattern} timing to ${target} context`,
    }),
  },
  resource_optimization: {
    description: 'Maximize output while minimizing input',
    adapter: (source, target) => ({
      approach: 'Balance efficiency with resource constraints',
      source_pattern: source.pattern,
      target_adaptation: `Adapt resource optimization for ${target} mechanics`,
    }),
  },
  spatial_awareness: {
    description: 'Use positional information to optimize results',
    adapter: (source, target) => ({
      approach: 'Position matters — find optimal placement',
      source_pattern: source.pattern,
      target_adaptation: `Apply spatial logic to ${target} context`,
    }),
  },
  pattern_recognition: {
    description: 'Identify and exploit repeating patterns',
    adapter: (source, target) => ({
      approach: 'Learn patterns, predict outcomes, act accordingly',
      source_pattern: source.pattern,
      target_adaptation: `Transfer pattern recognition to ${target} mechanics`,
    }),
  },
};

/**
 * Knowledge Transfer System.
 */
export class KnowledgeTransfer {
  /**
   * @param {object} opts
   * @param {string} [opts.defaultTargetGame='minecraft'] - Default target game
   * @param {boolean} [opts.strictMapping=true] - Require explicit mechanic mappings
   */
  constructor(opts = {}) {
    this.defaultTargetGame = opts.defaultTargetGame || 'minecraft';
    this.strictMapping = opts.strictMapping !== false;
    this.transfers = [];
  }

  /**
   * Transfer a technique from source game to target game.
   * @param {string} sourceGame - Source game name
   * @param {string} targetGame - Target game name
   * @param {object} technique - Technique to transfer
   * @param {object} opts - Options
   * @returns {object} Transferred technique
   */
  transfer(sourceGame, targetGame, technique, opts = {}) {
    const transferId = randomUUID();

    // Normalize game names
    const source = this._normalizeGameName(sourceGame);
    const target = this._normalizeGameName(targetGame);

    // Find mechanic mapping
    const mapping = this._findMechanicMapping(source, target, technique);

    if (!mapping && this.strictMapping) {
      throw new Error(`No mechanic mapping found from ${source} to ${target} for technique domain: ${technique.domain || 'unknown'}`);
    }

    // Identify behavior pattern
    const pattern = this._identifyBehaviorPattern(technique);

    // Adapt the technique
    const adapted = this._adaptTechnique(technique, mapping, pattern, source, target);

    const transferred = {
      id: transferId,
      sourceGame: source,
      targetGame: target,
      originalTechnique: {
        id: technique.id,
        statement: technique.statement,
        domain: technique.domain,
      },
      adaptedTechnique: adapted,
      mapping: mapping || null,
      behaviorPattern: pattern || null,
      confidence: this._calculateTransferConfidence(mapping, pattern, technique),
      metadata: {
        transferredAt: new Date().toISOString(),
        strictMode: this.strictMapping,
      },
    };

    this.transfers.push(transferred);
    return transferred;
  }

  /**
   * Find all valid transfers for a technique.
   * @param {object} technique - Technique to analyze
   * @param {string[]} [targetGames] - Specific target games to check
   * @returns {object[]} Array of potential transfers
   */
  findPotentialTransfers(technique, targetGames = null) {
    const potentials = [];
    const targets = targetGames || Object.keys(MECHANIC_MAPPINGS);

    for (const sourceGame of Object.keys(MECHANIC_MAPPINGS)) {
      if (technique.game && technique.game !== sourceGame) continue;

      for (const targetGame of targets) {
        if (sourceGame === targetGame) continue;

        try {
          const transfer = this.transfer(sourceGame, targetGame, { ...technique, game: sourceGame });
          potentials.push(transfer);
        } catch (err) {
          // Skip invalid transfers
          continue;
        }
      }
    }

    // Sort by confidence
    return potentials.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get transfer statistics.
   * @returns {object}
   */
  getStats() {
    const bySource = {};
    const byTarget = {};

    for (const t of this.transfers) {
      bySource[t.sourceGame] = (bySource[t.sourceGame] || 0) + 1;
      byTarget[t.targetGame] = (byTarget[t.targetGame] || 0) + 1;
    }

    return {
      totalTransfers: this.transfers.length,
      bySource,
      byTarget,
      averageConfidence: this.transfers.length > 0
        ? this.transfers.reduce((sum, t) => sum + t.confidence, 0) / this.transfers.length
        : 0,
    };
  }

  /**
   * Clear transfer history.
   */
  reset() {
    this.transfers = [];
  }

  // ─── Internal Methods ────────────────────────────────────────────

  /**
   * Normalize game name.
   * @private
   */
  _normalizeGameName(name) {
    return name.toLowerCase().replace(/[\s-]/g, '_');
  }

  /**
   * Find mechanic mapping between games.
   * @private
   */
  _findMechanicMapping(source, target, technique) {
    const sourceMappings = MECHANIC_MAPPINGS[source];
    if (!sourceMappings) return null;

    // Try to find mapping by domain
    if (technique.domain && sourceMappings[technique.domain]) {
      const targetMechanics = sourceMappings[technique.domain][target];
      if (targetMechanics && targetMechanics.length > 0) {
        return {
          sourceDomain: technique.domain,
          targetMechanics,
          confidence: 0.8,
        };
      }
    }

    // Try to infer domain from statement
    const statement = technique.statement?.toLowerCase() || '';
    for (const [domain, targets] of Object.entries(sourceMappings)) {
      if (statement.includes(domain) && targets[target]) {
        return {
          sourceDomain: domain,
          targetMechanics: targets[target],
          confidence: 0.6,
        };
      }
    }

    return null;
  }

  /**
   * Identify the behavior pattern of a technique.
   * @private
   */
  _identifyBehaviorPattern(technique) {
    const statement = (technique.statement || '').toLowerCase();
    const description = (technique.description || '').toLowerCase();

    // Check for pattern keywords
    if (statement.includes('wait') || statement.includes('timing') || statement.includes('patient')) {
      return { type: 'timing_based', template: BEHAVIOR_TEMPLATES.timing_based };
    }

    if (statement.includes('efficient') || statement.includes('optimal') || statement.includes('maximize')) {
      return { type: 'resource_optimization', template: BEHAVIOR_TEMPLATES.resource_optimization };
    }

    if (statement.includes('position') || statement.includes('place') || statement.includes('near')) {
      return { type: 'spatial_awareness', template: BEHAVIOR_TEMPLATES.spatial_awareness };
    }

    if (statement.includes('pattern') || statement.includes('recognize') || statement.includes('predict')) {
      return { type: 'pattern_recognition', template: BEHAVIOR_TEMPLATES.pattern_recognition };
    }

    // Default to generic adaptation
    return { type: 'generic', template: null };
  }

  /**
   * Adapt technique for target game.
   * @private
   */
  _adaptTechnique(technique, mapping, pattern, source, target) {
    const adapted = {
      id: `${technique.id || 'tech'}-${target}`,
      statement: this._adaptStatement(technique.statement, mapping, pattern, source, target),
      domain: mapping?.targetMechanics?.[0] || technique.domain,
      description: this._adaptDescription(technique, mapping, pattern, source, target),
      actions: this._adaptActions(technique.actions || [], mapping, pattern, source, target),
      originalStatement: technique.statement,
      adaptations: [],
    };

    // Track adaptations made
    if (mapping) {
      adapted.adaptations.push({
        type: 'mechanic_mapping',
        from: mapping.sourceDomain,
        to: mapping.targetMechanics.join(', '),
        confidence: mapping.confidence,
      });
    }

    if (pattern?.type !== 'generic') {
      adapted.adaptations.push({
        type: 'behavior_pattern',
        pattern: pattern.type,
        description: pattern.template?.description || '',
      });
    }

    return adapted;
  }

  /**
   * Adapt the statement for target game.
   * @private
   */
  _adaptStatement(statement, mapping, pattern, source, target) {
    if (!statement) return '';

    let adapted = statement;

    // Replace game-specific terms
    const sourceGameName = this._getGameDisplayName(source);
    const targetGameName = this._getGameDisplayName(target);

    // Remove source game references
    adapted = adapted.replace(new RegExp(sourceGameName, 'gi'), '');
    adapted = adapted.replace(/\bMinecraft\b/gi, '');

    // Replace mechanic names if we have a mapping
    if (mapping) {
      for (const targetMechanic of mapping.targetMechanics) {
        adapted = adapted.replace(new RegExp(mapping.sourceDomain, 'gi'), targetMechanic.replace('_', ' '));
      }
    }

    // Clean up and format
    adapted = adapted.replace(/\s+/g, ' ').trim();

    // Add prefix if this is a transfer
    if (adapted && !adapted.startsWith('(')) {
      adapted = `(Transferred from ${sourceGameName}) ${adapted}`;
    }

    return adapted || `Technique transferred from ${sourceGameName} to ${targetGameName}`;
  }

  /**
   * Adapt the description for target game.
   * @private
   */
  _adaptDescription(technique, mapping, pattern, source, target) {
    const parts = [];

    if (pattern?.template?.description) {
      parts.push(`**Behavior Pattern:** ${pattern.template.description}`);
    }

    if (mapping) {
      parts.push(`**Mechanic Mapping:** ${mapping.sourceDomain} → ${mapping.targetMechanics.join(', ')}`);
    }

    if (technique.description) {
      parts.push(`**Original:** ${technique.description}`);
    }

    const sourceGameName = this._getGameDisplayName(source);
    const targetGameName = this._getGameDisplayName(target);

    parts.push(`**Transfer:** Adapted from ${sourceGameName} for ${targetGameName} mechanics.`);

    return parts.join('\n\n');
  }

  /**
   * Adapt actions for target game.
   * @private
   */
  _adaptActions(actions, mapping, pattern, source, target) {
    if (!actions || actions.length === 0) {
      // Generate default actions from pattern
      if (pattern?.template?.adapter) {
        return pattern.template.adapter(
          { pattern: mapping?.sourceDomain || 'unknown' },
          target
        ).actions || [];
      }
      return [];
    }

    return actions.map(action => ({
      ...action,
      description: this._adaptStatement(action.description || '', mapping, pattern, source, target),
      gameContext: target,
    }));
  }

  /**
   * Calculate confidence score for transfer.
   * @private
   */
  _calculateTransferConfidence(mapping, pattern, technique) {
    let confidence = 0;

    // Mapping confidence
    if (mapping) {
      confidence += mapping.confidence * 0.6;
    } else {
      confidence += 0.2; // Low confidence without mapping
    }

    // Pattern confidence
    if (pattern?.type !== 'generic') {
      confidence += 0.3;
    } else {
      confidence += 0.1;
    }

    // Original technique confidence (if available)
    if (technique.confidence !== undefined) {
      confidence += technique.confidence * 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get display name for game.
   * @private
   */
  _getGameDisplayName(gameName) {
    const displayNames = {
      minecraft: 'Minecraft',
      terraria: 'Terraria',
      stardew_valley: 'Stardew Valley',
      factorio: 'Factorio',
    };
    return displayNames[gameName] || gameName.charAt(0).toUpperCase() + gameName.slice(1);
  }

  /**
   * Export transfer state as JSON.
   */
  toJSON() {
    return {
      stats: this.getStats(),
      transfers: this.transfers.map(t => ({
        id: t.id,
        from: t.sourceGame,
        to: t.targetGame,
        confidence: t.confidence,
        technique: t.originalTechnique.statement,
      })),
    };
  }
}

/**
 * Create a knowledge transfer instance.
 */
export function createKnowledgeTransfer(opts) {
  return new KnowledgeTransfer(opts);
}

/**
 * Quick transfer function.
 * @param {string} sourceGame - Source game
 * @param {string} targetGame - Target game
 * @param {object} technique - Technique to transfer
 * @returns {object} Transferred technique
 */
export function transferTechnique(sourceGame, targetGame, technique) {
  const kt = new KnowledgeTransfer();
  return kt.transfer(sourceGame, targetGame, technique);
}

export default KnowledgeTransfer;
