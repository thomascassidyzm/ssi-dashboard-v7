#!/usr/bin/env node
/**
 * The funnel, written out in full, plus the confirmed list as a page a person can read on a phone.
 *
 * RAW and CONFIRMED are always reported separately and never collapsed into one number. RAW is
 * what the first reader accused; CONFIRMED is what survived the second reader trying to overturn
 * it. Quoting only the confirmed figure would hide how hard the check has to work to earn it, and
 * quoting only the raw one would repeat the cry-wolf failure the rebuild exists to end.
 *
 * Usage:
 *   node tools/teaches-word/report.cjs --funnel candidates.json --confirmed confirmed.json \
 *        --title "..." --out report.md
 */

const fs = require('fs');

function flag(argv, n, d) { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; }

function main() {
  const argv = process.argv.slice(2);
  const funnel = JSON.parse(fs.readFileSync(flag(argv, 'funnel'), 'utf8'));
  const conf = JSON.parse(fs.readFileSync(flag(argv, 'confirmed'), 'utf8'));
  const verdictsFile = flag(argv, 'verdicts', null);
  const verdicts = verdictsFile ? JSON.parse(fs.readFileSync(verdictsFile, 'utf8')).results : null;
  const out = flag(argv, 'out', null);
  const title = flag(argv, 'title', 'Practice sentences that do not use the word they teach');

  const upheld = conf.results.filter((r) => r.ruling === 'UPHELD');
  const byCourse = new Map();
  for (const r of upheld) {
    const k = `${r.course}`;
    if (!byCourse.has(k)) byCourse.set(k, []);
    byCourse.get(k).push(r);
  }

  const L = [];
  L.push(`# ${title}`, '');

  if (verdicts) {
    const t = {};
    for (const v of verdicts) t[v.verdict] = (t[v.verdict] || 0) + 1;
    L.push('## The funnel', '');
    const rows = funnel.tallies || [];
    const totalRows = rows.reduce((a, r) => a + r.rows, 0);
    const cleared = rows.reduce((a, r) => a + r.known.clear + r.target.clear, 0);
    const skipped = rows.reduce((a, r) => a + r.known.skip + r.target.skip, 0);
    const toRead = rows.reduce((a, r) => a + r.known.read + r.target.read, 0);
    L.push(`- **${totalRows.toLocaleString()}** practice sentences, checked on both sides — **${(totalRows * 2).toLocaleString()}** checks`);
    L.push(`- **${cleared.toLocaleString()}** cleared without reading — the sentence plainly contains the word`);
    L.push(`- **${skipped.toLocaleString()}** had nothing to check (a blank word or a blank sentence)`);
    L.push(`- **${toRead.toLocaleString()}** went to a reader`);
    L.push(`- **${(t.MISSING || 0).toLocaleString()}** raw accusations from the first reader`);
    L.push(`- **${upheld.length.toLocaleString()}** confirmed after a second reader tried to overturn each one`);
    if (t.UNSURE) L.push(`- ${t.UNSURE.toLocaleString()} the reader honestly could not decide — counted as neither`);
    if (t.UNREAD) L.push(`- ${t.UNREAD.toLocaleString()} came back without an answer — counted as neither`);
    L.push('');
  }

  L.push('## Confirmed, by course', '');
  for (const [course, items] of [...byCourse.entries()].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`**${course}** — ${items.length}`);
  }
  L.push('');

  for (const [course, items] of [...byCourse.entries()].sort((a, b) => b[1].length - a[1].length)) {
    L.push(`## ${course} — ${items.length} confirmed`, '');
    const byLego = new Map();
    for (const i of items) {
      if (!byLego.has(i.lego_id)) byLego.set(i.lego_id, []);
      byLego.get(i.lego_id).push(i);
    }
    for (const [lego, rows] of byLego) {
      const r = rows[0];
      L.push(`**${lego}** teaches **${r.taught}**${r.side === 'target' ? ' (the language being learned)' : ''}`);
      for (const x of rows) L.push(`- ${x.sentence}  \n  *${x.confirm_why}*`);
      L.push('');
    }
  }

  const md = L.join('\n');
  if (out) { fs.writeFileSync(out, md); console.error(`-> ${out}`); } else console.log(md);
}

main();
