/**
 * Research Paper Generator — formatted rendering for different output formats.
 *
 * Takes research paper data (from research-paper.js) and renders it as:
 * - Minecraft books (written_book format)
 * - Chat messages (formatted for in-game chat)
 * - Markdown documents
 * - Plain text summaries
 *
 * @module craftmind-researcher/paper
 */

import { paperToMarkdown } from './research-paper.js';

/**
 * Minecraft book page character limit (excluding formatting codes).
 * Minecraft allows 256 characters per page in written_book NBT format.
 */
const MAX_BOOK_CHARS = 256;

/**
 * Minecraft chat message character limit.
 */
const MAX_CHAT_CHARS = 256;

/**
 * Color codes for Minecraft formatting.
 */
const MINECRAFT_COLORS = {
  black: '§0',
  dark_blue: '§1',
  dark_green: '§2',
  dark_aqua: '§3',
  dark_red: '§4',
  dark_purple: '§5',
  gold: '§6',
  gray: '§7',
  dark_gray: '§8',
  blue: '§9',
  green: '§a',
  aqua: '§b',
  red: '§c',
  light_purple: '§d',
  yellow: '§e',
  white: '§f',
  reset: '§r',
};

/**
 * Minecraft formatting codes.
 */
const MINECRAFT_FORMATS = {
  bold: '§l',
  italic: '§o',
  underline: '§n',
  strikethrough: '§m',
  reset: '§r',
};

/**
 * Paper Generator for multiple output formats.
 */
export class PaperGenerator {
  /**
   * @param {object} opts
   * @param {string} [opts.defaultFormat='markdown'] - Default output format
   * @param {boolean} [opts.includeCitations=true] - Include citation links
   */
  constructor(opts = {}) {
    this.defaultFormat = opts.defaultFormat || 'markdown';
    this.includeCitations = opts.includeCitations !== false;
  }

  /**
   * Write a research paper from discovery data.
   * @param {object} discovery - Discovery data from discovery engine
   * @param {object} opts - Options
   * @param {string} [opts.format] - Output format
   * @returns {object} Paper data with render methods
   */
  writePaper(discovery, opts = {}) {
    const format = opts.format || this.defaultFormat;

    const paper = {
      id: discovery.id || `paper-${Date.now()}`,
      title: discovery.title || discovery.statement || 'Untitled Paper',
      authors: discovery.authors || ['CraftMind Researcher'],
      date: discovery.date || new Date().toISOString().split('T')[0],
      abstract: discovery.abstract || '',
      sections: {
        introduction: this._generateIntroduction(discovery),
        method: this._generateMethod(discovery),
        results: this._generateResults(discovery),
        discussion: this._generateDiscussion(discovery),
        relatedWork: this._generateRelatedWork(discovery),
        conclusion: this._generateConclusion(discovery),
      },
      metadata: {
        domain: discovery.domain || 'general',
        confidence: discovery.confidence || 0,
        hypothesis: discovery.hypothesis || '',
        supported: discovery.supported || false,
      },
      citations: discovery.citations || [],

      // Render methods
      render: (fmt) => this.render(paper, fmt || format),
      toMarkdown: () => this.toMarkdown(paper),
      toBook: () => this.toBook(paper),
      toChat: () => this.toChat(paper),
      toText: () => this.toText(paper),
    };

    return paper;
  }

  /**
   * Render a paper in the specified format.
   * @param {object} paper - Paper object from writePaper()
   * @param {string} format - 'markdown', 'book', 'chat', 'text'
   * @returns {string} Formatted paper
   */
  render(paper, format) {
    switch (format) {
      case 'markdown':
        return this.toMarkdown(paper);
      case 'book':
        return JSON.stringify(this.toBook(paper));
      case 'chat':
        return this.toChat(paper);
      case 'text':
        return this.toText(paper);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  /**
   * Render paper as Markdown document.
   * @param {object} paper - Paper object
   * @returns {string} Markdown
   */
  toMarkdown(paper) {
    const lines = [
      `# ${paper.title}`,
      '',
      `**Authors:** ${paper.authors.join(', ')} | **Date:** ${paper.date}`,
      `**Domain:** ${paper.metadata.domain} | **Confidence:** ${(paper.metadata.confidence * 100).toFixed(1)}%`,
      '',
      '---',
      '',
      '## Abstract',
      paper.abstract,
      '',
    ];

    // Sections
    if (paper.sections.introduction) {
      lines.push('## Introduction');
      lines.push(paper.sections.introduction);
      lines.push('');
    }

    if (paper.sections.method) {
      lines.push('## Method');
      lines.push(paper.sections.method);
      lines.push('');
    }

    if (paper.sections.results) {
      lines.push('## Results');
      lines.push(paper.sections.results);
      lines.push('');
    }

    if (paper.sections.discussion) {
      lines.push('## Discussion');
      lines.push(paper.sections.discussion);
      lines.push('');
    }

    if (paper.sections.relatedWork) {
      lines.push('## Related Work');
      lines.push(paper.sections.relatedWork);
      lines.push('');
    }

    if (paper.sections.conclusion) {
      lines.push('## Conclusion');
      lines.push(paper.sections.conclusion);
      lines.push('');
    }

    // Citations
    if (this.includeCitations && paper.citations.length > 0) {
      lines.push('## References');
      for (const citation of paper.citations) {
        lines.push(`- ${citation.id}: ${citation.title || citation.statement}`);
      }
      lines.push('');
    }

    lines.push('', '---', '');
    lines.push(`*Generated by CraftMind Researcher*`);

    return lines.join('\n');
  }

  /**
   * Render paper as Minecraft written_book format.
   * @param {object} paper - Paper object
   * @returns {object} Minecraft NBT-compatible book data
   */
  toBook(paper) {
    const pages = [];
    let currentPage = '';

    // Title page
    const titlePage = this._formatBookLine(`§l§6${paper.title}`, 0) + '\n\n' +
                      this._formatBookLine(`§7by ${paper.authors[0]}`, 0) + '\n\n' +
                      this._formatBookLine(`§8${paper.date}`, 0);
    pages.push(titlePage);

    // Abstract
    if (paper.abstract) {
      const abstractPages = this._splitIntoPages(
        '§l§3Abstract§r\n\n' + this._formatBookText(paper.abstract)
      );
      pages.push(...abstractPages);
    }

    // Sections
    const sectionOrder = ['introduction', 'method', 'results', 'discussion', 'conclusion'];
    for (const sectionName of sectionOrder) {
      const section = paper.sections[sectionName];
      if (!section) continue;

      const formattedSection = this._formatBookSection(sectionName, section);
      const sectionPages = this._splitIntoPages(formattedSection);
      pages.push(...sectionPages);
    }

    return {
      format: 'minecraft:written_book',
      title: paper.title.slice(0, 16), // Minecraft title limit
      author: paper.authors[0]?.slice(0, 16) || 'CraftMind',
      pages: pages.slice(0, 50), // Minecraft page limit
      resolved: true,
    };
  }

  /**
   * Render paper as formatted chat message(s).
   * @param {object} paper - Paper object
   * @returns {string[]} Array of chat messages
   */
  toChat(paper) {
    const messages = [];

    // Header message
    messages.push(
      this._formatChat(`${MINECRAFT_FORMATS.bold}${MINECRAFT_COLORS.gold}[${paper.title}]`)
    );

    // Abstract summary
    if (paper.abstract) {
      const summary = paper.abstract.slice(0, 100) +
                      (paper.abstract.length > 100 ? '...' : '');
      messages.push(
        this._formatChat(`${MINECRAFT_COLORS.gray}${summary}`)
      );
    }

    // Result summary
    const resultColor = paper.metadata.supported ? MINECRAFT_COLORS.green : MINECRAFT_COLORS.red;
    const verdict = paper.metadata.supported ? '✓ SUPPORTED' : '✗ REFUTED';
    messages.push(
      this._formatChat(`${resultColor}${verdict}${MINECRAFT_COLORS.reset} ${MINECRAFT_COLORS.gray}(confidence: ${(paper.metadata.confidence * 100).toFixed(0)}%)`)
    );

    // Citation link (if enabled)
    if (this.includeCitations && paper.citations.length > 0) {
      messages.push(
        this._formatChat(`${MINECRAFT_COLORS.blue}Related: ${paper.citations.slice(0, 3).map(c => c.id).join(', ')}`)
      );
    }

    return messages;
  }

  /**
   * Render paper as plain text summary.
   * @param {object} paper - Paper object
   * @returns {string} Plain text
   */
  toText(paper) {
    const lines = [
      '='.repeat(60),
      paper.title.toUpperCase(),
      '='.repeat(60),
      '',
      `Authors: ${paper.authors.join(', ')}`,
      `Date: ${paper.date}`,
      `Domain: ${paper.metadata.domain}`,
      `Confidence: ${(paper.metadata.confidence * 100).toFixed(1)}%`,
      '',
      '-'.repeat(60),
      'ABSTRACT',
      '-'.repeat(60),
      paper.abstract,
      '',
      '-'.repeat(60),
      'SUMMARY',
      '-'.repeat(60),
    ];

    // Add brief section summaries
    if (paper.sections.introduction) {
      lines.push(`INTRODUCTION: ${paper.sections.introduction.slice(0, 200)}...`);
    }
    if (paper.sections.method) {
      lines.push(`METHOD: ${paper.sections.method.slice(0, 200)}...`);
    }
    if (paper.sections.results) {
      lines.push(`RESULTS: ${paper.sections.results.slice(0, 200)}...`);
    }

    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`Verdict: ${paper.metadata.supported ? 'SUPPORTED' : 'REFUTED'}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  // ─── Internal Methods ────────────────────────────────────────────

  /**
   * Generate introduction section.
   * @private
   */
  _generateIntroduction(discovery) {
    const lines = [
      `This paper investigates the hypothesis: "${discovery.hypothesis || discovery.statement || 'Unknown'}".`,
      '',
    ];

    if (discovery.domain) {
      lines.push(`The research focuses on the ${discovery.domain} domain.`);
      lines.push('');
    }

    if (discovery.background) {
      lines.push(discovery.background);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate method section.
   * @private
   */
  _generateMethod(discovery) {
    const lines = ['### Experimental Design', ''];

    if (discovery.experimentType) {
      lines.push(`**Type:** ${discovery.experimentType}`);
    }

    if (discovery.variables?.length > 0) {
      lines.push(`**Variables:** ${discovery.variables.map(v => `${v.name} ∈ {${v.values.join(', ')}}`).join(', ')}`);
    }

    if (discovery.controls && Object.keys(discovery.controls).length > 0) {
      lines.push(`**Controls:** ${Object.entries(discovery.controls).map(([k, v]) => `${k}=${v}`).join(', ')}`);
    }

    if (discovery.sampleSize) {
      lines.push(`**Sample Size:** ${discovery.sampleSize} trials`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * Generate results section.
   * @private
   */
  _generateResults(discovery) {
    const lines = [];

    if (discovery.results) {
      lines.push('### Statistical Summary', '');
      lines.push('```');
      lines.push(JSON.stringify(discovery.results, null, 2));
      lines.push('```');
      lines.push('');
    }

    if (discovery.statisticalTests) {
      lines.push('### Statistical Tests', '');
      if (discovery.statisticalTests.tTest) {
        const t = discovery.statisticalTests.tTest;
        lines.push(`- **t-test:** t(${t.df?.toFixed(1) || 'N/A'}) = ${t.tStatistic?.toFixed(3) || 'N/A'}, p = ${t.pValue?.toFixed(4) || 'N/A'}`);
      }
      if (discovery.statisticalTests.effectSize !== undefined) {
        lines.push(`- **Effect Size:** Cohen's d = ${discovery.statisticalTests.effectSize.toFixed(3)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate discussion section.
   * @private
   */
  _generateDiscussion(discovery) {
    const lines = [];

    if (discovery.supported !== undefined) {
      if (discovery.supported) {
        lines.push('The experimental results support the hypothesis.');
      } else {
        lines.push('The experimental results do not support the hypothesis.');
        lines.push('This negative result contributes to the knowledge base by preventing future research on this hypothesis.');
      }
      lines.push('');
    }

    if (discovery.limitations) {
      lines.push('**Limitations:**', discovery.limitations);
      lines.push('');
    }

    if (discovery.implications) {
      lines.push('**Implications:**', discovery.implications);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate related work section.
   * @private
   */
  _generateRelatedWork(discovery) {
    const lines = [];

    if (discovery.citations && discovery.citations.length > 0) {
      lines.push('This research builds upon the following prior discoveries:');
      lines.push('');
      for (const citation of discovery.citations) {
        lines.push(`- **${citation.id}:** ${citation.title || citation.statement || 'Unknown'}`);
        if (citation.relation) {
          lines.push(`  *Relation: ${citation.relation}*`);
        }
      }
      lines.push('');
    } else {
      lines.push('This is an original investigation with no directly related prior work.');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate conclusion section.
   * @private
   */
  _generateConclusion(discovery) {
    const lines = [];

    if (discovery.supported !== undefined) {
      const verdict = discovery.supported ? 'SUPPORTED' : 'REFUTED';
      lines.push(`## Verdict: ${verdict}`);
      lines.push('');

      if (discovery.supported) {
        lines.push('The hypothesis is supported by experimental evidence.');
        lines.push('This technique should be incorporated into the knowledge base.');
      } else {
        lines.push('The hypothesis is not supported by experimental evidence.');
        lines.push('This hypothesis should be marked as refuted to prevent re-testing.');
      }
      lines.push('');
    }

    if (discovery.recommendations) {
      lines.push('**Recommendations:**');
      lines.push(discovery.recommendations);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format text for Minecraft book (account for formatting codes).
   * @private
   */
  _formatBookText(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, `${MINECRAFT_FORMATS.bold}$1${MINECRAFT_FORMATS.reset}`)
      .replace(/\*(.+?)\*/g, `${MINECRAFT_FORMATS.italic}$1${MINECRAFT_FORMATS.reset}`)
      .replace(/`(.+?)`/g, `${MINECRAFT_COLORS.gray}$1${MINECRAFT_COLORS.reset}`);
  }

  /**
   * Format a single line for Minecraft book.
   * @private
   */
  _formatBookLine(text, indent = 0) {
    const prefix = '  '.repeat(indent);
    return prefix + text;
  }

  /**
   * Format a section for Minecraft book.
   * @private
   */
  _formatBookSection(sectionName, content) {
    const formattedName = sectionName
      .split(/(?=[A-Z])/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `${MINECRAFT_FORMATS.bold}${MINECRAFT_COLORS.gold}${formattedName}${MINECRAFT_FORMATS.reset}\n\n${this._formatBookText(content)}`;
  }

  /**
   * Split text into Minecraft book pages.
   * @private
   */
  _splitIntoPages(text) {
    const pages = [];
    const lines = text.split('\n');
    let currentPage = '';
    let currentLength = 0;

    for (const line of lines) {
      // Count actual characters (excluding formatting codes)
      const displayLength = line.replace(/§./g, '').length;

      if (currentLength + displayLength > MAX_BOOK_CHARS && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = '';
        currentLength = 0;
      }

      currentPage += line + '\n';
      currentLength += displayLength;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [''];
  }

  /**
   * Format text for Minecraft chat.
   * @private
   */
  _formatChat(text) {
    // Truncate if too long
    const displayLength = text.replace(/§./g, '').length;
    if (displayLength > MAX_CHAT_CHARS) {
      // Find safe truncation point
      let truncated = text;
      let currentLength = displayLength;

      while (currentLength > MAX_CHAT_CHARS - 3) {
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace === -1) break;
        truncated = truncated.slice(0, lastSpace);
        currentLength = truncated.replace(/§./g, '').length;
      }

      return truncated + '...';
    }

    return text;
  }
}

/**
 * Create a paper generator instance with default settings.
 */
export function createPaperGenerator(opts) {
  return new PaperGenerator(opts);
}

/**
 * Quick render function for papers.
 * @param {object} discovery - Discovery data
 * @param {string} [format='markdown'] - Output format
 * @returns {string} Rendered paper
 */
export function renderPaper(discovery, format = 'markdown') {
  const generator = new PaperGenerator();
  const paper = generator.writePaper(discovery, { format });
  return generator.render(paper, format);
}

export default PaperGenerator;
