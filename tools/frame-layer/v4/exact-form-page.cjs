#!/usr/bin/env node
/** Writes the before/after page (markdown) from the exact-form re-gated staged rows. Read-only. */
const fs = require('fs');
const path = require('path');
const { loadCourse } = require('./db.cjs');
const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');
const NAMES = { fra_for_eng: 'French for English speakers', eng_for_ben: 'English for Bengali speakers', kor_for_eng: 'Korean for English speakers',
  eng_for_hin: 'English for Hindi speakers', ara_eg_for_eng: 'Egyptian Arabic for English speakers' };
const pct = (x) => Math.round(x * 100) + '%';
const sum = JSON.parse(fs.readFileSync(path.join(RUN_DIR, 'exact-form-summary.json'), 'utf8'));
const out = [];
out.push('# Phrase v4: before and after, exact-form re-gate\n');
out.push('**What this is.** The same five courses as the first before/after page, re-checked against Tom\'s 9 October ruling: a conjugated form is allowed in a practice phrase only if that exact form has already been taught (a LEGO or component earlier in the course). **Nothing is applied.** These are staged rows; no course data was changed.\n');
out.push('**Result.** Every staged row already passed at the exact form, so no row was cut. The vocabulary gate never worked from lemmas: it tiles each target phrase out of whole taught chunks, spelt exactly. "nous espérions" in the French example is allowed because "nous espérions" is itself a LEGO at seed 107 of the French course; "espérer" alone would not have licensed it.\n');
out.push('## At a glance\n\n| Course | Rows before | Cut at exact form | Rows kept | Growth | Coverage in weak windows |\n|---|---|---|---|---|---|');
for (const [c, s] of Object.entries(sum)) out.push(`| ${NAMES[c]} | ${s.rows_before} | ${s.rows_cut} | ${s.rows_kept} | +${(s.growth_after * 100).toFixed(1)}% | ${pct(s.coverage_live_only)} → ${pct(s.coverage_after_cut)} |`);
out.push('\nCoverage is the average across the weak windows each course was filled for, live phrases only on the left, live plus surviving rows on the right. French and Bengali were also Opus-judged earlier; Korean, Hindi and Arabic have only the automatic gates, so read them with suspicion.\n');
for (const c of Object.keys(sum)) {
  const data = loadCourse(c);
  const st = JSON.parse(fs.readFileSync(path.join(RUN_DIR, c, `staged-${c}.exact.json`), 'utf8'));
  const s = sum[c];
  out.push(`## ${NAMES[c]} (${s.rows_kept} new phrases)\n`);
  const wins = [...s.windows].sort((a, b) => b.after_cut - b.live_only - (a.after_cut - a.live_only)).slice(0, 3);
  for (const w of wins) {
    const rows = st.rows.filter(r => r.seed_number >= w.start && r.seed_number <= w.end);
    const byLego = new Map();
    for (const r of rows) { const k = r.seed_number + ':' + r.lego_index; byLego.set(k, [...(byLego.get(k) || []), r]); }
    const [k, news] = [...byLego.entries()].sort((a, b) => b[1].length - a[1].length)[0] || [];
    if (!news) continue;
    const [sd, li] = k.split(':').map(Number);
    const old = data.phrases.filter(p => p.seed_number === sd && +p.lego_index === li).slice(0, 4);
    out.push(`**Seeds ${w.start}–${w.end}**: coverage ${pct(w.live_only)} → ${pct(w.after_cut)} (${w.rows_after} new). LEGO **${news[0].lego_known}** = ${news[0].lego_target} (seed ${sd}).\n`);
    out.push('| Existing | New |\n|---|---|');
    for (let i = 0; i < 4; i++) {
      const o = old[i], n = news[i];
      const f = (x, a, b) => x ? `${x[a]}<br>${x[b]}` : '';
      out.push(`| ${f(o, 'known_text', 'target_text')} | ${f(n, 'known_text', 'target_text')} |`);
    }
    out.push('');
  }
}
const f = path.join(RUN_DIR, 'exact-form-before-after.md');
fs.writeFileSync(f, out.join('\n')); console.log(f);
