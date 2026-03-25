/**
 * Research Paper Generator — produces formatted research summaries after experiment completion.
 * @module craftmind-researcher/research-paper
 */

/**
 * Generate a mini research paper from experiment data.
 * @param {object} opts
 * @param {string} opts.experimentId
 * @param {string} opts.hypothesis
 * @param {string} opts.domain
 * @param {object} opts.experimentDesign - { variables, controls, sampleSize, type }
 * @param {object} opts.results - Summary statistics
 * @param {object} opts.statisticalAnalysis - { tTest, proportionTest, effectSize, confidence }
 * @param {boolean} opts.hypothesisSupported
 * @param {object} opts.evaluation - Critic scores
 * @param {string[]} opts.relatedWork - IDs of related prior discoveries
 * @param {string[]} opts.reproducibilityContext - { worldSeed, coordinates, biome, gameTime, version }
 * @param {object} opts.failureAnalysis - { failed: boolean, reason: string, lessons: string[] }
 * @returns {object} Structured research paper
 */
export function generatePaper({
  experimentId, hypothesis, domain, experimentDesign, results,
  statisticalAnalysis, hypothesisSupported, evaluation, relatedWork = [],
  reproducibilityContext = {}, failureAnalysis = null,
}) {
  const supported = hypothesisSupported;
  const confidence = statisticalAnalysis?.confidence || null;
  const tTest = statisticalAnalysis?.tTest || null;
  const effectSize = statisticalAnalysis?.effectSize || null;

  return {
    version: '1.0',
    id: experimentId,
    generatedAt: new Date().toISOString(),

    // ─── Title & Abstract ────────────────────────────────────
    title: `${supported ? '✅' : '❌'} ${hypothesis.slice(0, 100)}`,
    abstract: generateAbstract({ hypothesis, supported, results, tTest, effectSize }),

    // ─── Introduction ────────────────────────────────────────
    introduction: {
      background: `This study investigates the hypothesis: "${hypothesis}" within the ${domain} domain.`,
      motivation: supported
        ? 'The results confirm the hypothesis, adding to the knowledge base of verified Minecraft mechanics.'
        : 'The results do not support the hypothesis, contributing to the body of negative results that prevent wasted research effort.',
      relatedWork,
    },

    // ─── Methods ─────────────────────────────────────────────
    methods: {
      design: experimentDesign.type === 'ab_test' ? 'A/B test with controlled conditions' : 'Simple experiment',
      variables: experimentDesign.variables,
      controls: experimentDesign.controls,
      sampleSize: experimentDesign.sampleSize,
      conditions: results ? Object.keys(results).filter(k => k !== '_overall') : [],
      reproducibility: reproducibilityContext,
    },

    // ─── Results ─────────────────────────────────────────────
    results: {
      summary: results,
      statisticalTests: {
        tTest: tTest ? {
          description: "Welch's t-test for difference in means",
          tStatistic: tTest.tStatistic,
          degreesOfFreedom: tTest.df,
          pValue: tTest.pValue,
          significant: tTest.significant,
          interpretation: tTest.significant
            ? 'The difference between conditions is statistically significant (p < 0.05).'
            : 'The difference between conditions is NOT statistically significant (p >= 0.05).',
        } : null,
        proportionTest: statisticalAnalysis?.proportionTest || null,
        effectSize: effectSize ? {
          cohensD: effectSize,
          interpretation: Math.abs(effectSize) > 0.8 ? 'Large effect size' :
            Math.abs(effectSize) > 0.5 ? 'Medium effect size' :
            Math.abs(effectSize) > 0.2 ? 'Small effect size' : 'Negligible effect size',
        } : null,
        confidenceInterval95: confidence,
      },
    },

    // ─── Discussion ──────────────────────────────────────────
    discussion: generateDiscussion({ supported, results, evaluation, effectSize, failureAnalysis }),

    // ─── Conclusion ──────────────────────────────────────────
    conclusion: {
      hypothesisSupported: supported,
      verdict: supported
        ? 'The hypothesis is supported by the experimental evidence.'
        : 'The hypothesis is NOT supported by the experimental evidence.',
      recommendation: supported
        ? 'This technique should be added to the knowledge base and distilled into a behavior script.'
        : 'This hypothesis should be marked as refuted to prevent re-testing. Consider alternative hypotheses.',
      criticScores: evaluation,
    },

    // ─── Failure Analysis ────────────────────────────────────
    failureAnalysis: failureAnalysis || { failed: false, reason: null, lessons: [] },

    // ─── Metadata ────────────────────────────────────────────
    domain,
    falsificationCriterion: `The hypothesis would be refuted if the experimental results showed ${experimentDesign.type === 'ab_test' ? 'no statistically significant difference between conditions' : 'a negative or null result'} at p < 0.05.`,
  };
}

/**
 * Format a research paper as human-readable markdown.
 * @param {object} paper - Output of generatePaper()
 * @returns {string}
 */
export function paperToMarkdown(paper) {
  const lines = [
    `# ${paper.title}`,
    `**ID:** ${paper.id} | **Domain:** ${paper.domain} | **Date:** ${paper.generatedAt.slice(0, 10)}`,
    '',
    '---',
    '',
    '## Abstract',
    paper.abstract,
    '',
    '## Introduction',
    paper.introduction.background,
    paper.introduction.motivation,
    paper.introduction.relatedWork.length > 0
      ? `**Related prior work:** ${paper.introduction.relatedWork.join(', ')}` : '',
    '',
    '## Methods',
    `- **Design:** ${paper.methods.design}`,
    `- **Sample size:** ${paper.methods.sampleSize} trials${paper.methods.conditions.length > 0 ? ` across ${paper.methods.conditions.length} conditions` : ''}`,
    paper.methods.variables?.length > 0
      ? `- **Variables:** ${paper.methods.variables.map(v => `${v.name} ∈ {${v.values.join(', ')}}`).join('; ')}` : '',
    Object.keys(paper.methods.controls || {}).length > 0
      ? `- **Controls:** ${Object.entries(paper.methods.controls).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
    Object.keys(paper.methods.reproducibility || {}).length > 0
      ? `- **Reproducibility:** ${Object.entries(paper.methods.reproducibility).map(([k, v]) => `${k}=${v}`).join(', ')}` : '',
    '',
    '## Results',
  ];

  if (paper.results.summary) {
    lines.push('### Summary Statistics');
    lines.push('```');
    lines.push(JSON.stringify(paper.results.summary, null, 2));
    lines.push('```');
  }

  if (paper.results.statisticalTests?.tTest) {
    const t = paper.results.statisticalTests.tTest;
    lines.push('', '### Statistical Tests', `- **t-test:** t(${t.degreesOfFreedom.toFixed(1)}) = ${t.tStatistic.toFixed(3)}, p = ${t.pValue.toFixed(4)}`);
    lines.push(`  ${t.interpretation}`);
  }

  if (paper.results.statisticalTests?.effectSize) {
    const e = paper.results.statisticalTests.effectSize;
    lines.push(`- **Effect size:** Cohen's d = ${e.cohensD.toFixed(3)} (${e.interpretation})`);
  }

  if (paper.results.statisticalTests?.confidenceInterval95) {
    const ci = paper.results.statisticalTests.confidenceInterval95;
    lines.push(`- **95% CI:** [${ci.lower.toFixed(2)}, ${ci.upper.toFixed(2)}] (MOE: ${ci.marginOfError.toFixed(2)})`);
  }

  lines.push('', '## Discussion');
  lines.push(...paper.discussion);

  lines.push('', '## Conclusion');
  lines.push(`- **Hypothesis supported:** ${paper.conclusion.hypothesisSupported ? '✅ Yes' : '❌ No'}`);
  lines.push(`- ${paper.conclusion.verdict}`);
  lines.push(`- ${paper.conclusion.recommendation}`);

  if (paper.criticScores) {
    lines.push('', '### Critic Scores');
    for (const [k, v] of Object.entries(paper.criticScores.scores || {})) {
      lines.push(`- **${k}:** ${(v * 100).toFixed(0)}%`);
    }
    if (paper.criticScores.overall !== undefined) {
      lines.push(`- **Overall:** ${(paper.criticScores.overall * 100).toFixed(0)}%`);
    }
  }

  if (paper.failureAnalysis?.failed) {
    lines.push('', '## ⚠️ Failure Analysis', `- **Reason:** ${paper.failureAnalysis.reason}`);
    if (paper.failureAnalysis.lessons?.length > 0) {
      lines.push('- **Lessons learned:**');
      for (const l of paper.failureAnalysis.lessons) lines.push(`  - ${l}`);
    }
  }

  lines.push('', '---', `*Generated by CraftMind Researcher v${paper.version}*`);
  return lines.join('\n');
}

// ─── Internal ────────────────────────────────────────────────

function generateAbstract({ hypothesis, supported, results, tTest, effectSize }) {
  const resultDesc = tTest
    ? `A Welch's t-test yielded t(${tTest.df.toFixed(1)}) = ${tTest.tStatistic.toFixed(3)}, p = ${tTest.pValue.toFixed(4)} (${tTest.significant ? 'significant' : 'not significant'}).`
    : 'Results were analyzed using descriptive statistics.';
  const effectDesc = effectSize
    ? ` The effect size was ${Math.abs(effectSize).toFixed(3)} (Cohen's d), indicating a ${Math.abs(effectSize) > 0.8 ? 'large' : Math.abs(effectSize) > 0.5 ? 'medium' : Math.abs(effectSize) > 0.2 ? 'small' : 'negligible'} effect.`
    : '';
  return `This experiment tested the hypothesis: "${hypothesis}". ${resultDesc}${effectDesc} The hypothesis is ${supported ? 'SUPPORTED' : 'NOT SUPPORTED'} by the evidence.`;
}

function generateDiscussion({ supported, results, evaluation, effectSize, failureAnalysis }) {
  const points = [];
  if (supported) {
    points.push('The experimental results support the hypothesis.');
    if (effectSize && Math.abs(effectSize) > 0.5) {
      points.push('The effect size is substantial, suggesting practical significance beyond statistical significance.');
    }
    if (evaluation?.edgeCases?.length > 0) {
      points.push(`Edge cases to consider: ${evaluation.edgeCases.join('; ')}.`);
    }
  } else {
    points.push('The experimental results do not support the hypothesis.');
    points.push('This negative result is valuable — it prevents future researchers from pursuing a dead end.');
    if (evaluation?.improvements?.length > 0) {
      points.push(`Potential improvements for future work: ${evaluation.improvements.join('; ')}.`);
    }
  }
  if (failureAnalysis?.failed) {
    points.push(`Note: The experiment encountered a failure (${failureAnalysis.reason}). Results should be interpreted with caution.`);
  }
  return points;
}
