#!/usr/bin/env node
'use strict';
/**
 * CAST DRIFT: which premium courses still SERVE Azure clips in a role whose cast is Cartesia, and how much of that can
 * be fixed for free from clips we already hold (cs #470, Tom 22 Nov: "realise why we missed this ... make sure we have a
 * plan"; ruling r-2026-11-22-azure-voices-are-catastrophically-bad-now).
 *
 * WHY IT EXISTS. The cast resolver casts NEW recordings in Cartesia but never re-points existing clips, and the 19 Nov
 * four-day plan (cs #35) picked its courses by hand (build-days.py DAYS): spa_for_zho and five premium-LIVE Indic courses
 * were counted by the census and then sat on no day list, and nothing said so. This turns the census into an alarm: every
 * course over the threshold is listed, and every one with no day list is named as UNPLANNED.
 *
 * NO DATABASE. Reads two local files only:
 *   1. an azure-census.cjs output (run that, unchanged, against the nightly QA copy);
 *   2. the clip_index dump tools/audio-estate-coverage.cjs caches (clip-index/clip-index-dump.tsv.gz under evidence).
 *   node ops/voice-casting/azure-to-cartesia/cast-drift.cjs <census.json> [--index <dump.tsv.gz>] [--threshold 0.02]
 *        [--tier premium] [--planned a,b,c] [--exclude ara_for_eng,...] [--out drift.json]
 * Exit code 0 always; the alarm is the "breaches" array (and the UNPLANNED lines on stdout), so a nightly job can post it.
 *
 * Per course and role: azure slots, share of the course's rows (every seed / LEGO / non-component phrase row carries a
 * known, target1 and target2 slot; presentation is per LEGO), asks (one render call each), and the asks split by the
 * clip index into
 *   held_cast   — words already held in THIS language in the cast voice: library-first links them free;
 *   held_other  — held only in another voice (the Azure take itself, at least): a paid render, needs a re-record grant;
 *   missing     — not held in this language at all (should be ~0: the slot has a clip).
 * Presentation asks are never free: intros are always rendered fresh (exists-in-language-guard.cjs).
 * Roles whose cast is NOT Cartesia ("stay Azure": no cast exists, e.g. Chinese presentation on Xiaochen) are listed as
 * gaps, never as plan items.
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const R = path.resolve(__dirname, '../../..');
const { clipTextKey, clipLanguageKey } = require(path.join(R, 'services/shared/clip-index.cjs'));
const { tryCanonicalVoiceId } = require(path.join(R, 'services/shared/clip-identity.cjs'));
const { evidencePath } = require(path.join(R, 'tools/lib/evidence-path.cjs'));

const args = process.argv.slice(2);
const arg = (n, d = null) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const list = (s) => new Set(String(s || '').split(',').map((x) => x.trim()).filter(Boolean));

function loadIndex(file) {
  const idx = new Map();
  if (!file || !fs.existsSync(file)) return null;
  for (const l of zlib.gunzipSync(fs.readFileSync(file)).toString('utf8').split('\n')) {
    if (!l) continue;
    const t1 = l.indexOf('\t'), t2 = l.indexOf('\t', t1 + 1), t3 = l.indexOf('\t', t2 + 1);
    const k = `${l.slice(0, t1)}\u001f${l.slice(t3 + 1)}`;
    const v = l.slice(t1 + 1, t2);
    let s = idx.get(k); if (!s) idx.set(k, (s = new Set()));
    s.add(tryCanonicalVoiceId(v) || v);
  }
  return idx;
}

function drift(census, { index, threshold = 0.02, tier = 'premium', planned = new Set(), exclude = new Set() }) {
  const out = [];
  for (const c of census.courses) {
    if (c.skipped || (tier && c.pricing_tier !== tier) || exclude.has(c.course)) continue;
    const rows = c.rows || 0;
    const course = { course_code: c.course, known_lang: c.known_lang, target_lang: c.target_lang };
    const roles = {};
    for (const [role, st] of Object.entries(c.roles || {})) {
      roles[role] = { cast: st.cast, inScope: st.inScope, azureSlots: st.slots, share: rows ? +(st.slots / rows).toFixed(4) : null,
        asks: st.asks, chars: st.chars, azureVoices: st.azureVoices };
    }
    const paidKeys = [];
    for (const a of c.asks || []) {
      const r = roles[a.role];
      const lang = clipLanguageKey(a.role === 'known' || a.role === 'presentation' ? c.known_lang : c.target_lang, course);
      let verdict = 'unknown';
      if (a.role === 'presentation') verdict = 'held_other';
      else if (a.freeInCourse) verdict = 'held_cast';
      else if (index) {
        const vs = index.get(`${lang}\u001f${clipTextKey(a.text)}`) || new Set();
        verdict = vs.has(tryCanonicalVoiceId(a.voiceId) || a.voiceId) ? 'held_cast' : vs.size ? 'held_other' : 'missing';
      }
      if (verdict !== 'held_cast') paidKeys.push([a.role === 'presentation' ? `${c.course}\u001f${a.text}` : `${lang}\u001f${clipTextKey(a.text)}\u001f${tryCanonicalVoiceId(a.voiceId) || a.voiceId}`, a.chars]);
      const e = (r[verdict] || (r[verdict] = { asks: 0, chars: 0, slots: 0 }));
      e.asks++; e.chars += a.chars; e.slots += a.slots.length;
    }
    const inScope = Object.values(roles).filter((r) => r.inScope);
    const sum = (k, f) => inScope.reduce((n, r) => n + ((r[k] && r[k][f]) || 0), 0);
    const worst = Math.max(0, ...inScope.map((r) => r.share || 0));
    const entry = {
      course: c.course, status: c.new_app_status, tier: c.pricing_tier, rows, worstShare: worst,
      azureSlotsInCast: inScope.reduce((n, r) => n + r.azureSlots, 0),
      freeLinkAsks: sum('held_cast', 'asks'), freeLinkSlots: sum('held_cast', 'slots'),
      paidAsks: sum('held_other', 'asks') + sum('missing', 'asks'), paidChars: sum('held_other', 'chars') + sum('missing', 'chars'),
      grantRoles: inScope.filter((r) => (r.held_other || r.missing)).map((r) => Object.keys(roles).find((k) => roles[k] === r)),
      stayAzure: Object.fromEntries(Object.entries(roles).filter(([, r]) => !r.inScope).map(([k, r]) => [k, { cast: r.cast, slots: r.azureSlots, chars: r.chars }])),
      roles, planned: planned.has(c.course),
    };
    Object.defineProperty(entry, 'paidKeys', { value: paidKeys, enumerable: false });
    entry.breach = worst >= threshold;
    out.push(entry);
  }
  const ord = { live: 0, beta: 1 };
  out.sort((a, b) => (ord[a.status] ?? 2) - (ord[b.status] ?? 2) || b.paidChars - a.paidChars);
  // In this order, words a course before it renders in the same language and voice are a free library link by then.
  const seen = new Set();
  for (const x of out) {
    x.paidCharsInOrder = 0; x.paidAsksInOrder = 0;
    for (const [k, n] of x.paidKeys) if (!seen.has(k)) { seen.add(k); x.paidCharsInOrder += n; x.paidAsksInOrder++; }
  }
  return { censusGeneratedAt: census.generatedAt, db: census.db, threshold, tier, courses: out,
    breaches: out.filter((x) => x.breach).map((x) => ({ course: x.course, status: x.status, worstShare: x.worstShare, planned: x.planned })) };
}

function main() {
  const census = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const indexFile = arg('index', evidencePath('clip-index/clip-index-dump.tsv.gz'));
  const index = loadIndex(indexFile);
  const res = drift(census, { index, threshold: Number(arg('threshold', '0.02')), tier: arg('tier', 'premium'),
    planned: list(arg('planned')), exclude: list(arg('exclude')) });
  res.index = index ? { file: indexFile, mtime: fs.statSync(indexFile).mtime.toISOString() } : null;
  const OUT = arg('out');
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log(`census ${res.db} (${res.censusGeneratedAt}); index ${res.index ? res.index.mtime : 'NONE: free/paid split unknown'}`);
  for (const x of res.courses) {
    const tag = x.breach ? (x.planned ? 'BREACH' : 'BREACH UNPLANNED') : 'ok';
    console.log(`${tag.padEnd(16)} ${x.course.padEnd(15)} ${String(x.status).padEnd(13)} worst ${(x.worstShare * 100).toFixed(1).padStart(5)}%  azure-in-cast ${x.azureSlotsInCast}  free ${x.freeLinkAsks}a  paid ${x.paidAsks}a/${x.paidChars}c  in-order ${x.paidAsksInOrder}a/${x.paidCharsInOrder}c  stayAzure ${Object.keys(x.stayAzure).join(',') || '-'}`);
  }
}
module.exports = { drift, loadIndex };
if (require.main === module) main();
