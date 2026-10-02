#!/usr/bin/env node
/**
 * SIDE BY SIDE — live vs v3 vs v4 on the pilot regions. Read-only; reads the
 * live course and the v4 evidence files, writes compare.json + compare.md to
 * the evidence dir. The markdown is what the Tom-facing doc quotes.
 */
const fs = require('fs');
const path = require('path');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { scoreWindow } = require('./window-coverage.cjs');
const PATTERNS = require('../patterns.cjs');

const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
const LANG = { fra_for_eng: 'French', deu_for_eng: 'German', gle_for_eng: 'Irish' };
const name = (id) => `${id} ${(PATTERNS.find(p => p.id === id) || {}).name || ''}`;

function main() {
  const files = fs.readdirSync(EVIDENCE).filter(f => /^v4-.*\.json$/.test(f) && !f.includes('.candidates-')).sort();
  const cache = {};
  const rows = [], examples = [];
  for (const f of files) {
    const v4 = JSON.parse(fs.readFileSync(path.join(EVIDENCE, f), 'utf8'));
    const [start, end] = v4.region;
    const data = cache[v4.course] || (cache[v4.course] = loadCourse(v4.course));
    const inv = inventory(v4.course, data);
    const avail = availableAt(inv, end);
    const win = data.phrases.filter(p => p.seed_number >= start && p.seed_number <= end);
    const sets = { live: win };
    const v3 = win.filter(p => p.pipeline === 'v3');
    if (v3.length) { sets.v3 = v3; sets.old = win.filter(p => p.pipeline !== 'v3'); }
    sets.v4 = v4.kept;
    const row = { course: v4.course, language: LANG[v4.course] || v4.course, start, end, available: avail.length, new_legos: v4.new_legos,
      tokens: v4.tokens_spent, baskets_below_floor: (v4.floors || []).filter(x => !x.ok).length, rejected: (v4.rejected || []).length, sets: {} };
    for (const [k, rs] of Object.entries(sets)) {
      const s = scoreWindow(rs, avail, { rarefyN: 60 });
      row.sets[k] = { n: s.phrases, used: s.used, coverage: s.coverage, rarefied60: s.rarefied_frames_at_n, per100: s.frames_per_100_phrases,
        interjection_rate: s.interjection_rate, missing: s.missing_ids };
    }
    rows.push(row);
    // one worked LEGO per region: the first new LEGO that has a live basket; show all three baskets
    const legos = data.legos.filter(l => l.seed_number >= start && l.seed_number <= end && l.is_new !== false);
    const pick = legos.find(l => win.some(p => p.seed_number === l.seed_number && +p.lego_index === +l.lego_index && p.phrase_role === 'use')
                                && v4.kept.some(p => p.seed_number === l.seed_number && p.lego_index === +l.lego_index));
    if (pick) {
      const basket = (rs) => rs.filter(p => p.seed_number === pick.seed_number && +p.lego_index === +pick.lego_index)
        .map(p => ({ role: p.phrase_role, known: p.known_text, target: p.target_text, pipeline: p.pipeline || null }));
      examples.push({ course: v4.course, language: row.language, region: [start, end], lego: { id: `S${pick.seed_number}L${pick.lego_index}`, known: pick.known_text, target: pick.target_text },
        live: basket(win), v4: basket(v4.kept) });
    }
  }
  fs.writeFileSync(path.join(EVIDENCE, 'compare.json'), JSON.stringify({ generated: new Date().toISOString(), rows, examples }, null, 1));
  // markdown
  const md = [];
  md.push('| Language | Seeds | Frames available | Generator | Phrases | Frames used | Coverage | Frames in 60 phrases | Opener rate |', '|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) for (const [k, s] of Object.entries(r.sets)) {
    if (k === 'live' && r.sets.v3) continue; // Irish: show old and v3 separately, not the blend
    const label = { live: 'live (old builder)', old: 'live old builder', v3: 'live v3', v4: 'v4 pilot' }[k];
    md.push(`| ${r.language} | ${r.start}-${r.end} | ${r.available} | ${label} | ${s.n} | ${s.used} | ${Math.round(s.coverage * 100)}% | ${s.rarefied60 ?? '(fewer than 60)'} | ${Math.round(s.interjection_rate * 100)}% |`);
  }
  md.push('', '### Frames each generator never used in the region', '');
  for (const r of rows) for (const [k, s] of Object.entries(r.sets)) {
    if (k === 'live' && r.sets.v3) continue;
    md.push(`- ${r.language} ${r.start}-${r.end}, ${k}: ${s.missing.length ? s.missing.map(name).join('; ') : 'none'}`);
  }
  md.push('', '### Worked baskets, one LEGO per region', '');
  for (const e of examples) {
    md.push(`**${e.language}, ${e.lego.id} "${e.lego.known}" = ${e.lego.target}**`, '');
    md.push('Live:'); for (const p of e.live) md.push(`- ${p.role}${p.pipeline === 'v3' ? ' (v3)' : ''}: ${p.known} — ${p.target}`);
    md.push('', 'v4:'); for (const p of e.v4) md.push(`- ${p.role}: ${p.known} — ${p.target}`);
    md.push('');
  }
  fs.writeFileSync(path.join(EVIDENCE, 'compare.md'), md.join('\n'));
  console.log(md.slice(0, 2 + rows.length * 4).join('\n'));
}
main();
