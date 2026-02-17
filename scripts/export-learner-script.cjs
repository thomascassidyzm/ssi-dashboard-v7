#!/usr/bin/env node
/**
 * Export Learning Journey as readable markdown
 * Usage: node scripts/export-learner-script.cjs <course_code> [max_legos]
 * Output: markdown to stdout
 */

const courseCode = process.argv[2];
const maxLegos = process.argv[3] || 5000;

if (!courseCode) {
  console.error('Usage: node scripts/export-learner-script.cjs <course_code> [max_legos]');
  process.exit(1);
}

const API_BASE = process.env.PRODUCTION_API_URL || 'http://localhost:3470';

async function main() {
  const url = `${API_BASE}/api/production/${courseCode}/learning-journey?maxLegos=${maxLegos}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API error: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();

  const { rounds, stats } = data;
  const lines = [];

  // Header
  lines.push(`# ${courseCode} — Learner Script`);
  lines.push('');
  lines.push(`> ${stats.roundsGenerated} rounds | ${stats.totalItems} items | ${stats.legosLoaded} LEGOs`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Type labels
  const typeLabel = (item) => {
    const t = item.type;
    if (t === 'intro') return 'INTRO';
    if (t === 'debut') return 'LEGO';
    if (t === 'build') return `BUILD-${item.phrasePosition || '?'}`;
    if (t === 'use') return `USE-${item.phrasePosition || '?'}`;
    if (t === 'review') return `REVIEW R${item.reviewOf || '?'}`;
    if (t === 'consolidate') return `CONSOLIDATE-${item.consolidateIndex || '?'}`;
    return t.toUpperCase();
  };

  for (const round of rounds) {
    // Round header
    const legoId = round.legoId;
    const intro = round.items.find(i => i.type === 'intro');
    const known = intro?.known_text || '';
    const target = intro?.target_text || '';

    // Spaced rep info
    const reviews = round.spacedRepReviews || [];
    const reviewStr = reviews.length > 0 ? `  [reviews: ${reviews.map(r => 'R'+r).join(', ')}]` : '';

    lines.push(`## R${round.roundNumber}  ${legoId}  "${known}" = **${target}**${reviewStr}`);
    lines.push('');

    for (const item of round.items) {
      const label = typeLabel(item);
      const k = item.known_text || '';
      const t = item.target_text || '';
      const pad = 18 - label.length;
      lines.push(`  ${label}${' '.repeat(Math.max(1, pad))}${k}  →  ${t}`);
    }

    lines.push('');
  }

  process.stdout.write(lines.join('\n'));
}

main().catch(e => { console.error(e); process.exit(1); });
