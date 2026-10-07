#!/usr/bin/env node
/**
 * FILL REPORT — folds the Haiku audit, the hand check and the Opus gap fill
 * into two markdown pages: one for Tom (coverage map, tagger accuracy, token
 * cost, sample phrases) and one review sheet for the proofreader (every kept
 * candidate, by window and LEGO). READ-ONLY on the course.
 *
 * Before/after coverage is scored with the SAME hybrid tagger on both sides:
 * the kept candidates are Haiku-tagged once (cached to disk), then hybrid() adds
 * the regex's keyword frames — exactly what the live rows got in the audit.
 *
 * Usage: node tools/frame-layer/v4/fill-report.cjs fra_for_eng
 */
const fs = require('fs');
const path = require('path');
const PATTERNS = require('../patterns.cjs');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { framesOf } = require('./window-coverage.cjs');
const { loadAudit, buildPrompt, parseReply, callModel } = require('./haiku-audit.cjs');
const { scoreSets, hybrid } = require('./audit-compare.cjs');

const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '31-fra-frame-coverage');
const name = (id) => PATTERNS.find(p => p.id === id).name;
const pct = (x) => x == null ? '—' : `${Math.round(x * 100)}%`;
const bar = (x) => '█'.repeat(Math.round((x || 0) * 10)) + '░'.repeat(10 - Math.round((x || 0) * 10));

function usageOfAudit(course) {
  const dir = path.join(EVIDENCE, `haiku-audit-${course}`);
  const u = { calls: 0, total: 0, output: 0, cost: 0, ms: 0 };
  for (const f of fs.readdirSync(dir).filter(f => /^batch-\d+\.json$/.test(f))) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    u.calls++; u.total += b.usage.total; u.output += b.usage.output; u.cost += b.usage.cost_usd; u.ms += b.usage.ms;
  }
  return u;
}

async function tagCandidates(fills) {
  const cache = path.join(EVIDENCE, 'candidate-haiku-tags.json');
  const have = fs.existsSync(cache) ? JSON.parse(fs.readFileSync(cache, 'utf8')) : { tags: {}, usage: [] };
  const todo = [...new Set(fills.flatMap(f => f.kept.map(k => k.known_text)))].filter(k => !(k in have.tags));
  for (let i = 0; i < todo.length; i += 200) {
    const items = todo.slice(i, i + 200);
    const r = await callModel(buildPrompt(items));
    parseReply(r.text, items.length).forEach((t, j) => { have.tags[items[j]] = t || []; });
    have.usage.push(r.usage);
    fs.writeFileSync(cache, JSON.stringify(have, null, 1));
  }
  return have;
}

const QUICK_READ = [
  '"I thought you were very brave" → *j\'ai trouvé que tu étais…*: trouvé is "found", a gloss slip.',
  '"you told me that it was a mistake" → *tu m\'avais dit…*: pluperfect for a plain past.',
  '"bring up the clean clothes upstairs" → *monter … en haut*: redundant, clunky.',
  'Seeds 641–650 lean on "madam" + vous because the LEGO is formal; that is the seed\'s own register, but it makes the window\'s new USE phrases samey.',
];

async function main(course) {
  const cmp = JSON.parse(fs.readFileSync(path.join(EVIDENCE, `audit-compare-${course}.json`), 'utf8'));
  const hc = JSON.parse(fs.readFileSync(path.join(EVIDENCE, `handcheck-50-${course}.json`), 'utf8'));
  const fills = fs.readdirSync(EVIDENCE).filter(f => new RegExp(`^v4gap-${course}-\\d+-\\d+\\.json$`).test(f))
    .map(f => JSON.parse(fs.readFileSync(path.join(EVIDENCE, f), 'utf8'))).sort((a, b) => a.region[0] - b.region[0]);
  const ctags = await tagCandidates(fills);
  const data = loadCourse(course);
  const inv = inventory(course, data);
  const H = loadAudit(path.join(EVIDENCE, `haiku-audit-${course}`));
  const liveTag = (p) => hybrid(H.get(String(p.known_text).trim()), framesOf(p.known_text));
  const candTag = (k) => hybrid(ctags.tags[k.known_text], framesOf(k.known_text));

  const audit = usageOfAudit(course);
  const fillU = fills.reduce((a, f) => { for (const c of f.calls) { a.total += c.total; a.output += c.output; a.cost += c.cost_usd; a.calls++; a.ms += c.ms; } return a; }, { calls: 0, total: 0, output: 0, cost: 0, ms: 0 });
  const tagU = ctags.usage.reduce((a, u) => a + u.total, 0);

  const rows = fills.map(f => {
    const [s, e] = f.region;
    const avail = availableAt(inv, e);
    const live = data.phrases.filter(p => p.seed_number >= s && p.seed_number <= e);
    const before = scoreSets(live.map(liveTag), avail);
    const after = scoreSets([...live.map(liveTag), ...f.kept.map(candTag)], avail);
    const roles = f.kept.reduce((a, k) => (a[k.phrase_role]++, a), { build: 0, use: 0 });
    return { f, s, e, before, after, roles, rej: f.rejected.length, reasons: f.rejected.flatMap(r => r.reasons.map(x => x.replace(/:.*$/, '').replace(/".*$/, '').trim())) };
  });

  // ---------- Tom's page ----------
  const L = [];
  const w20 = cmp.windows.hybrid.w20, r20 = cmp.windows.regex.w20;
  const mean = (ws) => ws.reduce((a, w) => a + w.coverage, 0) / ws.length;
  L.push(`# French frame coverage — Haiku audits, Opus fills the gaps`);
  L.push('');
  L.push(`fra_for_eng, ${cmp.rows.toLocaleString()} live BUILD+USE phrases, 668 seeds, scored against the 31 canon frames in patterns.cjs. Interjection openers earn nothing. Nothing was written to the course: the new phrases are candidates for Kai's proofread, on the review sheet linked at the bottom.`);
  L.push('');
  L.push(`## Verdict`);
  L.push('');
  const hk = hc.items.filter(i => i.fired_by === 'haiku'), rg = hc.items.filter(i => i.fired_by === 'regex');
  L.push(`- **Neither tagger alone is right; the combination is.** Where only Haiku saw a frame it was right ${hk.filter(i => i.right === 'haiku').length} of ${hk.length} times (${hk.filter(i => i.right === 'ambiguous').length} ambiguous): the regexes have real bugs — \`\\bn't\` never matches inside "don't", so P23 misses ~1,600 negations; "there's" needs a space; the perfect-participle list lacks most verbs. Where only the regex saw one, it split ${rg.filter(i => i.right === 'regex').length}–${rg.filter(i => i.right === 'haiku').length}: the regex wins on keyword frames (can, should, going to, hope, although), and Haiku wins on structural ones (complementiser "that" is not a relative clause, "like that" is not liking, "know something" has no clause).`);
  L.push(`- **The hybrid tagger** (Haiku's frames, plus the regex on the 14 keyword frames) is the measure used below. It rates the course a bit lower than the regex alone: mean 20-seed coverage **${pct(mean(w20))}** against the regex's ${pct(mean(r20))}, because the regex had been crediting false hits.`);
  L.push(`- **The course runs out of frames in the second half.** Up to seed 300 the 20-seed windows mostly sit at 70–93% of available frames; from seed 300 on, most sit at 50–67%. The frames that go missing most often are the rare-but-teachable ones: as…as, what's-it-like, there is/are, counterfactual, must/may/might, hope, relative clauses.`);
  const avgB = rows.reduce((a, r) => a + r.before.coverage, 0) / rows.length, avgA = rows.reduce((a, r) => a + r.after.coverage, 0) / rows.length;
  L.push(`- **Opus gap fill works and is cheap**: two calls per window (the second aimed at what the first left) raised the five weakest 10-seed windows from **${pct(avgB)} to ${pct(avgA)}** mean coverage, with ${rows.reduce((a, r) => a + r.f.kept.length, 0)} new phrases that passed every mechanical gate (vocabulary available at that LEGO, ZUT against the whole course, no openers, no duplicates of live rows).`);
  L.push('');
  L.push(`## Cost`);
  L.push('');
  L.push(`| Step | Model | Calls | Tokens | Output tokens | Notional $ | Wall time |`);
  L.push(`|---|---|---:|---:|---:|---:|---:|`);
  L.push(`| Audit: tag ${cmp.rows.toLocaleString()} phrases | Haiku | ${audit.calls} | ${audit.total.toLocaleString()} | ${audit.output.toLocaleString()} | ${audit.cost.toFixed(2)} | ~9 min at 4 parallel |`);
  L.push(`| Fill: 5 weakest windows | Opus | ${fillU.calls} | ${fillU.total.toLocaleString()} | ${fillU.output.toLocaleString()} | ${fillU.cost.toFixed(2)} | ${Math.round(fillU.ms / 60000)} min |`);
  L.push(`| Tag the new candidates | Haiku | ${ctags.usage.length} | ${tagU.toLocaleString()} | | | |`);
  L.push('');
  L.push(`Per window the fill spent ${rows.map(r => `${r.s}–${r.e}: ${r.f.calls.reduce((a, c) => a + c.total, 0).toLocaleString()}`).join(' · ')} tokens (cap 120k each). The whole-course audit costs about what ${Math.max(1, Math.round(audit.total / (fillU.total / Math.max(1, fillU.calls))))} Opus fill calls do, and on the notional price it is ~${Math.round(fillU.cost / Math.max(audit.cost, 0.01))}× cheaper than the fill.`);
  L.push('');
  L.push(`## Before → after, the five filled windows`);
  L.push('');
  L.push(`| Seeds | Live phrases | Coverage before | after | Frames before → after | New phrases kept (BUILD/USE) | Refused by the gates | Still missing |`);
  L.push(`|---|---:|---:|---:|---|---:|---:|---|`);
  for (const r of rows) L.push(`| ${r.s}–${r.e} | ${r.before.phrases} | ${pct(r.before.coverage)} | **${pct(r.after.coverage)}** | ${r.before.used} → ${r.after.used} of ${r.before.available} | ${r.f.kept.length} (${r.roles.build}/${r.roles.use}) | ${r.rej} | ${r.after.missing_ids.join(' ') || '—'} |`);
  L.push('');
  const reasonCount = {};
  for (const r of rows) for (const x of r.reasons) reasonCount[x] = (reasonCount[x] || 0) + 1;
  L.push(`Why candidates were refused: ${Object.entries(reasonCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} (${v})`).join('; ')}.`);
  L.push('');
  L.push(`## Sample new phrases`);
  L.push('');
  for (const r of rows) {
    const use = r.f.kept.filter(k => k.phrase_role === 'use');
    const picks = []; const seenF = new Set();
    for (const k of use) { const nf = candTag(k).filter(x => r.before.missing_ids.includes(x)); if (nf.length && !nf.every(x => seenF.has(x))) { picks.push({ k, nf }); nf.forEach(x => seenF.add(x)); } if (picks.length >= 4) break; }
    L.push(`**Seeds ${r.s}–${r.e}**`);
    L.push('');
    for (const { k, nf } of picks) L.push(`- ${k.known_text} — *${k.target_text}*  · new frame: ${nf.map(name).join(', ')}`);
    L.push('');
  }
  L.push(`## Coverage map, whole course (20-seed windows, hybrid tagger)`);
  L.push('');
  L.push(`Coverage = frames used by the window's phrases ÷ frames available by its last seed (available from seed 1 onward, all 30 by seed ~140).`);
  L.push('');
  L.push(`| Seeds | Phrases | Coverage | | Regex said | Missing frames |`);
  L.push(`|---|---:|---:|---|---:|---|`);
  for (let i = 0; i < w20.length; i++) { const w = w20[i]; L.push(`| ${w.start}–${w.end} | ${w.phrases} | ${pct(w.coverage)} | \`${bar(w.coverage)}\` | ${pct(r20[i].coverage)} | ${w.missing_ids.join(' ')} |`); }
  L.push('');
  const w10 = [...cmp.windows.hybrid.w10].sort((a, b) => a.coverage - b.coverage || a.rarefied_at_60 - b.rarefied_at_60).slice(0, 12);
  L.push(`**Weakest 10-seed windows:** ${w10.map(w => `${w.start}–${w.end} ${pct(w.coverage)}`).join(' · ')}. The five filled were the first five.`);
  L.push('');
  const missCount = {};
  for (const w of w20) for (const m of w.missing_ids) missCount[m] = (missCount[m] || 0) + 1;
  L.push(`**Frames most often missing** (number of 20-seed windows of ${w20.length} without them): ${Object.entries(missCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${name(k)} ${v}`).join(' · ')}.`);
  L.push('');
  L.push(`## Haiku vs the regex tagger, per frame`);
  L.push('');
  L.push(`Exact agreement on a phrase's whole frame set: ${pct(cmp.exact_set_agreement)}. κ = Cohen's kappa (1 = identical).`);
  L.push('');
  L.push(`| Frame | Both | Haiku only | Regex only | κ |`);
  L.push(`|---|---:|---:|---:|---:|`);
  for (const [id, f] of Object.entries(cmp.per_frame)) L.push(`| ${id} ${f.name} | ${f.both} | ${f.haiku_only} | ${f.regex_only} | ${f.kappa} |`);
  L.push('');
  L.push(`Hand check: 50 disagreements, stratified across frames, judged by Opus against each frame's shape — Haiku right ${hc.haiku_right}, regex right ${hc.regex_right}, ambiguous ${hc.ambiguous}.`);
  L.push('');
  L.push(`## Quick read of the new phrases (not a proofread)`);
  L.push('');
  L.push(`The gates are mechanical. Reading the set once, most phrases are plain and correct; these slipped through and are flagged on the review sheet:`);
  L.push('');
  for (const q of QUICK_READ) L.push(`- ${q}`);
  L.push('');
  L.push(`## Gaps in this trial`);
  L.push('');
  L.push(`- Availability (when a frame first becomes usable) still comes from the regex inventory, so the "available" denominator inherits the regex's blind spots.`);
  L.push(`- The hand check was one Opus judge in this session, not a second family; the 50 items are stratified by frame, so they show *which kind* of error each tagger makes, not the course-wide error rate.`);
  L.push(`- The gates are mechanical (vocabulary, ZUT, no openers). Naturalness and meaning are Kai's proofread — nothing goes in without it.`);
  L.push('');
  L.push(`REVIEW_SHEET_URL`);

  // ---------- review sheet ----------
  const R = [];
  R.push(`# French gap-fill candidates for review — fra_for_eng`);
  R.push('');
  R.push(`New phrases written by Opus for the five weakest stretches of the course, to add frames those seeds never practise. Each one practises the LEGO named above it, uses only vocabulary the learner has by that LEGO, and passed the mechanical gates (ZUT across the whole course, no openers, not already in the course). **None of these is in the course.** Naturalness, meaning and register are yours to judge: mark any to cut.`);
  R.push('');
  R.push(`Already spotted on a quick read: ${QUICK_READ.join(' · ')}`);
  R.push('');
  for (const r of rows) {
    R.push(`## Seeds ${r.s}–${r.e} (coverage ${pct(r.before.coverage)} → ${pct(r.after.coverage)})`);
    R.push('');
    const byLego = new Map();
    for (const k of r.f.kept) { const key = `S${k.seed_number}L${k.lego_index}`; if (!byLego.has(key)) byLego.set(key, []); byLego.get(key).push(k); }
    for (const [key, ks] of byLego) {
      R.push(`**${key}** "${ks[0].lego_known}" = ${ks[0].lego_target}`);
      R.push('');
      for (const k of ks) R.push(`- ${k.phrase_role.toUpperCase()} · ${k.known_text} → **${k.target_text}**`);
      R.push('');
    }
  }
  fs.writeFileSync(path.join(EVIDENCE, `fra-frame-coverage-report.md`), L.join('\n') + '\n');
  fs.writeFileSync(path.join(EVIDENCE, `fra-gapfill-review-sheet.md`), R.join('\n') + '\n');
  fs.writeFileSync(path.join(EVIDENCE, `fill-before-after.json`), JSON.stringify(rows.map(r => ({ seeds: [r.s, r.e], before: r.before, after: r.after, kept: r.f.kept.length, roles: r.roles, rejected: r.rej, tokens: r.f.calls.reduce((a, c) => a + c.total, 0) })), null, 1));
  console.log(`report + review sheet written; ${rows.length} windows; audit ${audit.total} tokens; fill ${fillU.total} tokens`);
}

if (require.main === module) main(process.argv[2] || 'fra_for_eng').catch(e => { console.error(e); process.exit(1); });
