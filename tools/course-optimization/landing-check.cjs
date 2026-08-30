#!/usr/bin/env node
/**
 * THE LANDING CHECK — would the model answer land, or derail the learner?
 *
 * Replaces the un-noded / untaught-word census. READ-ONLY: touches no course content,
 * writes nothing to the database, queues no audio, changes no validator.
 *
 * THE QUESTION IT ASKS (Tom, 2026-08-30):
 *   "Once the v1/v2 model voices say it correctly, are they likely to go 'yes, ok, that's it'
 *    — or 'sorry, what???'"
 * The learner is never required to SUCCEED at producing the phrase. They attempt, then hear the
 * model answer. So a slight reach is fine, even good. The only genuine defect is the DERAILMENT:
 * the model voice says something the learner has no hook for at all, and they lose the thread.
 *
 * WHAT THIS FIXES IN THE OLD CHECK
 *   (a) It asked a DELIVERY question — "was this exact string handed over as a taught unit?"
 *       Here, extraction counts: contigo + conmigo together make `con` available, because the
 *       shared part and the varying part teach each other. Generalised to fused affix contrast,
 *       one-slot minimal pairs, and subtraction pairs, with known-side corroboration.
 *   (b) It ignored the PODS. Pods are scheduled INTO the main flow, so the default learner has
 *       met them. Pod exposure counts as taught, fully, and is not gated on audio presence.
 *   (c) It counted TOKENS. The unit here is the PHRASE: one unattributable token does not spoil
 *       a phrase; the question is whether the whole thing lands.
 *   It also carries NO target-side free-class exemption. That list (con, de, la, me, te, por,
 *   para, que) was an assumption nobody ruled, and it is what hid `con`. The landing test
 *   replaces the need for it.
 *
 * TWO STAGES, AND THE CODE KEEPS THEM APART ON PURPOSE
 *   MECHANICAL (this file, stage 1): a cheap, deterministic hook-strength model. It can prove a
 *     learner HAS a hook. It can never prove they have none — absence of a mechanical hook is a
 *     SHORTLIST, not a verdict.
 *   JUDGEMENT  (stage 2, landing-judge.cjs): an LLM rules on the shortlist. A matcher cannot rule
 *     on "would this land", so it does not try.
 *
 * HOOK STRENGTH per target token, strongest first:
 *   4 CHUNK      covered whole by a taught chunk available at this point (or the phrase's own LEGO)
 *   3 WORD       stood as its own word inside an earlier taught chunk, or inside a pod sentence
 *                the learner has already heard
 *   2 EXTRACTION isolated by contrast among chunks already given (fused affix pair, one-slot
 *                minimal pair, subtraction pair) — with the known side corroborating
 *   1 MORPH      only a related form is available (accent variant, shared stem, clitic stem)
 *   0 NONE       nothing at all
 * Strength >= 2 lands mechanically. A phrase carrying any token at 0 or 1 goes to judgement.
 *
 * Usage:
 *   node tools/course-optimization/landing-check.cjs spa_for_eng --out /path/shortlist.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Live values read from algorithm_config at run time; these are only the code defaults
// (packages/player-vue/src/providers/generateLearningScript.ts).
const DEFAULT_POD_ACTIVATION_ROUND = 6;
const DEFAULT_POD_ROUND_INTERVAL = 5;
const SERVING_POD_SLUGS = ['pod-1', 'pod-0'];

function sb() {
  return createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Lowercase, strip punctuation, collapse space. Accents KEPT — they distinguish words. */
function norm(s) {
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/[¿?¡!.,;:"'“”‘’()\[\]…—–\-«»]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function toks(s) { const n = norm(s); return n ? n.split(' ') : []; }
/** Accent-folded, used only to EXPLAIN a weak hook, never to claim a strong one. */
function fold(s) { return norm(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

async function page(client, table, cols, filter, orderCols) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = client.from(table).select(cols);
    for (const [k, v] of Object.entries(filter)) q = q.eq(k, v);
    for (const c of orderCols) q = q.order(c, { ascending: true });
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

/** Which pod does this course serve, and what does the live scheduler config say? */
async function loadPodSchedule(client, courseCode) {
  const { data: cfgRows } = await client.from('algorithm_config').select('key,config');
  const podCfg = (cfgRows || []).find((r) => r.key === 'pods')?.config || {};
  const listening = (cfgRows || []).find((r) => r.key === 'listening')?.config || {};
  const activation = listening.podActivationRound ?? podCfg.podActivationRound ?? DEFAULT_POD_ACTIVATION_ROUND;
  const interval = Math.max(1, Math.floor(podCfg.roundInterval ?? DEFAULT_POD_ROUND_INTERVAL));

  const { data: pods } = await client.from('listening_pods')
    .select('id,slug').eq('course_code', courseCode).eq('pod_type', 'core');
  const found = new Set((pods || []).map((p) => p.slug));
  const slug = SERVING_POD_SLUGS.find((s) => found.has(s)) || null;
  if (!slug) return { activation, interval, slug: null, sentences: [] };
  const podId = (pods || []).find((p) => p.slug === slug).id;
  // Tom's ruling: assume every pod sentence WITH TEXT has been heard. Do not gate on audio.
  const sentences = await page(client, 'listening_pod_sentences',
    'global_order,known_text,target_text', { pod_id: podId }, ['global_order']);
  return { activation, interval, slug, sentences };
}

/**
 * MECHANICAL — the contrast index. Which tokens does the learner extract from chunks they have?
 * Three routes, each requiring the KNOWN side to corroborate so an accidental target-string
 * overlap cannot manufacture a false acquisition.
 */
function extractionsFrom(chunks) {
  // chunks: [{ target, known }] all available at this point. Returns Set of extracted tokens.
  const out = new Set();
  const single = chunks.filter((c) => c.t.length === 1);
  const knownShare = (a, b) => {
    const A = new Set(toks(a.known)), B = toks(b.known);
    return B.some((w) => A.has(w) && w.length > 1);
  };
  // Route 1 — FUSED AFFIX PAIR: contigo / conmigo share `con`; known sides share "with".
  for (let i = 0; i < single.length; i++) {
    for (let j = i + 1; j < single.length; j++) {
      const a = single[i].t[0], b = single[j].t[0];
      if (a === b) continue;
      if (!knownShare(single[i], single[j])) continue;
      let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
      if (p >= 2 && p < a.length && p < b.length) out.add(a.slice(0, p));
      let s = 0; while (s < a.length && s < b.length && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
      if (s >= 2 && s < a.length && s < b.length) out.add(a.slice(a.length - s));
    }
  }
  // Routes 2 and 3 work over multi-token chunks.
  const multi = chunks.filter((c) => c.t.length > 1);
  const all = chunks;
  for (let i = 0; i < multi.length; i++) {
    for (let j = 0; j < all.length; j++) {
      const A = multi[i], B = all[j];
      if (A === B) continue;
      // Route 2 — ONE-SLOT MINIMAL PAIR: "él quiere" / "ella quiere" isolates both slots.
      if (A.t.length === B.t.length) {
        let diff = -1, n = 0;
        for (let k = 0; k < A.t.length; k++) if (A.t[k] !== B.t[k]) { diff = k; n++; }
        if (n === 1 && knownShare(A, B)) { out.add(A.t[diff]); out.add(B.t[diff]); }
      }
      // Route 3 — SUBTRACTION: "más tarde" minus "tarde" isolates `más`.
      if (A.t.length === B.t.length + 1 && knownShare(A, B)) {
        const rest = [...A.t];
        let ok = true;
        for (const w of B.t) { const k = rest.indexOf(w); if (k < 0) { ok = false; break; } rest.splice(k, 1); }
        if (ok && rest.length === 1) out.add(rest[0]);
      }
    }
  }
  return out;
}

/** MECHANICAL — max-coverage tiling of a token list against available chunk strings. */
function tileCovered(tokens, chunkSet, maxLen) {
  const n = tokens.length;
  const best = new Array(n + 1).fill(-1); best[0] = 0;
  const from = new Array(n + 1).fill(null);
  for (let i = 0; i < n; i++) {
    if (best[i] < 0) continue;
    if (best[i] > best[i + 1]) { best[i + 1] = best[i]; from[i + 1] = { i, len: 1, hit: false }; }
    for (let len = 2; len <= Math.min(maxLen, n - i); len++) {
      const key = tokens.slice(i, i + len).join(' ');
      if (!chunkSet.has(key)) continue;
      if (best[i] + len > best[i + len]) { best[i + len] = best[i] + len; from[i + len] = { i, len, hit: true }; }
    }
    if (chunkSet.has(tokens[i])) {
      if (best[i] + 1 > best[i + 1]) { best[i + 1] = best[i] + 1; from[i + 1] = { i, len: 1, hit: true }; }
    }
  }
  const covered = new Array(n).fill(false);
  let p = n;
  while (p > 0 && from[p]) { const f = from[p]; if (f.hit) for (let k = f.i; k < p; k++) covered[k] = true; p = f.i; }
  return covered;
}

/** MECHANICAL — is a related form available? Weakest hook; always sent to judgement. */
function morphHook(token, wordSet, foldIndex) {
  if (foldIndex.has(fold(token))) {
    const w = foldIndex.get(fold(token));
    if (w !== token) return { kind: 'accent_or_diacritic_variant', of: w };
  }
  for (const w of wordSet) {
    if (w === token) continue;
    if (w.length >= 4 && token.startsWith(w)) return { kind: 'available_word_plus_ending', of: w };
    if (token.length >= 4 && w.startsWith(token) && w.length - token.length <= 3) return { kind: 'shorter_form_of_available_word', of: w };
    if (w.length >= 5 && token.length >= 5) {
      let p = 0; while (p < w.length && p < token.length && w[p] === token[p]) p++;
      if (p >= 5) return { kind: 'shares_stem_with_available_word', of: w };
    }
  }
  return null;
}

async function main() {
  const courseCode = process.argv[2];
  const outIdx = process.argv.indexOf('--out');
  const outPath = outIdx > 0 ? process.argv[outIdx + 1] : null;
  if (!courseCode) { console.error('usage: landing-check.cjs <course_code> [--out file.json]'); process.exit(2); }
  const client = sb();

  const legos = await page(client, 'course_legos',
    'lego_id,seed_number,lego_index,type,is_new,known_text,target_text,components',
    { course_code: courseCode }, ['seed_number', 'lego_index']);
  const phrases = await page(client, 'course_practice_phrases',
    'id,seed_number,lego_index,position,known_text,target_text,phrase_role',
    { course_code: courseCode }, ['seed_number', 'lego_index', 'position']);
  const NO_PODS = process.argv.includes('--no-pods');
  const pod = NO_PODS
    ? { activation: 0, interval: 1, slug: null, sentences: [] }
    : await loadPodSchedule(client, courseCode);
  if (!legos.length) { console.error('no legos — aborting'); process.exit(3); }

  // MAIN ROUND = ordinal of a NEW lego, 1-based, in course order. Confirmed against
  // generateLearningScript.ts, where roundNumber++ fires once per is_new lego.
  legos.sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  let round = 0;
  for (const l of legos) { if (l.is_new !== false) round++; l.round = round; }
  const totalRounds = round;

  // Pod sentence n is first heard at the END of main round activation + (n-1)*interval,
  // so it is credited from the round AFTER that. Conservative by exactly one round.
  const podFirstRound = (n) => pod.activation + (n - 1) * pod.interval;
  const podWordsByRound = []; // [{ round, words:Set, order, target }]
  for (const s of pod.sentences) {
    if (!s.target_text) continue;
    podWordsByRound.push({ round: podFirstRound(s.global_order) + 1, order: s.global_order, toks: toks(s.target_text), known: s.known_text, target: s.target_text });
  }
  podWordsByRound.sort((a, b) => a.round - b.round);

  const phrasesByLego = new Map();
  for (const p of phrases) {
    if (p.phrase_role !== 'build' && p.phrase_role !== 'use') continue;
    const k = `${p.seed_number}:${p.lego_index}`;
    if (!phrasesByLego.has(k)) phrasesByLego.set(k, []);
    phrasesByLego.get(k).push(p);
  }

  // Rolling availability, advanced one LEGO at a time.
  const chunkSet = new Set();          // every taught chunk string available
  const chunkList = [];                // [{t:[tokens], known}] for the contrast index
  const wordSet = new Set();           // every word STANDING inside an available chunk
  const foldIndex = new Map();         // folded form -> a real available word
  const podWordSet = new Set();        // every word inside a pod sentence already heard
  const podSourceOf = new Map();       // word -> the pod sentence that first carried it
  let maxLen = 1;
  let extracted = new Set();
  let extractionDirty = true;
  let podCursor = 0;

  const addChunk = (target, known) => {
    const t = toks(target);
    if (!t.length) return;
    const key = t.join(' ');
    if (!chunkSet.has(key)) {
      chunkSet.add(key); chunkList.push({ t, known: known || '' });
      maxLen = Math.max(maxLen, t.length); extractionDirty = true;
    }
    for (const w of t) { wordSet.add(w); if (!foldIndex.has(fold(w))) foldIndex.set(fold(w), w); }
  };

  const shortlist = [];
  let considered = 0, landedMechanically = 0;
  const strengthTally = { 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };

  for (const lego of legos) {
    // Pods heard by the time this round is played.
    while (podCursor < podWordsByRound.length && podWordsByRound[podCursor].round <= lego.round) {
      const s = podWordsByRound[podCursor++];
      for (const w of s.toks) if (!podWordSet.has(w)) { podWordSet.add(w); podSourceOf.set(w, s); }
    }

    // The phrase's OWN lego is being taught in this round: its target and components are given.
    const ownKeys = [norm(lego.target_text)].filter(Boolean);
    for (const c of (Array.isArray(lego.components) ? lego.components : [])) {
      const ck = norm(c && (c.target || c.target_text)); if (ck) ownKeys.push(ck);
    }
    const localSet = new Set([...chunkSet, ...ownKeys]);
    const localMax = Math.max(maxLen, ...ownKeys.map((k) => k.split(' ').length));
    const localWords = new Set(wordSet);
    for (const k of ownKeys) for (const w of k.split(' ')) localWords.add(w);
    if (extractionDirty) { extracted = extractionsFrom(chunkList); extractionDirty = false; }

    for (const p of (phrasesByLego.get(`${lego.seed_number}:${lego.lego_index}`) || [])) {
      considered++;
      const t = toks(p.target_text);
      const covered = tileCovered(t, localSet, localMax);
      const weak = [];
      for (let i = 0; i < t.length; i++) {
        const tok = t[i];
        let strength, why;
        if (covered[i]) { strength = 4; why = 'taught chunk'; }
        else if (localWords.has(tok)) { strength = 3; why = 'stood as its own word inside a taught chunk'; }
        else if (podWordSet.has(tok)) { strength = 3; why = `heard in pod sentence ${podSourceOf.get(tok).order}: "${podSourceOf.get(tok).target}"`; }
        else if (extracted.has(tok)) { strength = 2; why = 'isolated by contrast among chunks already given'; }
        else {
          const m = morphHook(tok, localWords, foldIndex) || morphHook(tok, podWordSet, new Map());
          if (m) { strength = 1; why = `${m.kind}: ${m.of}`; }
          else { strength = 0; why = 'nothing available resembles it'; }
        }
        strengthTally[strength]++;
        if (strength <= 1) weak.push({ token: tok, strength, why });
      }
      if (!weak.length) { landedMechanically++; continue; }
      shortlist.push({
        phrase_id: p.id, role: p.phrase_role, seed: p.seed_number, lego_index: p.lego_index,
        round: lego.round, known: p.known_text, target: p.target_text,
        lego_known: lego.known_text, lego_target: lego.target_text,
        weak,
        context: {
          pods_heard: podCursor,
          chunks_available: chunkSet.size,
          nearest_available: weak.map((w) => ({ token: w.token, note: w.why })),
        },
      });
    }

    // This LEGO is now taught: it and its components join the rolling inventory for
    // every later round.
    addChunk(lego.target_text, lego.known_text);
    for (const c of (Array.isArray(lego.components) ? lego.components : [])) {
      const ct = c && (c.target || c.target_text);
      if (ct) addChunk(ct, (c && (c.known || c.known_text)) || lego.known_text);
    }
  }

  const summary = {
    course: courseCode, generated: new Date().toISOString(),
    pods_credited: !NO_PODS,
    rounds: totalRounds, phrases_considered: considered,
    pod: { slug: pod.slug, sentences: pod.sentences.length, activation_round: pod.activation, interval: pod.interval,
           last_sentence_first_heard_round: pod.sentences.length ? podFirstRound(pod.sentences.length) : null },
    landed_mechanically: landedMechanically,
    shortlisted_for_judgement: shortlist.length,
    shortlist_share: +(100 * shortlist.length / considered).toFixed(2),
    token_hook_strength: strengthTally,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify({ summary, shortlist }, null, 2));
    console.error(`shortlist -> ${outPath}`);
  }
  if (!considered) { console.error('ABORT: no phrases considered'); process.exit(3); }
}

if (require.main === module) {
  main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
}

module.exports = { extractionsFrom, tileCovered, morphHook, norm, toks, fold };
