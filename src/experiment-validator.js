/**
 * Experiment Validator — evaluates whether a hypothesis is feasible and well-designed
 * before investing compute/resources in running it.
 * @module craftmind-researcher/experiment-validator
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid - Is this experiment design sound?
 * @property {string[]} errors - Fatal problems
 * @property {string[]} warnings - Non-fatal concerns
 * @property {number} feasibilityScore - 0-1, how likely the experiment can succeed
 * @property {string} experimentType - 'experimental', 'observational', 'survey'
 * @property {string} recommendation
 */

/**
 * Validate an experiment design.
 * @param {object} hypothesis - { hypothesis, domain, type, variables, predictedOutcome }
 * @param {object} design - { setup, variables, controls, sampleSize, successCriteria, failureCriteria }
 * @returns {ValidationResult}
 */
export function validateExperimentDesign(hypothesis, design) {
  const errors = [];
  const warnings = [];
  let feasibility = 1.0;

  // 1. Hypothesis must be falsifiable
  if (!design.failureCriteria && !design.successCriteria) {
    errors.push('Experiment lacks both success AND failure criteria — not falsifiable. Add clear criteria that could prove the hypothesis wrong.');
    feasibility -= 0.4;
  }
  if (design.successCriteria && !design.failureCriteria) {
    warnings.push('Has success criteria but no explicit failure criteria. Define what would disprove the hypothesis.');
    feasibility -= 0.1;
  }

  // 2. Sample size must be adequate
  if (design.sampleSize < 3) {
    errors.push(`Sample size ${design.sampleSize} is too small for any meaningful statistical analysis. Minimum is 3, recommended is 10+.`);
    feasibility -= 0.3;
  } else if (design.sampleSize < 5) {
    warnings.push(`Sample size ${design.sampleSize} is small. Consider at least 10 for moderate confidence.`);
    feasibility -= 0.1;
  }

  // 3. Controls must be specified
  if (!design.controls || Object.keys(design.controls).length === 0) {
    warnings.push('No control variables specified. Without controls, confounding factors may invalidate results.');
    feasibility -= 0.15;
  }

  // 4. Determine experiment type
  const experimentType = classifyExperiment(hypothesis, design);

  // 5. Domain-specific checks
  const domainWarnings = domainSpecificChecks(hypothesis.domain, hypothesis.hypothesis, design);
  warnings.push(...domainWarnings);
  for (const w of domainWarnings) feasibility -= 0.05;

  // 6. Measurability check
  if (!design.variables || design.variables.length === 0) {
    warnings.push('No measurement variables defined. What will you actually measure?');
    feasibility -= 0.1;
  }

  // 7. Hypothesis specificity
  if (hypothesis.hypothesis.length < 20) {
    warnings.push('Hypothesis is very short — may lack specificity. More detailed hypotheses lead to better experiments.');
    feasibility -= 0.05;
  }

  feasibility = Math.max(0, Math.min(1, feasibility));

  const recommendation = errors.length > 0
    ? 'REJECT: Fix critical errors before proceeding.'
    : warnings.length > 2
      ? 'REVISE: Address warnings for more reliable results.'
      : 'ACCEPT: Experiment design is sound.';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    feasibilityScore: feasibility,
    experimentType,
    recommendation,
  };
}

/**
 * Classify an experiment as experimental, observational, or survey.
 * Some hypotheses require observation rather than manipulation.
 * @param {object} hypothesis
 * @param {object} design
 * @returns {string}
 */
function classifyExperiment(hypothesis, design) {
  const h = hypothesis.hypothesis.toLowerCase();
  const hasManipulation = design.variables?.length > 0 && hypothesis.type === 'ab_test';

  // Observational patterns
  const observationalKeywords = ['afraid', 'flee', 'behavior', 'spawn', 'ai', 'pathfinding', 'aggro', 'follow'];
  const isObservational = observationalKeywords.some(kw => h.includes(kw));

  if (isObservational && !hasManipulation) return 'observational';
  if (hasManipulation) return 'experimental';
  return 'experimental'; // default
}

/**
 * Domain-specific validation checks.
 */
function domainSpecificChecks(domain, hypothesisText, design) {
  const warnings = [];
  const h = hypothesisText.toLowerCase();

  switch (domain) {
    case 'mining':
      if (!h.includes('y=') && !h.includes('y_level') && !h.includes('y level') && !h.includes('depth')) {
        warnings.push('Mining experiments typically need Y-level as a variable or control.');
      }
      break;
    case 'farming':
      if (!design.controls?.light && !h.includes('light')) {
        warnings.push('Farming experiments should control for light level — it affects growth rate.');
      }
      if (!design.controls?.hydration && !h.includes('hydrat') && !h.includes('water')) {
        warnings.push('Consider controlling for hydration in farming experiments.');
      }
      break;
    case 'combat':
      if (!design.controls?.difficulty && !h.includes('difficulty')) {
        warnings.push('Combat results vary by difficulty. Specify a difficulty level in controls.');
      }
      break;
    case 'redstone':
      if (!h.includes('tick') && !h.includes('delay') && !h.includes('timing')) {
        warnings.push('Redstone experiments often involve timing — consider tick-level measurement.');
      }
      break;
    case 'exploration':
      if (!design.controls?.seed && !h.includes('seed')) {
        warnings.push('Exploration/experiment results depend on world seed. Record the seed for reproducibility.');
      }
      break;
  }

  return warnings;
}

/**
 * Estimate required sample size for detecting an effect.
 * Simplified power analysis.
 * @param {number} expectedEffectSize - Cohen's d (0.2=small, 0.5=medium, 0.8=large)
 * @param {number} [alpha=0.05] - Significance level
 * @param {number} [power=0.8] - Statistical power
 * @returns {number} Recommended sample size per group
 */
export function estimateRequiredSampleSize(expectedEffectSize, alpha = 0.05, power = 0.8) {
  if (expectedEffectSize <= 0) return 30;
  // Simplified formula: n ≈ 2 * ((z_alpha + z_beta) / d)^2
  const zAlpha = 1.96; // for alpha=0.05 two-tailed
  const zBeta = 0.84;  // for power=0.8
  const n = 2 * ((zAlpha + zBeta) / expectedEffectSize) ** 2;
  return Math.ceil(n);
}
